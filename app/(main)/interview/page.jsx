"use client";
import useSWR, { SWRConfig } from "swr";
import StatsCards from "./_components/stats-cards";
import PerformanceChart from "./_components/performace-chart";
import QuizList from "./_components/quiz-list";
import { useRef, useEffect, useState } from "react";

export const dynamic = "force-dynamic";

// Robust fetcher: return [] on 401, throw on other non-OK, else JSON
const fetcher = async (url) => {
  const res = await fetch(url);
  if (res.status === 401) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
};

export default function InterviewPrepPage() {
  const [isClient, setIsClient] = useState(false);
  const providerRef = useRef();

  useEffect(() => {
    setIsClient(true);
    if (!providerRef.current) {
      providerRef.current = function localStorageProvider() {
        const map = new Map(JSON.parse(localStorage.getItem("swr-assessments-cache") || "[]"));
        window.addEventListener("beforeunload", () => {
          const data = JSON.stringify(Array.from(map.entries()));
          localStorage.setItem("swr-assessments-cache", data);
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

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading assessments.</div>;

  // Always provide an array to children
  const list = Array.isArray(assessments) ? assessments : [];

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-blue-700/50 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-6xl font-bold gradient-title">
          Interview Preparation
        </h1>
      </div>
      <div className="space-y-6">
        <StatsCards assessments={list} />
        <PerformanceChart assessments={list} />
        <QuizList assessments={list} />
      </div>
    </div>
  );
}
