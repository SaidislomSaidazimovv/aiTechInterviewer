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
    const [elapsedTime, setElapsedTime] = useState(0);
    const [questionCount, setQuestionCount] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [theme] = useState<"dark" | "light">(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("theme") as "dark" | "light") || "dark";
        }
        return "dark";
    });
    const [cursorLine, setCursorLine] = useState(1);
    const [cursorCol, setCursorCol] = useState(1);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const codeEditorRef = useRef<HTMLDivElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const codeTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Timer
    useEffect(() => {
        timerRef.current = setInterval(() => setElapsedTime((t) => t + 1), 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
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

    // First AI greeting
    useEffect(() => {
        const greeting: Message = {
            id: "init",
            role: "ai",
            content: `Hello! I'm your AI interviewer for today's ${STACK_LABELS[stack] || stack} session at the ${LEVEL_LABELS[level] || level} level.\n\nLet's get started. First question:\n\n**Can you walk me through how ${stack === "react"
                ? "the Virtual DOM works in React and what makes it more efficient than direct DOM manipulation?"
                : stack === "nodejs"
                    ? "the Event Loop works in Node.js and why it's important for handling asynchronous operations?"
                    : stack === "system-design"
                        ? "you would design a URL shortener service like bit.ly at scale?"
                        : stack === "python"
                            ? "Python's GIL (Global Interpreter Lock) works and when it can be a bottleneck?"
                            : stack === "algorithms"
                                ? "you would approach solving a problem involving finding the shortest path in a weighted graph?"
                                : `the core concepts of ${STACK_LABELS[stack] || stack} that you find most important?`
                }**\n\nTake your time. You can also use the code editor on the right if you need to illustrate your answer with code.`,
            timestamp: new Date(),
        };
        setMessages([greeting]);
        setQuestionCount(1);
    }, [stack, level]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: inputValue.trim(),
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

    const renderInlineMarkdown = (text: string, key: number) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return (
            <p key={key} className="mt-1 first:mt-0">
                {parts.map((part, i) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                        return (
                            <strong key={i} className="font-semibold" style={{ color: "var(--text-primary)" }}>
                                {part.slice(2, -2)}
                            </strong>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </p>
        );
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
                    {msg.content.split("\n").map((line, i) =>
                        line ? renderInlineMarkdown(line, i) : <br key={i} />
                    )}
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

                    {/* Input area */}
                    <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <textarea
                                    ref={inputRef}
                                    id="answer-input"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type your answer... (Enter to send, Shift+Enter for newline)"
                                    rows={3}
                                    disabled={isLoading}
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
                                onClick={sendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className="btn-send p-3 flex-shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[11px] mt-2 pl-1" style={{ color: "var(--text-secondary)" }}>
                            Press Enter to send · Shift+Enter for a new line
                        </p>
                    </div>
                </div>

                {/* RIGHT: Code Editor */}
                <div ref={codeEditorRef} className="flex flex-col w-1/2">
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
