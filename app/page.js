"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, TrendingUp, Target, Zap, Star } from "lucide-react";
import HeroSection from "@/components/hero";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { features } from "@/data/features";
import { testimonial } from "@/data/testimonial";
import { faqs } from "@/data/faqs";
import { howItWorks } from "@/data/howItWorks";
import { useAuth } from "@clerk/nextjs";

// Animated counter hook
function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const end = parseFloat(target.toString().replace(/[^0-9.]/g, ""));
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((eased * end).toFixed(0)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function StatCard({ value, label, suffix = "", prefix = "", delay = 0 }) {
  const [inView, setInView] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const num = parseFloat(value.toString().replace(/[^0-9.]/g, ""));
  const count = useCountUp(num, 2000, inView);
  return (
    <div ref={ref} className="flex flex-col items-center justify-center space-y-1" style={{ animationDelay: `${delay}ms` }}>
      <h3 className="text-4xl md:text-5xl font-extrabold font-outfit gradient-title">
        {prefix}{inView ? count : 0}{suffix}
      </h3>
      <p className="text-slate-400 text-sm md:text-base">{label}</p>
    </div>
  );
}

export default function LandingPage() {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) localStorage.removeItem("swr-industry-insights-cache");
  }, [isSignedIn]);

  return (
    <>
      <div className="grid-background" />
      <HeroSection />

      {/* Features Section */}
      <section id="features" className="w-full py-20 md:py-32 relative overflow-hidden">
        <div className="orb w-[500px] h-[500px] animate-orb-1 opacity-30" style={{ background: "radial-gradient(circle, hsl(217,91%,60%,0.15), transparent 70%)", top: "-20%", right: "-10%" }} />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 mb-4">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-purple-300 font-medium">Powerful AI Features</span>
            </div>
            <h2 className="section-title text-white mb-4">Everything You Need to Succeed</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">From industry insights to interview prep — QuantAI has every tool to accelerate your career.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative rounded-2xl border border-white/8 bg-white/3 hover:border-blue-500/30 hover:bg-white/6 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-sm"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2 font-outfit">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full py-16 border-y border-white/5 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            <StatCard value={50} suffix="+" label="Industries Covered" delay={0} />
            <StatCard value={1000} suffix="+" label="Interview Questions" delay={100} />
            <StatCard value={95} suffix="%" label="Success Rate" delay={200} />
            <StatCard value={24} suffix="/7" label="AI Support" delay={300} />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-2 mb-4">
              <Target className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-cyan-300 font-medium">Simple Process</span>
            </div>
            <h2 className="section-title text-white mb-4">How QuantAI Works</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">Four simple steps to transform your career trajectory.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {howItWorks.map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center space-y-4 group">
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-blue-500/40 to-transparent" />
                )}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-blue-500/40">
                  {item.icon}
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                </div>
                <h3 className="font-bold text-lg text-white font-outfit">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full py-20 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-2 mb-4">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-yellow-300 font-medium">User Stories</span>
            </div>
            <h2 className="section-title text-white mb-4">What Our Users Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonial.map((t, i) => (
              <div key={i} className="group rounded-2xl border border-white/8 bg-white/3 hover:border-yellow-500/20 hover:bg-white/5 p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white">
                    {t.author?.[0] || "U"}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.author}</p>
                    <p className="text-xs text-slate-400">{t.role} · {t.company}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full py-20 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="section-title text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Find answers to common questions about our platform.</p>
          </div>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="rounded-xl border border-white/8 bg-white/3 px-5 py-1 data-[state=open]:border-blue-500/30">
                  <AccordionTrigger className="text-left text-white font-medium hover:no-underline hover:text-blue-300 transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-400 pb-4">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="orb w-[600px] h-[600px]" style={{ background: "radial-gradient(circle, hsl(217,91%,60%,0.1), transparent 70%)", top: "-20%", left: "50%", transform: "translateX(-50%)" }} />
        </div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center rounded-3xl border border-white/10 bg-white/3 p-12 backdrop-blur-sm">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
              <Zap className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-300 font-medium">Start Today — It&apos;s Free</span>
            </div>
            <h2 className="section-title text-white mb-4">Ready to Accelerate Your Career?</h2>
            <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of professionals advancing their careers with AI-powered guidance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
                <Button size="lg" className="h-14 px-8 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl border-0 shadow-glow transition-all duration-300 hover:scale-105 group">
                  {isSignedIn ? "Go to Dashboard" : "Get Started Free"}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8">
              {["No credit card required", "Free forever plan", "Cancel anytime"].map((text) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
