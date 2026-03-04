"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Trophy,
    Clock,
    MessageSquare,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    RotateCcw,
    Home,
    Star,
    AlertCircle,
} from "lucide-react";

interface Message {
    id: string;
    role: "ai" | "user";
    content: string;
    timestamp: Date;
    score?: number;
}

interface SessionData {
    messages: Message[];
    scores: number[];
    stack: string;
    level: string;
    elapsedTime: number;
    questionCount: number;
}

export default function SummaryPage() {
    const router = useRouter();
    const [session, setSession] = useState<SessionData | null>(null);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as "dark" | "light";
        if (savedTheme) setTheme(savedTheme);

        const raw = localStorage.getItem("mockai_session");
        if (!raw) {
            router.push("/");
            return;
        }
        try {
            setSession(JSON.parse(raw));
        } catch {
            router.push("/");
        }
    }, [router]);

    if (!session) return null;

    const avgScore =
        session.scores.length > 0
            ? Math.round(session.scores.reduce((a, b) => a + b, 0) / session.scores.length)
            : 0;

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60)
            .toString()
            .padStart(2, "0");
        const sec = (s % 60).toString().padStart(2, "0");
        return `${m}:${sec}`;
    };

    const getScoreColor = (score: number) =>
        score >= 80 ? "#4ade80" : score >= 60 ? "#facc15" : "#f87171";

    const getScoreBg = (score: number) =>
        score >= 80
            ? "rgba(34,197,94,0.15)"
            : score >= 60
            ? "rgba(234,179,8,0.15)"
            : "rgba(239,68,68,0.15)";

    const getOverallFeedback = (avg: number) => {
        if (avg >= 80)
            return {
                icon: <Trophy className="w-8 h-8" style={{ color: "#facc15" }} />,
                title: "Outstanding Performance!",
                desc: "You demonstrated strong technical knowledge. You're well-prepared for real interviews.",
            };
        if (avg >= 60)
            return {
                icon: <TrendingUp className="w-8 h-8" style={{ color: "#6366f1" }} />,
                title: "Good Progress!",
                desc: "Solid foundation with room to grow. Focus on depth and concrete examples.",
            };
        return {
            icon: <AlertCircle className="w-8 h-8" style={{ color: "#f87171" }} />,
            title: "Keep Practicing!",
            desc: "You need more preparation. Review the topics covered and practice explaining concepts clearly.",
        };
    };

    const feedback = getOverallFeedback(avgScore);

    const renderText = (text: string) => {
        return text.split("\n").map((line, li) => {
            if (!line) return <br key={li} />;
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
                <p key={li} style={{ marginTop: li > 0 ? "4px" : 0 }}>
                    {parts.map((part, pi) =>
                        part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={pi}>{part.slice(2, -2)}</strong>
                        ) : (
                            <span key={pi}>{part}</span>
                        )
                    )}
                </p>
            );
        });
    };

    // Build Q&A pairs from messages
    const pairs: { question: Message; answer: Message; score?: number; aiEvaluation?: string }[] = [];
    const msgs = session.messages;
    for (let i = 0; i < msgs.length - 1; i++) {
        if (msgs[i].role === "ai" && msgs[i].id !== "init" && msgs[i + 1]?.role === "user") {
            pairs.push({
                question: msgs[i],
                answer: msgs[i + 1],
                score: msgs[i + 2]?.score,
                aiEvaluation: msgs[i + 2]?.evaluation,
            });
        }
    }

    return (
        <div
            className={theme}
            style={{
                minHeight: "100vh",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontFamily: "Inter, sans-serif",
            }}
        >
            {/* Background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div
                    style={{
                        position: "absolute",
                        top: "-10%",
                        left: "-5%",
                        width: "500px",
                        height: "500px",
                        borderRadius: "50%",
                        background: "#6366f1",
                        opacity: 0.08,
                        filter: "blur(100px)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: "-10%",
                        right: "-5%",
                        width: "400px",
                        height: "400px",
                        borderRadius: "50%",
                        background: "#8b5cf6",
                        opacity: 0.06,
                        filter: "blur(80px)",
                    }}
                />
            </div>

            <div
                style={{
                    maxWidth: "800px",
                    margin: "0 auto",
                    padding: "40px 24px",
                    position: "relative",
                }}
            >
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "40px" }}>
                    <div style={{ marginBottom: "16px" }}>{feedback.icon}</div>
                    <h1
                        style={{
                            fontSize: "28px",
                            fontWeight: 700,
                            marginBottom: "8px",
                            color: "var(--text-primary)",
                        }}
                    >
                        {feedback.title}
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>{feedback.desc}</p>
                </div>

                {/* Stats Row */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "16px",
                        marginBottom: "32px",
                    }}
                >
                    {[
                        {
                            label: "Final Score",
                            value: `${avgScore}/100`,
                            icon: <Star className="w-4 h-4" />,
                            color: getScoreColor(avgScore),
                        },
                        {
                            label: "Duration",
                            value: formatTime(session.elapsedTime),
                            icon: <Clock className="w-4 h-4" />,
                            color: "var(--accent)",
                        },
                        {
                            label: "Questions",
                            value: `${session.scores.length}`,
                            icon: <MessageSquare className="w-4 h-4" />,
                            color: "var(--accent)",
                        },
                        {
                            label: "Best Score",
                            value: session.scores.length > 0 ? `${Math.max(...session.scores)}/100` : "—",
                            icon: <TrendingUp className="w-4 h-4" />,
                            color: "#4ade80",
                        },
                    ].map((stat, i) => (
                        <div
                            key={i}
                            style={{
                                background: "var(--bg-card)",
                                border: "1px solid var(--border)",
                                borderRadius: "12px",
                                padding: "16px",
                                textAlign: "center",
                            }}
                        >
                            <div
                                style={{
                                    color: stat.color,
                                    marginBottom: "8px",
                                    display: "flex",
                                    justifyContent: "center",
                                }}
                            >
                                {stat.icon}
                            </div>
                            <div
                                style={{
                                    fontSize: "20px",
                                    fontWeight: 700,
                                    color: stat.color,
                                    marginBottom: "4px",
                                }}
                            >
                                {stat.value}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Score Progression */}
                {session.scores.length > 0 && (
                    <div
                        style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            borderRadius: "12px",
                            padding: "20px",
                            marginBottom: "32px",
                        }}
                    >
                        <h3
                            style={{
                                fontSize: "14px",
                                fontWeight: 600,
                                marginBottom: "16px",
                                color: "var(--text-primary)",
                            }}
                        >
                            Score Progression
                        </h3>
                        <div style={{ display: "flex", alignItems: "end", gap: "8px", height: "60px" }}>
                            {session.scores.map((score, i) => (
                                <div
                                    key={i}
                                    style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: "4px",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "10px",
                                            color: getScoreColor(score),
                                            fontWeight: 600,
                                        }}
                                    >
                                        {score}
                                    </span>
                                    <div
                                        style={{
                                            width: "100%",
                                            height: `${(score / 100) * 48}px`,
                                            background: getScoreBg(score),
                                            border: `1px solid ${getScoreColor(score)}40`,
                                            borderRadius: "4px",
                                            transition: "height 0.5s ease",
                                        }}
                                    />
                                    <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                                        Q{i + 1}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Q&A Transcript */}
                {pairs.length > 0 && (
                    <div style={{ marginBottom: "32px" }}>
                        <h3
                            style={{
                                fontSize: "16px",
                                fontWeight: 600,
                                marginBottom: "16px",
                                color: "var(--text-primary)",
                            }}
                        >
                            Interview Transcript
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {pairs.map((pair, i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: "var(--bg-card)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "12px",
                                        overflow: "hidden",
                                    }}
                                >
                                    {/* Accordion header */}
                                    <button
                                        onClick={() =>
                                            setExpandedIndex(expandedIndex === i ? null : i)
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "14px 16px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            background: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "var(--text-primary)",
                                            textAlign: "left",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                                minWidth: 0,
                                                flex: 1,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    fontWeight: 600,
                                                    color: "var(--text-secondary)",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                Q{i + 1}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: "13px",
                                                    fontWeight: 500,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {pair.question.content.slice(0, 80)}
                                                {pair.question.content.length > 80 ? "..." : ""}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                flexShrink: 0,
                                            }}
                                        >
                                            {pair.score !== undefined && (
                                                <span
                                                    style={{
                                                        fontSize: "11px",
                                                        fontWeight: 600,
                                                        padding: "2px 8px",
                                                        borderRadius: "9999px",
                                                        background: getScoreBg(pair.score),
                                                        color: getScoreColor(pair.score),
                                                    }}
                                                >
                                                    {pair.score}/100
                                                </span>
                                            )}
                                            {expandedIndex === i ? (
                                                <ChevronUp
                                                    className="w-4 h-4"
                                                    style={{ color: "var(--text-secondary)" }}
                                                />
                                            ) : (
                                                <ChevronDown
                                                    className="w-4 h-4"
                                                    style={{ color: "var(--text-secondary)" }}
                                                />
                                            )}
                                        </div>
                                    </button>

                                    {/* Accordion content */}
                                    {expandedIndex === i && (
                                        <div
                                            style={{
                                                padding: "0 16px 16px",
                                                borderTop: "1px solid var(--border)",
                                            }}
                                        >
                                            <div style={{ paddingTop: "12px", marginBottom: "10px" }}>
                                                <div
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "var(--text-secondary)",
                                                        marginBottom: "6px",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    QUESTION
                                                </div>
                                                <div style={{ fontSize: "13px", lineHeight: 1.6 }}>
                                                    {renderText(pair.question.content)}
                                                </div>
                                            </div>
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "var(--text-secondary)",
                                                        marginBottom: "6px",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    YOUR ANSWER
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "13px",
                                                        lineHeight: 1.6,
                                                        color: "var(--text-secondary)",
                                                    }}
                                                >
                                                    {renderText(pair.answer.content)}
                                                </div>
                                            </div>
                                            {pair.aiEvaluation && (
                                                <div style={{ marginTop: "12px" }}>
                                                    <div style={{
                                                        fontSize: "11px",
                                                        color: "var(--text-secondary)",
                                                        marginBottom: "6px",
                                                        fontWeight: 600,
                                                        letterSpacing: "0.05em",
                                                    }}>
                                                        AI FEEDBACK
                                                    </div>
                                                    <div style={{
                                                        fontSize: "13px",
                                                        lineHeight: 1.7,
                                                        color: "#a5b4fc",
                                                        background: "rgba(99,102,241,0.08)",
                                                        border: "1px solid rgba(99,102,241,0.2)",
                                                        borderRadius: "8px",
                                                        padding: "10px 14px",
                                                        whiteSpace: "pre-wrap",
                                                    }}>
                                                        {pair.aiEvaluation}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <button
                        onClick={() => router.push("/")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 24px",
                            borderRadius: "10px",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                            fontSize: "14px",
                            fontWeight: 500,
                            cursor: "pointer",
                        }}
                    >
                        <Home className="w-4 h-4" />
                        Back to Home
                    </button>
                    <button
                        onClick={() => {
                            localStorage.removeItem("mockai_session");
                            router.push("/");
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 24px",
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            border: "none",
                            color: "white",
                            fontSize: "14px",
                            fontWeight: 500,
                            cursor: "pointer",
                        }}
                    >
                        <RotateCcw className="w-4 h-4" />
                        New Interview
                    </button>
                </div>
            </div>
        </div>
    );
}
