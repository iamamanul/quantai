"use client";

import AIInsights from "@/components/AIInsights";
import { Bot, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AIAssistantPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-emerald-500/20 rounded-xl border border-blue-500/20 flex items-center justify-center">
              <Bot className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="gradient-title text-3xl sm:text-4xl md:text-5xl">
              QuantAI Assistant
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm ml-0 sm:ml-14">
            Context-aware career diagnostics, ATS optimization & real-time conversational AI guidance
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5 self-start sm:self-auto">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs text-blue-300 font-medium">Gemini & Groq Powered</span>
        </div>
      </div>

      {/* AI Assistant Main Component */}
      <AIInsights />
    </div>
  );
}
