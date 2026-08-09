"use client";
import Link from "next/link";
import { ArrowLeft, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Quiz from "../_components/quiz";
import { useState, useEffect } from "react";

function ProviderToggle({ provider, setProvider }) {
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      {/* Gemini Button */}
      <button
        className={`flex flex-col items-center px-5 py-3 rounded-xl border transition-all duration-300 text-xs font-semibold gap-1.5 ${
          provider === "gemini"
            ? "bg-gradient-to-br from-blue-600/30 to-purple-600/30 border-blue-500/50 scale-105 shadow-glow-sm text-blue-300"
            : "bg-white/3 border-white/10 hover:bg-white/6 hover:border-white/20 text-muted-foreground hover:text-white"
        }`}
        style={{ minWidth: 80 }}
        onClick={() => setProvider("gemini")}
      >
        <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="url(#gm1)" />
          <ellipse cx="24" cy="24" rx="14" ry="8" fill="white" fillOpacity="0.9" />
          <ellipse cx="24" cy="24" rx="8" ry="14" fill="white" fillOpacity="0.7" />
          <circle cx="24" cy="24" r="6" fill="#7B61FF" fillOpacity="0.8" />
          <defs>
            <linearGradient id="gm1" x1="0" y1="0" x2="48" y2="48">
              <stop stopColor="#4F8EF7" /><stop offset="1" stopColor="#9B59FF" />
            </linearGradient>
          </defs>
        </svg>
        Gemini
      </button>

      <div className="w-px h-8 bg-white/10" />

      {/* Groq Button */}
      <button
        className={`flex flex-col items-center px-5 py-3 rounded-xl border transition-all duration-300 text-xs font-semibold gap-1.5 ${
          provider === "groq"
            ? "bg-gradient-to-br from-fuchsia-600/30 to-orange-600/30 border-fuchsia-500/50 scale-105 shadow-glow-purple text-fuchsia-300"
            : "bg-white/3 border-white/10 hover:bg-white/6 hover:border-white/20 text-muted-foreground hover:text-white"
        }`}
        style={{ minWidth: 80 }}
        onClick={() => setProvider("groq")}
      >
        <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#gq1)" />
          <path d="M16 32L32 16M16 16L32 32" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <defs>
            <linearGradient id="gq1" x1="4" y1="4" x2="44" y2="44">
              <stop stopColor="#F97316" /><stop offset="1" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
        Groq
      </button>
    </div>
  );
}

export default function MockInterviewPage() {
  const [provider, setProvider] = useState("gemini");

  useEffect(() => {
    const saved = localStorage.getItem("quiz-provider");
    if (saved) setProvider(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("quiz-provider", provider);
  }, [provider]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <div className="space-y-4">
        <Link href="/interview">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-white -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Interview Prep
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/20 flex items-center justify-center">
            <Brain className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="gradient-title text-4xl md:text-5xl">Mock Interview</h1>
            <p className="text-muted-foreground text-sm">Industry-specific AI questions for your role</p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs text-blue-300 font-medium">AI Generated</span>
          </div>
        </div>
      </div>

      {/* Provider Selection */}
      <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
            Choose AI Provider
          </p>
        </div>
        <ProviderToggle provider={provider} setProvider={setProvider} />
      </div>

      {/* Quiz Card */}
      <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden p-6">
        <Quiz provider={provider} />
      </div>
    </div>
  );
}