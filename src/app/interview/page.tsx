"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Terminal,
    Send,
    Bot,
    User,
    Code2,
    ChevronLeft,
    Copy,
    Check,
    Maximize2,
    Minimize2,
    RotateCcw,
    Zap,
} from "lucide-react";

interface Message {
    id: string;
    role: "ai" | "user";
    content: string;
    timestamp: Date;
    score?: number;
    evaluation?: string;
}

interface SessionData {
    messages: Message[];
    scores: number[];
    stack: string;
    level: string;
    elapsedTime: number;
    questionCount: number;
}

const STACK_LABELS: Record<string, string> = {
    react: "React / Next.js",
    nodejs: "Node.js",
    python: "Python",
    "system-design": "System Design",
    typescript: "TypeScript",
    devops: "DevOps",
    databases: "Databases",
    algorithms: "DS & Algorithms",
};

const LEVEL_LABELS: Record<string, string> = {
    junior: "Junior",
    middle: "Mid-Level",
    senior: "Senior",
};

const LEVEL_COLORS: Record<string, string> = {
    junior: "text-green-400 bg-green-400/10",
    middle: "text-yellow-400 bg-yellow-400/10",
    senior: "text-red-400 bg-red-400/10",
};

function InterviewRoom() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const stack = searchParams.get("stack") || "react";
    const level = searchParams.get("level") || "middle";

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [codeValue, setCodeValue] = useState(
        `// Write your code solution here\n// The interviewer may ask you to\n// demonstrate your answer in code.\n\nfunction solution() {\n  // your code here\n}\n`
    );
    const [copied, setCopied] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [questionCount, setQuestionCount] = useState(0);
    const [scores, setScores] = useState<number[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [theme] = useState<"dark" | "light">(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("theme") as "dark" | "light") || "dark";
        }
        return "dark";
    });
    const [cursorLine, setCursorLine] = useState(1);
    const [cursorCol, setCursorCol] = useState(1);
    const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
    const [questionType, setQuestionType] = useState<"chat" | "code" | null>(null);
    const [isReady, setIsReady] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const scoreProcessedRef = useRef<Set<string>>(new Set());
    const codeEditorRef = useRef<HTMLDivElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const codeTextareaRef = useRef<HTMLTextAreaElement>(null);
    const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
    const autoSubmitRef = useRef<(() => void) | null>(null);
    const autoSubmitCodeRef = useRef<(() => void) | null>(null);
    const autoSubmitFiredRef = useRef(false);

    // Timer
    useEffect(() => {
        timerRef.current = setInterval(() => setElapsedTime((t) => t + 1), 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (questionTimerRef.current) clearInterval(questionTimerRef.current);
            abortRef.current?.abort();
        };
    }, []);

    // Fullscreen toggle
    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await codeEditorRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Sync state when user exits fullscreen via Escape key
    useEffect(() => {
        const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handleChange);
        return () => document.removeEventListener("fullscreenchange", handleChange);
    }, []);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, "0");
        const sec = (s % 60).toString().padStart(2, "0");
        return `${m}:${sec}`;
    };

    const startQuestionTimer = (type: "chat" | "code") => {
        if (questionTimerRef.current) {
            clearInterval(questionTimerRef.current);
        }
        autoSubmitFiredRef.current = false;

        const duration = type === "chat" ? 120 : 300;
        setQuestionType(type);
        setQuestionTimeLeft(duration);

        questionTimerRef.current = setInterval(() => {
            setQuestionTimeLeft((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(questionTimerRef.current!);

                    if (autoSubmitFiredRef.current) return null;
                    autoSubmitFiredRef.current = true;

                    if (type === "chat") {
                        setInputValue("Time's up — I could not complete my answer.");
                        setTimeout(() => {
                            autoSubmitRef.current?.();
                        }, 200);
                    } else {
                        setTimeout(() => {
                            autoSubmitCodeRef.current?.();
                        }, 200);
                    }

                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Keep auto-submit refs current on every render (avoids stale closure in timer)
    useEffect(() => {
        autoSubmitRef.current = () => sendMessage(false);
        autoSubmitCodeRef.current = () => sendMessage(true);
    });

    // Welcome greeting
    useEffect(() => {
        const greeting: Message = {
            id: "init",
            role: "ai",
            content: `Welcome! 👋 I'm your AI interviewer for today's **${STACK_LABELS[stack] || stack}** session at the **${LEVEL_LABELS[level] || level}** level.\n\nAre you ready to begin?`,
            timestamp: new Date(),
        };
        setMessages([greeting]);
    }, [stack, level]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Timer start + auto-end — runs after React commits updated questionCount/scores
    useEffect(() => {
        if (!isReady) return;
        if (questionCount === 0) return;
        if (isLoading) return;

        if (scores.length >= 6) {
            clearInterval(questionTimerRef.current!);
            setQuestionTimeLeft(null);
            setIsLoading(true);
            setTimeout(() => endInterview(), 3000);
            return;
        }

        const type = questionCount % 2 !== 0 ? "chat" : "code";
        startQuestionTimer(type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questionCount, scores.length, isReady]);

    const sendMessage = async (includeCode = false) => {
        if (!inputValue.trim() && !includeCode) return;
        if (isLoading) return;

        // Clear question timer immediately when user submits
        if (questionTimerRef.current) {
            clearInterval(questionTimerRef.current);
        }
        setQuestionTimeLeft(null);
        autoSubmitFiredRef.current = false;

        let content = inputValue.trim();

        if (includeCode && codeValue.trim()) {
            const hasUserText = content.length > 0;
            content = hasUserText
                ? `${content}\n\n\`\`\`javascript\n${codeValue.trim()}\n\`\`\``
                : `Here is my code solution:\n\n\`\`\`javascript\n${codeValue.trim()}\n\`\`\``;
        }

        if (!content) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);

        const aiMsgId = (Date.now() + 1).toString();
        let firstChunkReceived = false;

        // Cancel any previous in-flight request
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                signal: abortRef.current.signal,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg.content,
                    stack,
                    level,
                    history: messages.map((m) => ({ role: m.role, content: m.content })),
                    questionNumber: questionCount + 1,
                }),
            });

            if (!res.ok || !res.body) {
                throw new Error(`Request failed with status ${res.status}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });

                    if (!firstChunkReceived) {
                        // First chunk — add the AI message bubble and start filling it
                        setMessages((prev) => [
                            ...prev,
                            { id: aiMsgId, role: "ai", content: chunk, timestamp: new Date() },
                        ]);
                        firstChunkReceived = true;
                    } else {
                        // Subsequent chunks — append to the existing AI message
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
                            )
                        );
                    }
                }
            } catch (err: any) {
                if (err.name === "AbortError") return;  // silent exit on unmount
                throw err;                              // re-throw real errors to outer catch
            } finally {
                setIsLoading(false);
            }

            if (!firstChunkReceived) {
                // Edge case: stream completed with no content
                setMessages((prev) => [
                    ...prev,
                    {
                        id: aiMsgId,
                        role: "ai",
                        content: "I couldn't generate a response. Please try again.",
                        timestamp: new Date(),
                    },
                ]);
            }

            setQuestionCount((q) => q + 1);

            // Parse score + evaluation from completed AI message
            setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.role !== "ai") return prev;

                // Parse score
                const scoreMatch = lastMsg.content.match(/\[SCORE:(\d+)\]/);
                const score = scoreMatch
                    ? Math.min(100, Math.max(0, parseInt(scoreMatch[1])))
                    : undefined;

                if (score !== undefined) {
                    if (!scoreProcessedRef.current.has(lastMsg.id)) {
                        scoreProcessedRef.current.add(lastMsg.id);
                        setScores((s) => [...s, score]);
                    }
                }

                // Parse evaluation between tags
                const evalMatch = lastMsg.content.match(/EVALUATION_START([\s\S]*?)EVALUATION_END/);
                const evaluation = evalMatch ? evalMatch[1].trim() : undefined;

                // Strip SCORE + EVALUATION from chat display
                const cleanContent = lastMsg.content
                    .replace(/\n?\[SCORE:\d+\]/, "")
                    .replace(/\n?EVALUATION_START[\s\S]*?EVALUATION_END/, "")
                    .trim();

                return prev.map((m) =>
                    m.id === lastMsg.id
                        ? { ...m, content: cleanContent, score, evaluation }
                        : m
                );
            });
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: "err-" + Date.now(),
                    role: "ai",
                    content: "Sorry, I had trouble connecting to the AI. Please check your API key and try again.",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            inputRef.current?.focus();
        }
    };

    const handleReady = async () => {
        setIsReady(true);
        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: "Yes, I'm ready!",
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);

        const aiMsgId = (Date.now() + 1).toString();
        let firstChunkReceived = false;

        try {
            abortRef.current?.abort();
            abortRef.current = new AbortController();

            const res = await fetch("/api/chat", {
                method: "POST",
                signal: abortRef.current.signal,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: "Yes, I'm ready to start!",
                    stack,
                    level,
                    history: [],
                    questionNumber: 1,
                    isFirstQuestion: true,
                }),
            });

            if (!res.ok || !res.body) throw new Error(`Request failed with status ${res.status}`);

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });

                if (!firstChunkReceived) {
                    setMessages((prev) => [
                        ...prev,
                        { id: aiMsgId, role: "ai", content: chunk, timestamp: new Date() },
                    ]);
                    firstChunkReceived = true;
                } else {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
                        )
                    );
                }
            }

            setQuestionCount(1);
        } catch (err: any) {
            if (err.name === "AbortError") return;
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleNotReady = () => {
        const notReadyMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: "No, not yet.",
            timestamp: new Date(),
        };
        const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            role: "ai",
            content: `No problem! Take your time.\nWhenever you're ready, click **"Yes, let's go!"** to begin. 🙂`,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, notReadyMsg, aiResponse]);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleCodeScroll = () => {
        if (lineNumbersRef.current && codeTextareaRef.current) {
            lineNumbersRef.current.scrollTop = codeTextareaRef.current.scrollTop;
        }
    };

    const handleCursorChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const textarea = e.currentTarget;
        const pos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, pos);
        const lines = textBefore.split("\n");
        setCursorLine(lines.length);
        setCursorCol(lines[lines.length - 1].length + 1);
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(codeValue);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmitCode = () => {
        if (!codeValue.trim() || isLoading) return;
        sendMessage(true);
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 2000);
    };

    const endInterview = () => {
        const sessionData: SessionData = {
            messages,
            scores,
            stack,
            level,
            elapsedTime,
            questionCount,
        };
        localStorage.setItem("mockai_session", JSON.stringify(sessionData));
        router.push("/summary");
    };

    const renderMessageContent = (content: string) => {
        const blocks = content.split(/(```[\s\S]*?```)/g);
        return blocks.map((block, i) => {
            if (block.startsWith("```") && block.endsWith("```")) {
                const lines = block.slice(3, -3).split("\n");
                const lang = lines[0].trim();
                const code = lang ? lines.slice(1).join("\n") : lines.join("\n");
                return (
                    <pre
                        key={i}
                        className="mt-2 mb-2 p-3 rounded-lg text-xs overflow-x-auto"
                        style={{
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid var(--border)",
                            fontFamily: "JetBrains Mono, monospace",
                            color: "#e2e8f0",
                            lineHeight: "1.6",
                        }}
                    >
                        <code>{code}</code>
                    </pre>
                );
            }
            return block.split("\n").map((line, j) => {
                if (!line) return <br key={`${i}-${j}`} />;
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                    <p key={`${i}-${j}`} className="mt-1 first:mt-0">
                        {parts.map((part, k) =>
                            part.startsWith("**") && part.endsWith("**") ? (
                                <strong key={k} className="font-semibold" style={{ color: "var(--text-primary)" }}>
                                    {part.slice(2, -2)}
                                </strong>
                            ) : (
                                <span key={k}>{part}</span>
                            )
                        )}
                    </p>
                );
            });
        });
    };

    const renderMessage = (msg: Message) => {
        const isAI = msg.role === "ai";
        return (
            <div
                key={msg.id}
                className={`flex gap-3 message-bubble ${isAI ? "justify-start" : "justify-end"}`}
            >
                {isAI && (
                    <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            boxShadow: "0 0 15px rgba(99,102,241,0.35)",
                        }}
                    >
                        <Bot className="w-4 h-4 text-white" />
                    </div>
                )}
                <div className={isAI ? "chat-bubble-ai" : "chat-bubble-user"}>
                    {renderMessageContent(msg.content)}
                    <p className="bubble-timestamp text-[10px] mt-2" style={{ color: "var(--text-secondary)" }}>
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>
                {!isAI && (
                    <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-strong)",
                        }}
                    >
                        <User className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                    </div>
                )}
            </div>
        );
    };

    return (
        <main
            className={`${theme} h-screen flex flex-col overflow-hidden relative`}
            style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
        >
            {/* ── Background layers ── */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="bg-orb bg-orb-1" />
                <div className="bg-orb bg-orb-2" />
                <div className="dot-grid" />
            </div>

            {/* ── Header ── */}
            <header
                className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
                style={{
                    background: "var(--header-bg)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    borderBottom: "1px solid var(--border)",
                }}
            >
                {/* Left: back + logo */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/")}
                        className="btn-secondary text-sm py-1.5 px-3"
                        id="back-btn"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Exit
                    </button>
                    <div className="flex items-center gap-2">
                        <div
                            className="p-1.5 rounded-lg"
                            style={{
                                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                boxShadow: "0 0 20px rgba(99,102,241,0.4)",
                            }}
                        >
                            <Terminal className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                            Mock<span style={{ color: "var(--accent)" }}>AI</span>
                        </span>
                    </div>
                </div>

                {/* Right: badges + theme toggle */}
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEVEL_COLORS[level] || "text-indigo-400 bg-indigo-400/10"}`}>
                        {LEVEL_LABELS[level] || level}
                    </span>
                    <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        {STACK_LABELS[stack] || stack}
                    </span>

                    {/* Timer badge with recording dot */}
                    <div
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                        style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-strong)",
                        }}
                    >
                        <span className="recording-dot" />
                        <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                            {formatTime(elapsedTime)}
                        </span>
                    </div>

                    {/* Question counter badge */}
                    <div
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                        style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                        }}
                    >
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {questionCount} Q
                        </span>
                    </div>

                    {/* Average score badge */}
                    {scores.length > 0 && (() => {
                        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                        return (
                            <div
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                                style={{
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border-strong)",
                                }}
                            >
                                <span style={{ color: "var(--text-secondary)" }}>Avg</span>
                                <span
                                    style={{
                                        color: avg >= 80 ? "#4ade80" : avg >= 60 ? "#facc15" : "#f87171",
                                        fontWeight: 600,
                                    }}
                                >
                                    {avg}/100
                                </span>
                            </div>
                        );
                    })()}

                </div>
            </header>

            {/* ── Split Panel ── */}
            <div className="relative z-10 flex flex-1 overflow-hidden">

                {/* LEFT: Chat */}
                <div
                    className="flex flex-col w-1/2"
                    style={{ borderRight: "1px solid var(--border)" }}
                >
                    {/* Chat panel header */}
                    <div
                        className="flex items-center gap-2 px-5 py-3"
                        style={{ borderBottom: "1px solid var(--border)" }}
                    >
                        <Bot className="w-4 h-4" style={{ color: "var(--accent)" }} />
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            Interview Chat
                        </span>
                        <div className="ml-auto flex items-center gap-1.5">
                            <div className="live-indicator">
                                <div className="live-ring" />
                                <div className="live-ring" />
                                <div className="live-dot" />
                            </div>
                            <span className="text-xs font-medium text-green-400">Live</span>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        {messages.map(renderMessage)}

                        {/* Typing indicator */}
                        {isLoading && messages[messages.length - 1]?.role !== "ai" && (
                            <div className="flex gap-3 justify-start message-bubble">
                                <div
                                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                                    style={{
                                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                        boxShadow: "0 0 15px rgba(99,102,241,0.35)",
                                    }}
                                >
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="chat-bubble-ai flex items-center gap-1 py-4 px-5">
                                    <span className="typing-dot" />
                                    <span className="typing-dot" />
                                    <span className="typing-dot" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Question timer */}
                    {questionTimeLeft !== null && !isLoading && (
                        <div style={{
                            padding: "8px 16px",
                            borderTop: "1px solid var(--border)",
                            background: "var(--bg-card)",
                        }}>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "6px",
                            }}>
                                <span style={{
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: questionType === "chat" ? "#6366f1" : "#f59e0b",
                                }}>
                                    {questionType === "chat"
                                        ? "💬 Chat Answer"
                                        : "💻 Code Answer"}
                                </span>
                                <span style={{
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    color: questionTimeLeft <= 30
                                        ? "#f87171"
                                        : questionTimeLeft <= 60
                                        ? "#facc15"
                                        : "var(--text-primary)",
                                }}>
                                    {Math.floor(questionTimeLeft / 60)}:
                                    {(questionTimeLeft % 60).toString().padStart(2, "0")}
                                </span>
                            </div>
                            {questionTimeLeft <= 10 && (
                                <p style={{
                                    fontSize: "11px",
                                    color: "#f87171",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    marginBottom: "4px",
                                    animation: "pulse 1s infinite",
                                }}>
                                    ⚠️ Time is almost up!
                                </p>
                            )}
                            <div style={{
                                height: "3px",
                                background: "var(--border)",
                                borderRadius: "9999px",
                                overflow: "hidden",
                            }}>
                                <div style={{
                                    height: "100%",
                                    borderRadius: "9999px",
                                    transition: "width 1s linear",
                                    background: questionTimeLeft <= 30
                                        ? "#f87171"
                                        : questionTimeLeft <= 60
                                        ? "#facc15"
                                        : "#6366f1",
                                    width: `${(questionTimeLeft / (questionType === "chat" ? 120 : 300)) * 100}%`,
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Ready buttons (pre-interview) */}
                    {!isReady && (
                        <div style={{
                            display: "flex",
                            gap: "12px",
                            padding: "16px",
                            borderTop: "1px solid var(--border)",
                            justifyContent: "center",
                        }}>
                            <button
                                onClick={() => handleNotReady()}
                                disabled={isLoading}
                                style={{
                                    padding: "10px 32px",
                                    borderRadius: "10px",
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text-secondary)",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    cursor: isLoading ? "not-allowed" : "pointer",
                                    opacity: isLoading ? 0.5 : 1,
                                }}
                            >
                                ❌ No, not yet
                            </button>
                            <button
                                onClick={() => handleReady()}
                                disabled={isLoading}
                                style={{
                                    padding: "10px 32px",
                                    borderRadius: "10px",
                                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                    border: "none",
                                    color: "white",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: isLoading ? "not-allowed" : "pointer",
                                    opacity: isLoading ? 0.5 : 1,
                                }}
                            >
                                ✅ Yes, let's go!
                            </button>
                        </div>
                    )}

                    {/* Input area (active interview) */}
                    {isReady && (
                        <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
                            {questionType === "code" && (
                                <p style={{
                                    fontSize: "12px",
                                    color: "var(--text-secondary)",
                                    textAlign: "center",
                                    padding: "8px",
                                }}>
                                    💻 Write your answer in the code editor
                                </p>
                            )}
                            <div
                                className="flex gap-3 items-end"
                                style={{
                                    transition: "opacity 0.3s ease",
                                    opacity: questionType === "code" ? 0.4 : 1,
                                    pointerEvents: questionType === "code" ? "none" : "auto",
                                }}
                            >
                                <div className="flex-1">
                                    <textarea
                                        ref={inputRef}
                                        id="answer-input"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type your answer... (Enter to send, Shift+Enter for newline)"
                                        rows={3}
                                        disabled={isLoading || questionType === "code"}
                                        className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 disabled:opacity-50"
                                        style={{
                                            background: "var(--bg-card)",
                                            border: "1px solid var(--border)",
                                            color: "var(--text-primary)",
                                            caretColor: "var(--accent)",
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = "var(--accent)";
                                            e.target.style.boxShadow = "0 0 0 3px var(--accent-glow)";
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = "var(--border)";
                                            e.target.style.boxShadow = "none";
                                        }}
                                    />
                                </div>
                                <button
                                    id="send-btn"
                                    onClick={() => sendMessage()}
                                    disabled={!inputValue.trim() || isLoading || questionType === "code"}
                                    className="btn-send p-3 flex-shrink-0"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-[11px] mt-2 pl-1" style={{ color: "var(--text-secondary)" }}>
                                Press Enter to send · Shift+Enter for a new line
                            </p>
                        </div>
                    )}
                </div>

                {/* RIGHT: Code Editor */}
                <div
                    ref={codeEditorRef}
                    className="flex flex-col w-1/2"
                    style={{
                        position: "relative",
                        transition: "opacity 0.3s ease, filter 0.3s ease",
                        opacity: questionType === "chat" ? 0.4 : 1,
                        filter: questionType === "chat" ? "blur(2px)" : "none",
                        pointerEvents: questionType === "chat" ? "none" : "auto",
                    }}
                >
                    {questionType === "chat" && (
                        <div style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                            gap: "8px",
                            pointerEvents: "none",
                        }}>
                            <span style={{ fontSize: "24px" }}>💬</span>
                            <p style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                textAlign: "center",
                            }}>
                                Answer in chat
                            </p>
                        </div>
                    )}
                    {/* Editor panel header */}
                    <div
                        className="flex items-center gap-2 px-5 py-3"
                        style={{
                            background: "var(--bg-card)",
                            borderBottom: "1px solid var(--border)",
                        }}
                    >
                        <Code2 className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            Code Editor
                        </span>
                        {/* Language pill */}
                        <span
                            className="text-xs px-2.5 py-0.5 rounded-full font-mono"
                            style={{
                                background: "rgba(99,102,241,0.15)",
                                border: "1px solid rgba(99,102,241,0.3)",
                                color: "#818cf8",
                            }}
                        >
                            JavaScript
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={handleSubmitCode}
                                disabled={isLoading || !codeValue.trim()}
                                className="btn-secondary text-xs py-1 px-2.5 gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Submit code to AI"
                            >
                                {submitted ? (
                                    <><Check className="w-3.5 h-3.5 text-green-400" /><span>Sent!</span></>
                                ) : (
                                    <><Send className="w-3.5 h-3.5" /><span>Submit Code</span></>
                                )}
                            </button>
                            <button
                                onClick={handleCopyCode}
                                className="btn-secondary text-xs py-1 px-2.5 gap-1"
                                title="Copy code"
                            >
                                {copied ? (
                                    <><Check className="w-3.5 h-3.5 text-green-400" /><span>Copied!</span></>
                                ) : (
                                    <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
                                )}
                            </button>
                            <button
                                onClick={() => setCodeValue(`// Write your code solution here\n// The interviewer may ask you to\n// demonstrate your answer in code.\n\nfunction solution() {\n  // your code here\n}\n`)}
                                className="btn-secondary text-xs py-1 px-2.5 gap-1"
                                title="Reset"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={toggleFullscreen}
                                className="btn-secondary text-xs py-1 px-2.5 gap-1"
                                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            >
                                {isFullscreen
                                    ? <Minimize2 className="w-3.5 h-3.5" />
                                    : <Maximize2 className="w-3.5 h-3.5" />
                                }
                            </button>
                        </div>
                    </div>

                    {/* Line numbers + code textarea */}
                    <div
                        className="flex flex-1 overflow-hidden"
                        style={{ background: "var(--editor-bg)" }}
                    >
                        {/* Line numbers */}
                        <div
                            ref={lineNumbersRef}
                            className="select-none py-4 px-3 text-right font-mono"
                            style={{
                                minWidth: "48px",
                                overflowY: "hidden",
                                pointerEvents: "none",
                                background: "var(--editor-nums-bg)",
                                borderRight: "1px solid var(--border)",
                                color: "var(--text-secondary)",
                                fontSize: "12px",
                                lineHeight: "24px",
                            }}
                        >
                            {codeValue.split("\n").map((_, i) => (
                                <div key={i} style={{ height: "24px" }}>{i + 1}</div>
                            ))}
                        </div>

                        {/* Code textarea */}
                        <textarea
                            ref={codeTextareaRef}
                            id="code-editor"
                            value={codeValue}
                            onChange={(e) => setCodeValue(e.target.value)}
                            onScroll={handleCodeScroll}
                            onSelect={handleCursorChange}
                            onClick={handleCursorChange}
                            onKeyUp={handleCursorChange}
                            spellCheck={false}
                            className="flex-1 resize-none p-4 font-mono outline-none"
                            style={{
                                background: "transparent",
                                color: "var(--text-primary)",
                                fontSize: "13px",
                                lineHeight: "24px",
                                caretColor: "var(--accent)",
                                tabSize: 2,
                            }}
                            placeholder="// Write code here..."
                        />
                    </div>

                    {/* Editor footer */}
                    <div
                        className="flex items-center justify-between px-5 py-2 font-mono"
                        style={{
                            background: "var(--editor-footer-bg)",
                            borderTop: "1px solid var(--border)",
                            fontSize: "11px",
                            color: "var(--text-secondary)",
                        }}
                    >
                        <span>Ln {cursorLine} · Col {cursorCol}</span>
                        <span>JavaScript · UTF-8</span>
                        <span>{codeValue.length} chars</span>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function InterviewPage() {
    return (
        <Suspense fallback={
            <div className="dark h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
                <div className="flex flex-col items-center gap-4">
                    <div
                        className="w-10 h-10 rounded-full border-2 animate-spin"
                        style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                    />
                    <p style={{ color: "var(--text-secondary)" }}>Loading interview room...</p>
                </div>
            </div>
        }>
            <InterviewRoom />
        </Suspense>
    );
}
