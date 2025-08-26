"use client";
import { useEffect, useRef, useState } from "react";

export const dynamic = "force-dynamic";

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
    // Namespace SWR cache by DB fingerprint to avoid ghost data from old DB
    (async () => {
      try {
        const res = await fetch('/api/env-check', { cache: 'no-store' });
        const info = await res.json();
        const fp = (info && info.dbFingerprint) ? String(info.dbFingerprint) : 'unknown';
        const cacheKey = `swr-timetable-cache:${fp}`;
        const lastKey = localStorage.getItem('swr-timetable-cache:last-key');
        if (lastKey && lastKey !== cacheKey) {
          try { localStorage.removeItem(lastKey); } catch {}
        }
        localStorage.setItem('swr-timetable-cache:last-key', cacheKey);
        if (!providerRef.current) {
          providerRef.current = function localStorageProvider() {
            const map = new Map(JSON.parse(localStorage.getItem(cacheKey) || "[]"));
            window.addEventListener("beforeunload", () => {
              const data = JSON.stringify(Array.from(map.entries()));
              localStorage.setItem(cacheKey, data);
            });
            return map;
          };
        }
      } catch {
        // Fallback to in-memory map if env-check fails
        if (!providerRef.current) providerRef.current = () => new Map();
      }
    })();
  }, []);

  if (!isClient || !SWRConfig || !useSWR || !TimeTable) return null;

  const fetcher = async (url) => {
    const res = await fetch(url);
    if (!res.ok) {
      // Try to surface useful error text for debugging (e.g., auth/db issues)
      let msg = '';
      try { msg = await res.text(); } catch {}
      throw new Error(msg || `Request failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  };

  function TimetableContent() {
    const { data, error, isLoading } = useSWR("/api/timetable", fetcher);

    if (isLoading) return <div>Loading...</div>;
    if (error) {
      // Fallback to client-side only view so the page remains usable
      if (typeof window !== 'undefined') console.error('Timetable fetch failed:', error);
      return (
        <div className="py-6">
          <div className="text-red-500 mb-3">Error loading timetable. Showing local view.</div>
          <TimeTable initialData={[]} />
        </div>
      );
    }

    return (
      <div className="py-6">
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
