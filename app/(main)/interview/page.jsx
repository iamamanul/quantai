"use client";
import useSWR, { SWRConfig } from "swr";
import StatsCards from "./_components/stats-cards";
import PerformanceChart from "./_components/performace-chart";
import QuizList from "./_components/quiz-list";
import { useRef, useEffect, useState } from "react";
import { Brain, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

const fetcher = async (url) => {
  const res = await fetch(url);
  if (res.status === 401) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="skeleton h-64 rounded-2xl w-full" />
      <div className="skeleton h-96 rounded-2xl w-full" />
    </div>
  );
}

export default function InterviewPrepPage() {
  const [isClient, setIsClient] = useState(false);
  const providerRef = useRef();

  useEffect(() => {
    setIsClient(true);
    if (!providerRef.current) {
      providerRef.current = function localStorageProvider() {
        const map = new Map(JSON.parse(localStorage.getItem("swr-assessments-cache") || "[]"));
        window.addEventListener("beforeunload", () => {
          localStorage.setItem("swr-assessments-cache", JSON.stringify(Array.from(map.entries())));
        });
        return map;
      };
    }
  }, []);

  if (!isClient) return null;

  return (
    <SWRConfig value={{ fetcher, provider: providerRef.current }}>
      <InterviewContent />
    </SWRConfig>
  );
}

function InterviewContent() {
  const { data: assessments, error, isLoading } = useSWR("/api/assessments");

  if (isLoading) return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <LoadingSkeleton />
    </div>
  );

  if (error) return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
        <p className="text-red-400 font-medium">Error loading assessments. Please refresh.</p>
      </div>
    </div>
  );

  const list = Array.isArray(assessments) ? assessments : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/20 flex items-center justify-center">
              <Brain className="h-5 w-5 text-blue-400" />
            </div>
            <h1 className="gradient-title text-4xl md:text-5xl">Interview Prep</h1>
          </div>
          <p className="text-muted-foreground ml-14">AI-powered practice for your industry</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs text-blue-300 font-medium">AI Powered</span>
        </div>
      </div>

      <StatsCards assessments={list} />
      <PerformanceChart assessments={list} />
      <QuizList assessments={list} />
    </div>
  );
}
