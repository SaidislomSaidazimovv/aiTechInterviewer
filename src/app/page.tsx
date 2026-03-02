"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Brain,
    ChevronDown,
    Zap,
    Code2,
    Terminal,
    Layers,
    ArrowRight,
    Shield,
    Star,
    Sun,
    Moon,
} from "lucide-react";

const TECH_STACKS = [
    { value: "react", label: "⚛️  React / Next.js" },
    { value: "nodejs", label: "🟢  Node.js / Express" },
    { value: "python", label: "🐍  Python / Django / FastAPI" },
    { value: "system-design", label: "🏗️  System Design" },
    { value: "typescript", label: "💙  TypeScript" },
    { value: "devops", label: "🐳  DevOps / Docker / K8s" },
    { value: "databases", label: "🗄️  Databases / SQL" },
    { value: "algorithms", label: "🧮  Data Structures & Algorithms" },
];

const SENIORITY_LEVELS = [
    { value: "junior", label: "🌱  Junior (0–2 years)", description: "Fundamentals, basic patterns" },
    { value: "middle", label: "🔥  Mid-Level (2–5 years)", description: "Architecture, tradeoffs, debugging" },
    { value: "senior", label: "⚡  Senior (5+ years)", description: "System design, leadership, deep dives" },
];

const FEATURES = [
    {
        icon: <Brain className="w-5 h-5" />,
        title: "AI-Powered Questions",
        desc: "Dynamically adapts to your answers like a real interviewer.",
    },
    {
        icon: <Code2 className="w-5 h-5" />,
        title: "Live Code Editor",
        desc: "Write and explain code in real-time during the session.",
    },
    {
        icon: <Shield className="w-5 h-5" />,
        title: "Detailed Feedback",
        desc: "Get scored on accuracy, depth, and communication skills.",
    },
    {
        icon: <Zap className="w-5 h-5" />,
        title: "Real Interview Feel",
        desc: "Timed sessions and progressive difficulty like the real thing.",
    },
];

export default function HomePage() {
    const router = useRouter();
    const [techStack, setTechStack] = useState("");
    const [seniority, setSeniority] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light">(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("theme") as "dark" | "light") || "dark";
        }
        return "dark";
    });

    const toggleTheme = () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem("theme", next);
    };

    const canStart = techStack && seniority;

    const handleStartInterview = () => {
        if (!canStart) return;
        setIsLoading(true);
        router.push(
            `/interview?stack=${encodeURIComponent(techStack)}&level=${encodeURIComponent(seniority)}`
        );
    };

    const selectedSeniority = SENIORITY_LEVELS.find((s) => s.value === seniority);
    const selectedStack = TECH_STACKS.find((s) => s.value === techStack);

    return (
        <main
            className={`${theme} relative min-h-screen flex flex-col overflow-hidden`}
            style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
        >
            {/* Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="bg-orb bg-orb-1" />
                <div className="bg-orb bg-orb-2" />
                <div className="dot-grid" />
            </div>

            {/* Nav */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                        <Terminal className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                        Mock<span style={{ color: "var(--accent)" }}>AI</span>
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-full glass text-xs text-indigo-300 font-medium">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Resume-Ready Project</span>
                    </div>
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200"
                        style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                        }}
                        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {theme === "dark"
                            ? <Sun className="w-3.5 h-3.5" />
                            : <Moon className="w-3.5 h-3.5" />
                        }
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-20 pt-10">
                <div className="text-center mb-12 animate-fade-in max-w-3xl">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm text-indigo-300 font-medium border border-indigo-500/20">
                        <Zap className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                        AI-Powered Mock Interviews · No Signup Required
                    </div>

                    <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-5" style={{ color: "var(--text-primary)" }}>
                        Ace Your Next
                        <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            Tech Interview
                        </span>
                    </h1>
                    <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        Practice with an AI that asks real questions, evaluates your answers,
                        and challenges you with follow-ups — just like the real thing.
                    </p>
                </div>

                {/* Setup Card */}
                <div
                    className="relative w-full max-w-lg animate-slide-up glass-strong rounded-2xl p-7 glow-indigo"
                    style={{ animationDelay: "0.1s" }}
                >
                    <div className="absolute inset-0 rounded-2xl gradient-border pointer-events-none" />

                    <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Configure Your Session</h2>
                    <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Select your stack and level to begin</p>

                    {/* Tech Stack Selector */}
                    <div className="mb-5">
                        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                            <Layers className="w-4 h-4 inline mr-1.5 text-indigo-400" />
                            Tech Stack
                        </label>
                        <div className="relative">
                            <select
                                id="tech-stack-select"
                                value={techStack}
                                onChange={(e) => setTechStack(e.target.value)}
                                className="select-custom pr-10"
                            >
                                <option value="" disabled style={{ background: "var(--bg-secondary)" }}>
                                    Choose a technology...
                                </option>
                                {TECH_STACKS.map((s) => (
                                    <option key={s.value} value={s.value} style={{ background: "var(--bg-secondary)" }}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Seniority Selector */}
                    <div className="mb-7">
                        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                            <Star className="w-4 h-4 inline mr-1.5 text-indigo-400" />
                            Seniority Level
                        </label>
                        <div className="relative">
                            <select
                                id="seniority-select"
                                value={seniority}
                                onChange={(e) => setSeniority(e.target.value)}
                                className="select-custom pr-10"
                            >
                                <option value="" disabled style={{ background: "var(--bg-secondary)" }}>
                                    Select your experience level...
                                </option>
                                {SENIORITY_LEVELS.map((s) => (
                                    <option key={s.value} value={s.value} style={{ background: "var(--bg-secondary)" }}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        {selectedSeniority && (
                            <p className="mt-2 text-xs pl-1" style={{ color: "var(--text-secondary)" }}>
                                {selectedSeniority.description}
                            </p>
                        )}
                    </div>

                    {/* Session Preview */}
                    {canStart && (
                        <div className="mb-5 p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 animate-fade-in">
                            <p className="text-xs text-slate-400 mb-1">Your session:</p>
                            <p className="text-sm font-medium text-indigo-300">
                                {selectedStack?.label} · {selectedSeniority?.label}
                            </p>
                        </div>
                    )}

                    {/* CTA */}
                    <button
                        id="start-interview-btn"
                        onClick={handleStartInterview}
                        disabled={!canStart || isLoading}
                        className="btn-primary w-full py-3.5 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                    >
                        {isLoading ? (
                            <>
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                                <span className="ml-2">Preparing Interview...</span>
                            </>
                        ) : (
                            <>
                                <span className="relative z-10">Start Interview</span>
                                <ArrowRight className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-1" />
                            </>
                        )}
                    </button>
                </div>

                {/* Features Grid */}
                <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
                    {FEATURES.map((f, i) => (
                        <div
                            key={i}
                            className="glass rounded-xl p-4 text-center hover:border-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5"
                            style={{ animationDelay: `${0.2 + i * 0.05}s` }}
                        >
                            <div className="inline-flex p-2 rounded-lg bg-indigo-500/10 text-indigo-400 mb-2">
                                {f.icon}
                            </div>
                            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{f.title}</p>
                            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
