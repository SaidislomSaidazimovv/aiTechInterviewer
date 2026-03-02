import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "MockAI – IT Tech Interview Simulator",
    description:
        "Practice technical interviews with an AI-powered mock interviewer. Choose your tech stack, seniority level, and get grilled like a real interview.",
    keywords: ["mock interview", "technical interview", "AI interview", "coding interview practice"],
    openGraph: {
        title: "MockAI – IT Tech Interview Simulator",
        description: "Ace your next technical interview with AI-powered mock sessions.",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className="min-h-screen antialiased">
                <div className="noise-overlay" aria-hidden="true" />
                {children}
            </body>
        </html>
    );
}
