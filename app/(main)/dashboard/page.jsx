"use client";
import useSWR, { SWRConfig, mutate } from "swr";
import DashboardView from "./_component/dashboard-view";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

const fetcher = (url) => fetch(url).then((res) => res.json());

function ProviderToggle({ provider, setProvider, cacheExists }) {
  return (
    <div className="flex items-center justify-center gap-3 py-4 w-full">
      {/* Gemini Button */}
      <button
        className={`flex flex-col items-center px-4 py-2.5 rounded-xl border transition-all duration-300 text-xs font-semibold gap-1 ${
          provider === "gemini"
            ? "bg-gradient-to-br from-blue-600/30 to-purple-600/30 border-blue-500/50 scale-105 shadow-glow-sm text-blue-300"
            : "bg-white/3 border-white/10 hover:bg-white/6 hover:border-white/20 text-muted-foreground hover:text-white"
        }`}
        style={{ minWidth: 70 }}
        onClick={() => {
          if (cacheExists && provider !== "gemini") {
            toast.info("Already have latest insights. Try again tomorrow.");
            return;
          }
          setProvider("gemini");
        }}
      >
        <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        Gemini
      </button>

      <div className="w-px h-8 bg-white/10" />

      {/* Groq Button */}
      <button
        className={`flex flex-col items-center px-4 py-2.5 rounded-xl border transition-all duration-300 text-xs font-semibold gap-1 ${
          provider === "groq"
            ? "bg-gradient-to-br from-fuchsia-600/30 to-orange-600/30 border-fuchsia-500/50 scale-105 shadow-glow-purple text-fuchsia-300"
            : "bg-white/3 border-white/10 hover:bg-white/6 hover:border-white/20 text-muted-foreground hover:text-white"
        }`}
        style={{ minWidth: 70 }}
        onClick={() => {
          if (cacheExists && provider !== "groq") {
            toast.info("Already have latest insights. Try again tomorrow.");
            return;
          }
          setProvider("groq");
        }}
      >
        <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#g2)" />
          <path d="M16 32L32 16M16 16L32 32" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <defs>
            <linearGradient id="g2" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F97316" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
        Groq
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="skeleton h-24 rounded-2xl w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
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

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("industry-insights-provider");
    if (saved) setProvider(saved);
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("industry-insights-provider", provider);
    }
  }, [provider, isClient]);

  if (!isClient) return null;

  const swrKey = `/api/industry-insights?provider=${provider}`;

  return (
    <SWRConfig value={{ fetcher }}>
      <div className="flex flex-col items-center w-full mb-2">
        <ProviderToggle provider={provider} setProvider={setProvider} cacheExists={false} />
      </div>
      <IndustryInsightsContent swrKey={swrKey} />
    </SWRConfig>
  );
}

function IndustryInsightsContent({ swrKey }) {
  const router = useRouter();
  const { data: onboarding, isLoading: onboardingLoading } = useSWR("/api/user-onboarding-status");
  const { data, error, isLoading } = useSWR(
    onboarding && onboarding.isOnboarded ? swrKey : null
  );
  const lastGoodData = useRef(null);

  useEffect(() => {
    if (data && !data.error) lastGoodData.current = data;
  }, [data]);

  useEffect(() => {
    if (onboarding && !onboarding.isOnboarded) router.replace("/onboarding");
  }, [onboarding, router]);

  if (onboardingLoading || (onboarding && onboarding.isOnboarded && isLoading))
    return <DashboardSkeleton />;

  if ((error || !data) && lastGoodData.current) {
    const { insights, user, careerRoadmap } = lastGoodData.current;
    return (
      <div className="container mx-auto px-4">
        <DashboardView insights={insights} user={user} careerRoadmap={careerRoadmap} />
      </div>
    );
  }

  if (error) return (
    <div className="container mx-auto px-4 py-12 text-center">
      <p className="text-red-400">Error loading insights. Please refresh.</p>
    </div>
  );
  if (!data) return null;

  if (data.error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-12 text-center">
          <span className="text-5xl mb-4">🚦</span>
          <h2 className="text-2xl font-bold text-red-400 mb-2">API Limit Reached</h2>
          <p className="text-slate-400">{data.error}</p>
          <p className="text-sm text-muted-foreground mt-2">Try again tomorrow or switch to Groq provider above.</p>
        </div>
      </div>
    );
  }

  const { insights, user, careerRoadmap } = data;
  return (
    <div className="container mx-auto px-4">
      <DashboardView insights={insights} user={user} careerRoadmap={careerRoadmap} />
    </div>
  );
}
