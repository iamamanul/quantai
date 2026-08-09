"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function GlobalLoader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5">
      <div
        className="h-full animate-shimmer rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, #60a5fa 30%, #a78bfa 60%, #67e8f9 80%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s ease-in-out infinite",
          boxShadow: "0 0 10px #60a5fa, 0 0 20px #a78bfa40",
        }}
      />
    </div>
  );
}