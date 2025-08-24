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
    if (!providerRef.current) {
      providerRef.current = function localStorageProvider() {
        const map = new Map(JSON.parse(localStorage.getItem("swr-timetable-cache") || "[]"));
        window.addEventListener("beforeunload", () => {
          const data = JSON.stringify(Array.from(map.entries()));
          localStorage.setItem("swr-timetable-cache", data);
        });
        return map;
      };
    }
  }, []);

  if (!isClient || !SWRConfig || !useSWR || !TimeTable) return null;

  const fetcher = (url) => fetch(url).then((res) => res.json());

  function TimetableContent() {
    const { data, error, isLoading } = useSWR("/api/timetable");

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error loading timetable.</div>;

    return (
      <div className="py-6">
        <TimeTable initialData={data} />
      </div>
    );
  }

  return (
    <SWRConfig value={{ fetcher, provider: providerRef.current }}>
      <TimetableContent />
    </SWRConfig>
  );
}
