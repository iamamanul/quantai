"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp, Shield, Zap } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

const WORDS = ["Career", "Resume", "Interview", "Future", "Growth"];

export default function HeroSection() {
  const { isSignedIn } = useAuth();
  const [wordIndex, setWordIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % WORDS.length);
        setVisible(true);
      }, 400);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="orb w-[600px] h-[600px] animate-orb-1"
          style={{
            background: "radial-gradient(circle, hsl(217,91%,60%,0.12), transparent 70%)",
            top: "-10%",
            left: "-10%",
          }}
        />
        <div
          className="orb w-[500px] h-[500px] animate-orb-2"
          style={{
            background: "radial-gradient(circle, hsl(262,83%,58%,0.10), transparent 70%)",
            top: "30%",
            right: "-5%",
          }}
        />
        <div
          className="orb w-[400px] h-[400px] animate-orb-3"
          style={{
            background: "radial-gradient(circle, hsl(172,66%,50%,0.08), transparent 70%)",
            bottom: "10%",
            left: "30%",
          }}
        />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 grid-background opacity-40" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8 animate-slide-up">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-blue-300 font-medium">AI-Powered Career Intelligence</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        </div>

        {/* Headline */}
        <h1 className="font-outfit font-extrabold tracking-tight mb-6 animate-slide-up-delay-1">
          <span className="block text-5xl sm:text-6xl lg:text-8xl text-white mb-3">
            Accelerate Your
          </span>
          <span className="block text-5xl sm:text-6xl lg:text-8xl">
            <span
              className="gradient-text-animated inline-block"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(-12px)",
                transition: "opacity 0.4s ease, transform 0.4s ease",
              }}
            >
              {WORDS[wordIndex]}
            </span>
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-10 animate-slide-up-delay-2 leading-relaxed">
          QuantAI provides personalized AI insights, resume analysis, interview prep,
          and career roadmaps tailored to{" "}
          <span className="text-blue-400 font-medium">your unique profile</span>.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up-delay-3">
          <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
            <Button
              size="lg"
              className="h-14 px-8 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl border-0 shadow-glow transition-all duration-300 hover:scale-105 group"
            >
              {isSignedIn ? "Go to Dashboard" : "Start for Free"}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="#features">
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-semibold border-white/20 text-white hover:bg-white/5 hover:border-white/40 rounded-2xl"
            >
              See Features
            </Button>
          </Link>
        </div>

        {/* Mini stats */}
        <div className="flex flex-wrap items-center justify-center gap-8 animate-slide-up-delay-4">
          {[
            { icon: TrendingUp, label: "50+ Industries", color: "text-blue-400" },
            { icon: Shield, label: "ATS Optimized", color: "text-purple-400" },
            { icon: Zap, label: "Real-time AI", color: "text-cyan-400" },
            { icon: Sparkles, label: "Personalized", color: "text-yellow-400" },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-slate-400">
              <Icon className={`h-4 w-4 ${color}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
