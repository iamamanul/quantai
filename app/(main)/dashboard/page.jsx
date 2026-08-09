"use client";

import useSWR from "swr";
import DashboardView from "./_component/dashboard-view";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

const fetcher = (url) => fetch(url).then((res) => res.json());

const SESSION_CACHE_PREFIX = "quantai_insights_session_v2_";

/**
 * Session Cache Helper
 * - Returns cached AI insights during client-side navigation within the same session
 * - Clears cache automatically when the user performs a hard page refresh (F5 / Reload)
 */
function getSessionInsight(provider) {
  if (typeof window === "undefined") return null;
  try {
    // Detect hard page refresh (F5 / browser reload button)
    const navEntries = performance.getEntriesByType?.("navigation") || [];
    const isReload = navEntries.length > 0 && navEntries[0].type === "reload";

    if (isReload && !window.__quantaiReloadHandled) {
      window.__quantaiReloadHandled = true;
      sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}gemini`);
      sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}groq`);
      return null;
    }

    const item = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${provider}`);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    return null;
  }
}

function setSessionInsight(provider, data) {
  if (typeof window === "undefined") return;
  try {
    if (data && !data.error) {
      sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${provider}`, JSON.stringify(data));
    }
  } catch (e) {}
}

function ProviderToggle({ provider, onSelectProvider, loadingProvider }) {
  return (
    <div className="flex items-center justify-center gap-3 py-4 w-full">
      {/* Gemini Button */}
      <button
        disabled={loadingProvider}
        className={`flex flex-col items-center px-4 py-2.5 rounded-xl border transition-all duration-300 text-xs font-semibold gap-1 disabled:opacity-50 ${
          provider === "gemini"
            ? "bg-gradient-to-br from-blue-600/30 to-purple-600/30 border-blue-500/50 scale-105 shadow-glow-sm text-blue-300 ring-2 ring-blue-500/30"
            : "bg-white/3 border-white/10 hover:bg-white/6 hover:border-white/20 text-muted-foreground hover:text-white"
        }`}
        style={{ minWidth: 80 }}
        onClick={() => onSelectProvider("gemini")}
      >
        <div className="flex items-center gap-1">
          {loadingProvider && provider === "gemini" ? (
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="24" fill="url(#g1)" />
              <ellipse cx="24" cy="24" rx="14" ry="8" fill="white" fillOpacity="0.9" />
              <ellipse cx="24" cy="24" rx="8" ry="14" fill="white" fillOpacity="0.7" />
              <circle cx="24" cy="24" r="6" fill="#7B61FF" fillOpacity="0.8" />
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4F8EF7" />
                  <stop offset="1" stopColor="#9B59FF" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </div>
        <span>Gemini</span>
      </button>

      <div className="w-px h-8 bg-white/10" />

      {/* Groq Button */}
      <button
        disabled={loadingProvider}
        className={`flex flex-col items-center px-4 py-2.5 rounded-xl border transition-all duration-300 text-xs font-semibold gap-1 disabled:opacity-50 ${
          provider === "groq"
            ? "bg-gradient-to-br from-fuchsia-600/30 to-orange-600/30 border-fuchsia-500/50 scale-105 shadow-glow-purple text-fuchsia-300 ring-2 ring-fuchsia-500/30"
            : "bg-white/3 border-white/10 hover:bg-white/6 hover:border-white/20 text-muted-foreground hover:text-white"
        }`}
        style={{ minWidth: 80 }}
        onClick={() => onSelectProvider("groq")}
      >
        <div className="flex items-center gap-1">
          {loadingProvider && provider === "groq" ? (
            <Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#g2)" />
              <path d="M16 32L32 16M16 16L32 32" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <defs>
                <linearGradient id="g2" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F97316" />
                  <stop offset="1" stopColor="#EC4899" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </div>
        <span>Groq</span>
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="skeleton h-24 rounded-2xl w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-2xl w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [provider, setProvider] = useState("gemini");
  const [loadingProvider, setLoadingProvider] = useState(false);
  const [insightData, setInsightData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("industry-insights-provider") || "gemini";
    setProvider(saved);
  }, []);

  // Check onboarding status
  const { data: onboarding, isLoading: onboardingLoading } = useSWR(
    isClient ? "/api/user-onboarding-status" : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  useEffect(() => {
    if (onboarding && !onboarding.isOnboarded) {
      router.replace("/onboarding");
    }
  }, [onboarding, router]);

  // Initial load logic: Check session cache first!
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!isClient || !onboarding?.isOnboarded) return;

    const cached = getSessionInsight(provider);
    if (cached) {
      setInsightData(cached);
    } else {
      loadInsightsForProvider(provider);
    }
  }, [isClient, onboarding?.isOnboarded]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadInsightsForProvider = async (targetProvider) => {
    setLoadingProvider(true);
    try {
      const res = await fetcher(`/api/industry-insights?provider=${targetProvider}`);
      if (res && !res.error) {
        setSessionInsight(targetProvider, res);
        setInsightData(res);
        toast.success(`Loaded fresh insights from ${targetProvider.toUpperCase()} ✨`);
      } else if (res?.error) {
        setInsightData(res);
      }
    } catch (err) {
      console.error("loadInsightsForProvider error:", err);
      toast.error("Failed to fetch insights");
    } finally {
      setLoadingProvider(false);
    }
  };

  // Triggered when user explicitly clicks Gemini or Groq button
  const handleSelectProvider = async (targetProvider) => {
    setProvider(targetProvider);
    localStorage.setItem("industry-insights-provider", targetProvider);
    // Explicit click on Gemini/Groq button -> Reload fresh data from AI API
    await loadInsightsForProvider(targetProvider);
  };

  if (!isClient || onboardingLoading || (!insightData && loadingProvider)) {
    return <DashboardSkeleton />;
  }

  if (insightData?.error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center w-full mb-2">
          <ProviderToggle
            provider={provider}
            onSelectProvider={handleSelectProvider}
            loadingProvider={loadingProvider}
          />
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-12 text-center">
          <span className="text-5xl mb-4">🚦</span>
          <h2 className="text-2xl font-bold text-red-400 mb-2">API Limit Reached</h2>
          <p className="text-slate-400">{insightData.error}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try switching to another provider above or try again later.
          </p>
        </div>
      </div>
    );
  }

  const { insights, user, careerRoadmap } = insightData || {};

  return (
    <div className="container mx-auto px-4 space-y-4">
      <div className="flex flex-col items-center w-full mb-2">
        <ProviderToggle
          provider={provider}
          onSelectProvider={handleSelectProvider}
          loadingProvider={loadingProvider}
        />
      </div>
      {insights && user ? (
        <DashboardView insights={insights} user={user} careerRoadmap={careerRoadmap} />
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  );
}
