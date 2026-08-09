"use client";
import { useEffect, useRef, useState } from "react";
import { Calendar, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="skeleton w-11 h-11 rounded-xl" />
        <div className="skeleton h-10 w-40 rounded-xl" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {[...Array(7)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  );
}

export default function TimetablePage() {
  const [isClient, setIsClient] = useState(false);
  const [SWRConfig, setSWRConfig] = useState(null);
  const [useSWR, setUseSWR] = useState(null);
  const [TimeTable, setTimeTable] = useState(null);
  const providerRef = useRef();

  useEffect(() => {
    setIsClient(true);
    import("swr").then((mod) => {
      setSWRConfig(() => mod.SWRConfig);
      setUseSWR(() => mod.default);
    });
    import("./_components/timetable").then((mod) => {
      setTimeTable(() => mod.default);
    });
    // Namespace SWR cache by DB fingerprint
    (async () => {
      try {
        const res = await fetch("/api/env-check", { cache: "no-store" });
        const info = await res.json();
        const fp = (info && info.dbFingerprint) ? String(info.dbFingerprint) : "unknown";
        const cacheKey = `swr-timetable-cache:${fp}`;
        const lastKey = localStorage.getItem("swr-timetable-cache:last-key");
        if (lastKey && lastKey !== cacheKey) {
          try { localStorage.removeItem(lastKey); } catch {}
        }
        localStorage.setItem("swr-timetable-cache:last-key", cacheKey);
        if (!providerRef.current) {
          providerRef.current = function localStorageProvider() {
            const map = new Map(JSON.parse(localStorage.getItem(cacheKey) || "[]"));
            window.addEventListener("beforeunload", () => {
              localStorage.setItem(cacheKey, JSON.stringify(Array.from(map.entries())));
            });
            return map;
          };
        }
      } catch {
        if (!providerRef.current) providerRef.current = () => new Map();
      }
    })();
  }, []);

  if (!isClient || !SWRConfig || !useSWR || !TimeTable) return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <LoadingSkeleton />
    </div>
  );

  const fetcher = async (url) => {
    const res = await fetch(url);
    if (!res.ok) {
      let msg = "";
      try { msg = await res.text(); } catch {}
      throw new Error(msg || `Request failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  };

  function TimetableContent() {
    const { data, error, isLoading } = useSWR("/api/timetable", fetcher);

    if (isLoading) return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <LoadingSkeleton />
      </div>
    );

    if (error) {
      if (typeof window !== "undefined") console.error("Timetable fetch failed:", error);
      return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
          <TimetableHeader />
          <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-yellow-400 text-sm">Couldn&apos;t sync from server. Showing local view.</p>
          </div>
          <TimeTable initialData={[]} />
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <TimetableHeader />
        <TimeTable initialData={data} />
      </div>
    );
  }

  return (
    <SWRConfig value={{ fetcher, provider: providerRef.current, revalidateOnMount: true, revalidateIfStale: true, keepPreviousData: false }}>
      <TimetableContent />
    </SWRConfig>
  );
}

function TimetableHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/20 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="gradient-title text-4xl md:text-5xl">Study Timetable</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Organize your learning schedule</p>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
        <Sparkles className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs text-blue-300 font-medium">AI Planned</span>
      </div>
    </div>
  );
}
