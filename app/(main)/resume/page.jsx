"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="skeleton w-11 h-11 rounded-xl" />
        <div className="skeleton h-10 w-48 rounded-xl" />
      </div>
      <div className="skeleton h-12 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="skeleton h-96 rounded-2xl" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

export default function ResumePage() {
  const [isClient, setIsClient] = useState(false);
  const [SWRConfig, setSWRConfig] = useState(null);
  const [useSWR, setUseSWR] = useState(null);
  const [ResumeBuilder, setResumeBuilder] = useState(null);
  const providerRef = useRef();

  useEffect(() => {
    setIsClient(true);
    import("swr").then((mod) => {
      setSWRConfig(() => mod.SWRConfig);
      setUseSWR(() => mod.default);
    });
    import("./_components/resume-builder").then((mod) => {
      setResumeBuilder(() => mod.default);
    });
    if (!providerRef.current) {
      providerRef.current = function localStorageProvider() {
        const map = new Map(JSON.parse(localStorage.getItem("swr-resume-cache") || "[]"));
        window.addEventListener("beforeunload", () => {
          localStorage.setItem("swr-resume-cache", JSON.stringify(Array.from(map.entries())));
        });
        return map;
      };
    }
  }, []);

  if (!isClient || !SWRConfig || !useSWR || !ResumeBuilder) return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <LoadingSkeleton />
    </div>
  );

  const fetcher = (url) => fetch(url).then((res) => res.json());

  function ResumeContent() {
    const { data, error, isLoading } = useSWR("/api/resume");

    if (isLoading) return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <LoadingSkeleton />
      </div>
    );

    if (error) return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
          <p className="text-red-400 font-medium">Error loading resume. Please refresh.</p>
        </div>
      </div>
    );

    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/20 flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="gradient-title text-4xl md:text-5xl">Resume Builder</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Build an ATS-optimized resume with AI assistance</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5 hidden md:flex">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs text-blue-300 font-medium">AI Powered</span>
          </div>
        </div>
        <ResumeBuilder initialContent={data} />
      </div>
    );
  }

  return (
    <SWRConfig value={{ fetcher, provider: providerRef.current }}>
      <ResumeContent />
    </SWRConfig>
  );
}
