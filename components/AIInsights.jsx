"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  MessageSquare,
  RefreshCw,
  Send,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  TrendingUp,
  Bot,
  User,
  ArrowRight,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { getSmartAIInsights, sendAIChatMessage } from "@/actions/ai-assistant";

const QUICK_PROMPTS = [
  { label: "💡 Highest Risk Metric?", prompt: "What is my highest risk metric right now and how can I fix it?" },
  { label: "📊 Executive Performance Summary", prompt: "Summarize my current performance across quizzes, ATS resume, and timetable tasks." },
  { label: "🎯 30-Day Growth Strategy", prompt: "Give me a 30-day quantitative career growth strategy based on my metrics." },
  { label: "🔥 Recommended Skills to Learn", prompt: "What top 3 skills should I prioritize learning next for my industry?" },
  { label: "📄 Improve Resume ATS Score", prompt: "How can I optimize my resume to achieve an ATS score above 85%?" },
];

export default function AIInsights() {
  const [activeTab, setActiveTab] = useState("insights"); // "insights" | "chat"
  const [insights, setInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [providerUsed, setProviderUsed] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "ai",
      text: "👋 Hello! I am **QuantAI Executive Assistant**. I've analyzed your real-time database metrics (quiz scores, ATS resume, timetable tasks). \n\nHow can I help accelerate your career goals today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      providerUsed: "system",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // CRITICAL: Container-Isolated Scroll Ref (NO Window Jumps)
  const chatContainerRef = useRef(null);

  // Fetch insights on mount
  useEffect(() => {
    fetchInsights();
  }, []);

  // Container-Isolated Scroll Effect (NO scrollIntoView window jump!)
  useEffect(() => {
    if (activeTab === "chat" && chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping, activeTab]);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await getSmartAIInsights();
      if (res.success && Array.isArray(res.insights)) {
        setInsights(res.insights);
        setProviderUsed(res.providerUsed);
      } else {
        toast.error("Failed to load insights. Using smart fallback.");
      }
    } catch (err) {
      console.error("fetchInsights error:", err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleSendMessage = async (queryOverride) => {
    const textToSend = queryOverride || inputQuery;
    if (!textToSend.trim() || isTyping) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryOverride) setInputQuery("");
    setIsTyping(true);

    try {
      const res = await sendAIChatMessage(textToSend.trim(), messages);
      if (res.success && res.answer) {
        const aiMsg = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: res.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          providerUsed: res.providerUsed,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        toast.error("Error processing AI chat response.");
      }
    } catch (err) {
      console.error("handleSendMessage error:", err);
      toast.error("Message failed to send.");
    } finally {
      setIsTyping(false);
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case "warning":
      case "risk":
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case "tip":
      case "strategy":
        return <Lightbulb className="w-5 h-5 text-blue-400" />;
      case "highlight":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  const getInsightCardStyle = (type) => {
    switch (type) {
      case "warning":
      case "risk":
        return "border-red-500/30 bg-gradient-to-br from-red-500/10 via-slate-900 to-slate-950 hover:border-red-500/50";
      case "tip":
      case "strategy":
        return "border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-950 hover:border-blue-500/50";
      case "highlight":
        return "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 hover:border-emerald-500/50";
      default:
        return "border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-slate-900 to-slate-950 hover:border-purple-500/50";
    }
  };

  return (
    <div
      id="ai-assistant"
      className="w-full rounded-3xl border border-white/10 bg-slate-950/90 backdrop-blur-xl p-4 sm:p-6 shadow-2xl space-y-6 scroll-mt-24"
    >
      {/* Header with Title and Mobile Segmented Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-purple-600 to-emerald-500 p-0.5 shadow-glow">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold font-outfit text-white">
                QuantAI Executive Assistant
              </h2>
              {providerUsed && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  <Zap className="w-3 h-3 text-blue-400" />
                  {providerUsed}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Context-aware career diagnostics & real-time conversational AI
            </p>
          </div>
        </div>

        {/* Segmented Control Tab Switcher (Stretches Full Width on Mobile) */}
        <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("insights")}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === "insights"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-glow-sm scale-[1.02]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Smart Insights
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === "chat"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-glow-sm scale-[1.02]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            AI Chat
          </button>
        </div>
      </div>

      {/* Main Tab Area with Fixed Consistent Height */}
      <div className="min-h-[490px] flex flex-col justify-between space-y-4">
        {/* TAB 1: SMART INSIGHTS */}
        {activeTab === "insights" && (
          <div className="space-y-4 animate-fade-in flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  Real-Time Performance Diagnostics
                </span>
                <button
                  onClick={fetchInsights}
                  disabled={loadingInsights}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingInsights ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {loadingInsights ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : insights.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-white/10 bg-slate-900/50">
                  <p className="text-slate-400 text-sm">No insights available right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.map((card) => (
                    <div
                      key={card.id}
                      className={`rounded-2xl border p-5 transition-all duration-300 shadow-lg relative flex flex-col justify-between min-h-[190px] ${getInsightCardStyle(
                        card.type
                      )}`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                              {getInsightIcon(card.type)}
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/10">
                              {card.category || "Insight"}
                            </span>
                          </div>
                          {card.confidenceScore && (
                            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              {card.confidenceScore}% Confidence
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white font-outfit mb-1">
                            {card.title}
                          </h3>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                      </div>

                      {card.actionableItem && (
                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-400 truncate max-w-[220px]">
                            💡 {card.actionableItem}
                          </span>
                          <button
                            onClick={() => {
                              setActiveTab("chat");
                              handleSendMessage(`Tell me more about: ${card.title} (${card.actionableItem})`);
                            }}
                            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-all flex-shrink-0"
                          >
                            Ask AI <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 text-center pt-2 border-t border-white/5">
              Powered by Google Gemini (Priority 1) & Groq LLM Pipeline
            </p>
          </div>
        )}

        {/* TAB 2: AI CHAT */}
        {activeTab === "chat" && (
          <div className="space-y-4 animate-fade-in flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Quick-Prompt Chips Carousel */}
              <div className="flex gap-2 overflow-x-auto pb-2 touch-pan-x custom-scrollbar">
                {QUICK_PROMPTS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip.prompt)}
                    disabled={isTyping}
                    className="whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-900/80 hover:bg-blue-500/20 text-slate-300 hover:text-blue-300 border border-white/10 hover:border-blue-500/30 transition-all flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Container-Isolated Scroll Stream Box (NO Window Jump) */}
              <div
                ref={chatContainerRef}
                className="overflow-y-auto h-[380px] custom-scrollbar p-4 space-y-4 rounded-2xl bg-slate-950/70 border border-white/10"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Bot Avatar Badging */}
                    {msg.sender === "ai" && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-sm shadow-glow-sm flex-shrink-0 text-white mt-1">
                        🤖
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-none shadow-lg"
                          : "bg-slate-900/90 text-slate-200 border border-white/10 rounded-bl-none shadow-md"
                      }`}
                    >
                      {msg.sender === "user" ? (
                        <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-white/10 text-[10px] text-slate-400">
                        <span>{msg.timestamp}</span>
                        {msg.providerUsed && (
                          <span className="uppercase tracking-wider font-semibold text-emerald-400">
                            {msg.providerUsed}
                          </span>
                        )}
                      </div>
                    </div>

                    {msg.sender === "user" && (
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Loader with Bot Avatar */}
                {isTyping && (
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-sm shadow-glow-sm flex-shrink-0 text-white">
                      🤖
                    </div>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Input & Controls */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 pt-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask QuantAI assistant anything..."
                disabled={isTyping}
                className="flex-1 bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isTyping}
                className="h-11 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-glow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
