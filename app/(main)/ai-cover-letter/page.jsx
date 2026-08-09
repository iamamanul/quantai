"use client";
import useSWR, { SWRConfig } from "swr";
import Link from "next/link";
import { Plus, FileText, Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CoverLetterList from "./_components/cover-letter-list";
import { useRef, useEffect, useState } from "react";

export const dynamic = "force-dynamic";

const fetcher = async (url) => {
  const res = await fetch(url);
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) { throw new Error((data?.error) || `Request failed ${res.status}`); }
  return data;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="skeleton h-10 w-56 rounded-xl" />
          <div className="skeleton h-4 w-80 rounded" />
        </div>
        <div className="skeleton h-11 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
      </div>
    </div>
  );
}

export default function CoverLetterPage() {
  const [isClient, setIsClient] = useState(false);
  const providerRef = useRef();

  useEffect(() => {
    setIsClient(true);
    if (!providerRef.current) {
      providerRef.current = function localStorageProvider() {
        const map = new Map(JSON.parse(localStorage.getItem("swr-cover-letters-cache") || "[]"));
        window.addEventListener("beforeunload", () => {
          localStorage.setItem("swr-cover-letters-cache", JSON.stringify(Array.from(map.entries())));
        });
        return map;
      };
    }
  }, []);

  if (!isClient) return null;

  return (
    <SWRConfig value={{ fetcher, provider: providerRef.current }}>
      <CoverLetterContent />
    </SWRConfig>
  );
}

function CoverLetterContent() {
  const { data: coverLetters, error, isLoading } = useSWR("/api/cover-letters");

  if (isLoading) return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <LoadingSkeleton />
    </div>
  );

  if (error) return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border border-red-500/20 bg-red-500/5">
        <p className="text-red-400">Error loading cover letters. Please refresh.</p>
      </div>
    </div>
  );

  const list = Array.isArray(coverLetters) ? coverLetters : [];
  const completed = list.filter(l => l.status === "completed").length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/20 flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-400" />
            </div>
            <h1 className="gradient-title text-4xl md:text-5xl">My Cover Letters</h1>
          </div>
          <p className="text-muted-foreground ml-14">AI-powered letters tailored to your applications</p>
        </div>
        <Link href="/ai-cover-letter/new">
          <Button className="h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-xl gap-2 font-semibold">
            <Plus className="h-4 w-4" /> Create New
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: FileText, label: "Total Letters", value: list.length, gradient: "from-blue-500/15 to-blue-600/15", border: "border-blue-500/20", iconColor: "text-blue-400" },
          { icon: Sparkles, label: "AI Generated", value: completed, gradient: "from-purple-500/15 to-purple-600/15", border: "border-purple-500/20", iconColor: "text-purple-400" },
          { icon: FileText, label: "Ready to Use", value: completed, gradient: "from-cyan-500/15 to-cyan-600/15", border: "border-cyan-500/20", iconColor: "text-cyan-400" },
        ].map(({ icon: Icon, label, value, gradient, border, iconColor }) => (
          <div key={label} className={`rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-5 transition-all duration-200 hover:scale-[1.02]`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Recent Cover Letters</h2>
          {list.length > 0 && (
            <Badge variant="outline" className="border-white/10 text-slate-300 text-xs">
              {list.length} {list.length === 1 ? "letter" : "letters"}
            </Badge>
          )}
        </div>
        <CoverLetterList coverLetters={list} />
      </div>
    </div>
  );
}
