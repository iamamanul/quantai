"use client";

import React, { useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BriefcaseIcon,
  LineChart,
  TrendingUp,
  TrendingDown,
  Brain,
} from "lucide-react";
import { format, formatDistanceToNow, isValid } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CareerRoadmap from "./career-roadmap";
import UserProfile from "./user-profile";
import { useEffect, useState } from "react";

const DashboardView = ({ insights, user, careerRoadmap }) => {
  // Transform salary data for the chart (no conversion, values are in LPA)
  const safeSalaryRanges = Array.isArray(insights?.salaryRanges) ? insights.salaryRanges : [];
  const salaryData = safeSalaryRanges.map((range) => ({
    name: range.role,
    min: range.min, // already in LPA
    max: range.max,
    median: range.median,
  }));

  // Helpers to align titles/roles across sources for matching salary ranges
  const normalizeRole = (s = "") => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  const alias = (norm = "") =>
    norm
      .replace(/software developer/g, "software engineer")
      .replace(/site reliability engineer/g, "sre")
      .replace(/technical lead/g, "tech lead")
      .replace(/frontend/g, "front end")
      .replace(/backend/g, "back end");
  const normalizedRanges = safeSalaryRanges.map((r) => ({
    key: normalizeRole(r.role),
    role: r.role,
    min: r.min,
    median: r.median,
    max: r.max,
  }));
  const findRangeForTitle = (title = "") => {
    const key = alias(normalizeRole(title));
    const tokens = key.split(" ").filter((t) => t && !["software", "engineer", "developer"].includes(t));
    let found = normalizedRanges.find((r) => r.key === key || r.key.includes(key));
    if (found) return found;
    found = normalizedRanges.find((r) => tokens.every((t) => r.key.includes(t)));
    if (found) return found;
    found = normalizedRanges.find((r) => alias(r.key) === key || alias(r.key).includes(key));
    return found || null;
  };

  // Build nice Y-axis ticks that don't overshoot too much (e.g., don't go to 40 when max is 30)
  const getYAxisConfig = (data = []) => {
    if (!Array.isArray(data) || data.length === 0) return { ticks: [0, 5, 10, 15, 20], max: 20 };
    const maxVal = Math.max(...data.map((d) => Number(d.max) || Number(d.median) || 0));
    // Use finer step for smaller ranges to keep top compact
    const step = maxVal <= 40 ? 5 : maxVal <= 80 ? 10 : 20;
    // Snap top to the nearest step at/above maxVal
    let top = Math.max(step, Math.ceil(maxVal / step) * step);
    // If maxVal is exactly on a step, use it as top (so 30 -> 30, not 35/40)
    if (Math.abs((maxVal % step)) < 1e-6) top = maxVal;
    const ticks = [];
    for (let t = step; t <= top; t += step) ticks.push(t);
    if (!ticks.includes(0)) ticks.unshift(0);
    return { ticks, max: top };
  };

  const getTickFontSize = (count, width, mobile) => {
    if (!count) return mobile ? 10 : 12;
    if (mobile) return count > 8 ? 9 : count > 5 ? 10 : 11;
    if (count <= 5) return 13;
    if (count <= 8) return 12;
    if (count <= 12) return 11;
    return 10;
  };

  // Abbreviate long role names for axis labels on small/medium screens
  const abbreviateRole = (name = "") => {
    const map = {
      "Site Reliability Engineer (SRE)": "SRE",
      "Software Engineer": "SE",
      "Frontend Engineer": "FE",
      "Backend Engineer": "BE",
      "Full Stack Engineer": "FS",
      "Cloud Engineer": "Cloud",
      "Mobile Developer": "Mobile",
      "QA Engineer": "QA",
      "DevOps Engineer": "DevOps",
    };
    return map[name] || name.replace("Engineer", "Eng").replace("Developer", "Dev");
  };

  // Derive role-based salary data using user bio and skills
  const roleBasedData = (() => {
    const text = `${user?.bio || ""} ${Array.isArray(user?.skills) ? user.skills.join(" ") : ""}`.toLowerCase();
    const has = (k) => text.includes(k);
    const selected = new Set();
    const pick = (role) => selected.add(role);

    // Keyword to role mappings
    if (has("devops") || has("docker") || has("kubernetes")) pick("DevOps Engineer");
    if (has("cloud") || has("aws") || has("azure") || has("gcp")) pick("Cloud Engineer");
    if (has("sre") || has("reliability")) pick("Site Reliability Engineer (SRE)");
    if (has("backend") || has("node") || has("java") || has("api")) pick("Backend Engineer");
    if (has("frontend") || has("react") || has("next") || has("ui")) pick("Frontend Engineer");
    if (has("full stack") || (has("frontend") && has("backend"))) pick("Full Stack Engineer");
    if (has("data") || has("pipeline") || has("spark")) pick("Data Engineer");
    if (has("mobile") || has("android") || has("ios") || has("react native")) pick("Mobile Developer");
    if (has("qa") || has("testing") || has("automation")) pick("QA Engineer");
    if (has("software engineer") || has("developer")) pick("Software Engineer");

    // Defaults if nothing matched
    if (selected.size === 0) ["Software Engineer", "Backend Engineer", "Frontend Engineer"].forEach(pick);

    // Compute a base from first graph medians
    const medians = salaryData.map((d) => d.median).filter((n) => Number.isFinite(n));
    const baseMedian = medians.length ? Math.round(medians.reduce((a, b) => a + b, 0) / medians.length) : 10;

    const factors = {
      "Software Engineer": 1.0,
      "Backend Engineer": 1.05,
      "Frontend Engineer": 0.95,
      "Full Stack Engineer": 1.05,
      "DevOps Engineer": 1.1,
      "Cloud Engineer": 1.15,
      "Site Reliability Engineer (SRE)": 1.12,
      "Data Engineer": 1.2,
      "Mobile Developer": 0.9,
      "QA Engineer": 0.8,
    };

    const clamp = (n) => Math.max(2, Math.round(n));

    return Array.from(selected).slice(0, 8).map((role) => {
      const f = factors[role] ?? 1.0;
      const median = clamp(baseMedian * f);
      const min = clamp(median * 0.6);
      const max = clamp(median * 1.6);
      return { name: role, min, median, max };
    });
  })();

  const getDemandLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case "high":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getMarketOutlookInfo = (outlook) => {
    switch (outlook.toLowerCase()) {
      case "positive":
        return { icon: TrendingUp, color: "text-green-500" };
      case "neutral":
        return { icon: LineChart, color: "text-yellow-500" };
      case "negative":
        return { icon: TrendingDown, color: "text-red-500" };
      default:
        return { icon: LineChart, color: "text-gray-500" };
    }
  };

  const OutlookIcon = getMarketOutlookInfo(insights.marketOutlook).icon;
  const outlookColor = getMarketOutlookInfo(insights.marketOutlook).color;

  // Format dates using date-fns
  const lastUpdatedDate = (() => {
    if (insights.lastUpdated) {
      const d = new Date(insights.lastUpdated);
      return isValid(d) ? format(d, "dd/MM/yyyy") : "N/A";
    }
    return "N/A";
  })();
  const nextUpdateDistance = (() => {
    if (insights.nextUpdate) {
      const d = new Date(insights.nextUpdate);
      return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : "N/A";
    }
    return "N/A";
  })();

  const [isMobile, setIsMobile] = useState(false);
  const chartContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [animateChart, setAnimateChart] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);


  // Observe container width to compute dynamic bar size
  useEffect(() => {
    if (!chartContainerRef.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr && cr.width) setContainerWidth(cr.width);
      }
    });
    ro.observe(chartContainerRef.current);
    return () => ro.disconnect();
  }, []);

  const getBarSizing = (count, width, mobile) => {
    // Estimate margins similar to the BarChart props
    const marginLeft = 28;
    const marginRight = 28;
    const available = Math.max(0, (width || 0) - marginLeft - marginRight);
    if (!count || count <= 0 || available <= 0) {
      return { barSize: mobile ? 24 : 34, gapPercent: "8%" };
    }
    // Base gap per bar cluster, scale with count
    const gapPercent = count <= 4 ? "0%" : count <= 8 ? "5%" : "10%";
    // Rough pixel gap between categories
    const gapPx = count <= 4 ? 6 : count <= 8 ? 10 : 12;
    const totalGap = gapPx * (count + 1);
    const perBar = (available - totalGap) / count;
    // Allocate ~80% to bar thickness, clamp nicely
    const target = perBar * 0.8;
    const minSize = mobile ? 18 : 24;
    const maxSize = mobile ? 36 : 50;
    const barSize = Math.max(minSize, Math.min(Math.round(target), maxSize));
    return { barSize, gapPercent };
  };

  // Chart toggle and career progression data aligned to roadmap
  const [chartMode, setChartMode] = useState("career"); // 'career' | 'role'
  // Reset rotation animation flag after it plays (must be declared AFTER chartMode)
  useEffect(() => {
    if (chartMode === "role" && animateChart) {
      const t = setTimeout(() => setAnimateChart(false), 650);
      return () => clearTimeout(t);
    }
  }, [chartMode, animateChart]);
  const medians = salaryData.map((d) => d.median).filter((n) => Number.isFinite(n));
  const overallMedian = medians.length ? Math.round(medians.reduce((a, b) => a + b, 0) / medians.length) : 10;
  const progressionFactors = [0.7, 0.9, 1.2, 1.5, 1.8, 2.1]; // baseline growth factors by stage index
  const clamp = (n) => Math.max(2, Math.round(n));
  const careerStages = Array.isArray(careerRoadmap?.careerPath) ? careerRoadmap.careerPath : [];
  const careerProgressionDataRaw = careerStages.map((stage, idx) => {
    const match = findRangeForTitle(stage.title);
    if (match) return { name: stage.title, min: match.min, median: match.median, max: match.max };
    const f = progressionFactors[Math.min(idx, progressionFactors.length - 1)];
    const median = clamp(overallMedian * f);
    return { name: stage.title, min: clamp(median * 0.6), median, max: clamp(median * 1.6) };
  });
  // Mobile: selected bar index for details panel
  const [selectedIndex, setSelectedIndex] = useState(0);
  const enforceProgression = (arr = []) => {
    if (!arr.length) return [];
    const out = arr.map((d) => ({ ...d }));
    // Forward pass: ensure each stage >= previous and >= baseline factor
    for (let i = 0; i < out.length; i++) {
      const cur = out[i];
      const baseline = clamp(overallMedian * progressionFactors[Math.min(i, progressionFactors.length - 1)]);
      if (!Number.isFinite(cur.median)) cur.median = baseline;
      if (i === 0) {
        cur.median = Math.max(cur.median, baseline);
      } else {
        const prev = out[i - 1].median;
        const minIncrement = Math.max(1, Math.round(prev * 0.07)); // at least +1 LPA or +7%
        cur.median = Math.max(cur.median, baseline, prev + minIncrement);
      }
      // tighten spreads consistently around median
      const minRatio = 0.6;
      const maxRatio = 1.6;
      cur.min = clamp(Math.min(cur.median - 1, Math.round(cur.median * minRatio)));
      if (cur.min >= cur.median) cur.min = Math.max(2, cur.median - 1);
      cur.max = clamp(Math.max(cur.median + 1, Math.round(cur.median * maxRatio)));
      if (cur.max <= cur.median) cur.max = cur.median + 1;
    }
    return out;
  };
  let careerProgressionData = enforceProgression(careerProgressionDataRaw);
  // If roadmap is empty or we ended up with no valid items, fall back to top 5 roles by median
  if (!careerProgressionData.length) {
    careerProgressionData = salaryData
      .slice()
      .sort((a, b) => (b.median || 0) - (a.median || 0))
      .slice(0, 5)
      .map((d) => ({ ...d }));
  }

  // Filter out recommended skills that the user already has, with synonym/canonical mapping
  const normalize = (s = "") => s.toLowerCase().trim().replace(/[^a-z0-9+\/\s.-]/g, "");
  const toCanonicalTokens = (raw = "") => {
    const n = normalize(raw);
    const parts = n.split(/[\s/,+]+/).filter(Boolean);
    const mapToken = (t) => {
      if (["reactjs", "react"] .includes(t)) return "react";
      if (["next", "next.js", "nextjs"].includes(t)) return "nextjs";
      if (["node", "nodejs", "node.js"].includes(t)) return "node";
      if (["typescript", "ts"].includes(t)) return "typescript";
      if (["javascript", "js"].includes(t)) return "javascript";
      if (["kubernetes", "k8s"].includes(t)) return "kubernetes";
      if (["ci", "cd", "ci/cd", "cicd"].includes(t)) return "ci-cd";
      if (["github", "githubactions", "github-actions", "github action", "github actions", "gh actions"].includes(t)) return "github-actions";
      if (["aws", "amazon", "amazon web services"].includes(t)) return "aws";
      if (["gcp", "google", "google cloud"].includes(t)) return "gcp";
      if (["azure"].includes(t)) return "azure";
      if (["docker"].includes(t)) return "docker";
      if (["terraform"].includes(t)) return "terraform";
      if (["jenkins"].includes(t)) return "jenkins";
      if (["linux"].includes(t)) return "linux";
      if (["shell", "bash", "shell scripting"].includes(t)) return "shell";
      if (["mongodb", "mongo"].includes(t)) return "mongodb";
      if (["sql", "postgres", "mysql"].includes(t)) return "sql";
      if (["system", "system-design", "systemdesign"].includes(t)) return "system design";
      return t;
    };
    return parts.map(mapToken);
  };
  const userCanonical = new Set(
    (Array.isArray(user?.skills) ? user.skills : [])
      .flatMap(toCanonicalTokens)
  );
  // Map industry trends to skills
  const trendToSkills = (trend = "") => {
    const t = trend.toLowerCase();
    const skills = new Set();
    const add = (k) => skills.add(k);
    if (/(ai|ml|machine learning|genai|llm)/.test(t)) { add("Python"); add("TensorFlow"); add("PyTorch"); add("LLM Fundamentals"); }
    if (/(cloud|aws|azure|gcp)/.test(t)) { add("AWS"); add("GCP"); add("Azure"); add("Cloud Fundamentals"); }
    if (/(devops|platform|sre|reliability)/.test(t)) { add("Docker"); add("Kubernetes"); add("CI/CD"); add("Terraform"); add("Jenkins"); }
    if (/(data|etl|pipeline|big data|spark|warehouse)/.test(t)) { add("SQL"); add("Data Modeling"); add("Airflow"); add("Spark"); }
    if (/(frontend|ui|ux|react|vue|angular)/.test(t)) { add("TypeScript"); add("React"); add("Next.js"); }
    if (/(backend|api|microservice|java|node|go)/.test(t)) { add("Node.js"); add("Express"); add("REST"); add("System Design"); }
    if (/(security|infosec)/.test(t)) { add("Security Best Practices"); add("OWASP Top 10"); }
    return Array.from(skills);
  };

  // Infer skills from bio and existing skills text
  const bioToSkills = (text = "") => {
    const s = text.toLowerCase();
    const out = new Set();
    const add = (k) => out.add(k);
    if (/devops|docker|kubernetes|k8s/.test(s)) { add("Docker"); add("Kubernetes"); add("CI/CD"); add("Terraform"); }
    if (/cloud|aws|gcp|azure/.test(s)) { add("AWS"); add("GCP"); add("Azure"); }
    if (/sre|reliability/.test(s)) { add("Monitoring"); add("Incident Response"); }
    if (/react|next/.test(s)) { add("TypeScript"); add("React"); add("Next.js"); }
    if (/node|express|api|backend|microservice/.test(s)) { add("Node.js"); add("Express"); add("System Design"); }
    if (/mongo|mongodb/.test(s)) { add("MongoDB"); add("NoSQL Modeling"); }
    if (/sql|postgres|mysql/.test(s)) { add("SQL"); add("Query Optimization"); }
    if (/python/.test(s)) { add("Python"); }
    if (/jenkins|github actions|gitlab ci/.test(s)) { add("CI/CD"); add("Jenkins"); add("GitHub Actions"); }
    if (/linux|shell|bash/.test(s)) { add("Linux"); add("Shell Scripting"); }
    return Array.from(out);
  };

  const baseRec = Array.isArray(insights?.recommendedSkills) ? insights.recommendedSkills : [];
  const trendDerived = Array.isArray(insights?.keyTrends) ? insights.keyTrends.flatMap(trendToSkills) : [];
  const bioText = `${user?.bio || ""} ${(Array.isArray(user?.skills) ? user.skills.join(" ") : "")}`;
  const bioDerived = bioToSkills(bioText);
  const merged = [...baseRec, ...trendDerived, ...bioDerived];
  // Dedupe case-insensitive by normalized value, but keep the first casing
  const seen = new Set();
  const mergedDedupe = merged.filter((sk) => {
    const key = normalize(sk);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const recSkillsFiltered = mergedDedupe.filter((rec) => {
    const tokens = toCanonicalTokens(rec);
    // If any canonical token is present in user's canonical set, drop
    return !tokens.some((t) => userCanonical.has(t));
  });

  // Precompute current dataset and Y-axis config for the chart
  const currentData = (chartMode === "career" ? careerProgressionData : roleBasedData);
  const yCfg = getYAxisConfig(currentData);
  // Ensure selected index is valid when data/view changes (mobile only)
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!isMobile) return;
    if (!Array.isArray(currentData) || currentData.length === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex >= currentData.length) setSelectedIndex(0);
  }, [isMobile, chartMode, currentData?.length]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <div className="space-y-6">
      <UserProfile user={user} />
      <div className="flex justify-between items-center">
        <Badge variant="outline">Last updated: {lastUpdatedDate}</Badge>
      </div>

      {/* Market Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border border-slate-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Market Outlook
            </CardTitle>
            <OutlookIcon className={`h-4 w-4 ${outlookColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.marketOutlook}</div>
            <p className="text-xs text-muted-foreground">
              Next update {nextUpdateDistance}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border border-slate-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Industry Growth
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.growthRate.toFixed(1)}%
            </div>
            <Progress value={insights.growthRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border border-slate-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demand Level</CardTitle>
            <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.demandLevel}</div>
            <div
              className={`h-2 w-full rounded-full mt-2 ${getDemandLevelColor(
                insights.demandLevel
              )}`}
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border border-slate-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Skills</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {insights.topSkills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Ranges Chart (Single with Toggle, mobile vertical layout) */}
      <Card className="col-span-4 bg-slate-800 border border-slate-600">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>Salary Ranges by {chartMode === "career" ? "Career Progression" : "Role-Based"}</CardTitle>
              <CardDescription>
                Values in ₹ LPA
              </CardDescription>
              {isMobile && (
                <p className="text-xs text-slate-300 mt-1">Tap a bar to view its salary breakdown below.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setChartMode("career");
                  setAnimateChart(false);
                }}
                className={`px-3 py-1 rounded border transition ${chartMode === "career" ? "bg-primary text-slate-900 border-primary" : "bg-slate-700 text-slate-200 border-slate-600"}`}
              >
                Career progression
              </button>
              <button
                type="button"
                onClick={() => {
                  setChartMode("role");
                  setAnimateChart(true);
                }}
                className={`px-3 py-1 rounded border transition ${chartMode === "role" ? "bg-primary text-slate-900 border-primary" : "bg-slate-700 text-slate-200 border-slate-600"}`}
              >
                Role-based
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={chartContainerRef} className={isMobile ? "h-[360px]" : "h-[400px]"} style={{ touchAction: "pan-y" }}>
            {((chartMode === "career" ? careerProgressionData : roleBasedData) || []).length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-slate-300 text-sm">
                No data available to render the chart.
              </div>
            ) : (
            <div
              className={isMobile ? "w-full overflow-x-scroll px-2" : "w-full"}
              style={isMobile ? { scrollbarGutter: "stable both-edges" } : undefined}
            >
              {(() => {
                const count = (chartMode === "career" ? careerProgressionData : roleBasedData).length;
                const careerCount = careerProgressionData.length;
                const roleCount = roleBasedData.length;
                const maxCount = Math.max(careerCount, roleCount, count || 0);
                // Use maxCount to stabilize inner width so switching views doesn't shift layout
                const minInner = isMobile ? Math.max(520, maxCount * 100) : undefined;
                return (
                  <div
                    className={`${chartMode === "role" && animateChart ? "chart-rotate-in" : ""}`}
                    style={{ width: isMobile ? `${minInner}px` : "100%", height: isMobile ? 336 : 368, paddingTop: 0, transformOrigin: "center bottom", perspective: 1000 }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={currentData}
                        margin={{ top: 24, right: isMobile ? 18 : 28, bottom: isMobile ? 28 : 40, left: isMobile ? 12 : 28 }}
                        barCategoryGap={isMobile ? "14%" : getBarSizing(count, containerWidth || minInner || 0, isMobile).gapPercent}
                        barGap={isMobile ? 4 : 2}
                        barSize={getBarSizing(count, containerWidth || minInner || 0, isMobile).barSize}
                        maxBarSize={56}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} horizontal={true} />
                        <XAxis
                          dataKey="name"
                          hide={isMobile}
                          tick={isMobile ? false : { fill: "#cbd5e1", fontSize: getTickFontSize(count, containerWidth || minInner || 0, isMobile) }}
                          interval={0}
                          angle={0}
                          textAnchor="middle"
                          height={isMobile ? 0 : 40}
                          tickMargin={isMobile ? 0 : 8}
                          tickFormatter={isMobile ? undefined : (chartMode === "role" ? abbreviateRole : undefined)}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          width={isMobile ? 28 : 48}
                          tickFormatter={(v) => (isMobile ? `₹${v}` : `₹${v} LPA`)}
                          tick={{ fill: "#cbd5e1", fontSize: isMobile ? 10 : 12 }}
                          allowDecimals={false}
                          allowDataOverflow={false}
                          ticks={yCfg.ticks}
                          domain={[0, yCfg.max]}
                          padding={{ top: 8, bottom: 0 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        {!isMobile && (
                          <Tooltip
                            wrapperStyle={{ zIndex: 50 }}
                            allowEscapeViewBox={{ x: true, y: true }}
                            cursor={{ fill: "rgba(148,163,184,0.15)" }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-800 border border-slate-600 rounded-lg p-2 shadow-md">
                                    <p className="font-medium">{label}</p>
                                    {payload.map((item) => (
                                      <p key={item.name} className="text-sm">{item.name}: ₹{item.value} LPA</p>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        )}
                        <Bar dataKey="min" fill="#94a3b8" name="Min Salary (LPA)" isAnimationActive={!isMobile} onClick={(_, i) => isMobile && setSelectedIndex(i)} />
                        <Bar dataKey="median" fill="#64748b" name="Median Salary (LPA)" isAnimationActive={!isMobile} onClick={(_, i) => isMobile && setSelectedIndex(i)} />
                        <Bar dataKey="max" fill="#475569" name="Max Salary (LPA)" isAnimationActive={!isMobile} onClick={(_, i) => isMobile && setSelectedIndex(i)} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
            )}
          </div>
          {/* Mobile-only selected bar details panel INSIDE the card */}
          {isMobile && Array.isArray(currentData) && currentData.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-600">
              {(() => {
                const idx = Math.min(Math.max(0, selectedIndex), currentData.length - 1);
                const d = currentData[idx];
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Selected</span>
                      <Badge variant="outline" className="border-slate-600">{d.name}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-700/60 rounded p-2">
                        <div className="text-[10px] text-slate-300">Min</div>
                        <div className="font-semibold">₹{d.min} LPA</div>
                      </div>
                      <div className="bg-slate-700/60 rounded p-2">
                        <div className="text-[10px] text-slate-300">Median</div>
                        <div className="font-semibold">₹{d.median} LPA</div>
                      </div>
                      <div className="bg-slate-700/60 rounded p-2">
                        <div className="text-[10px] text-slate-300">Max</div>
                        <div className="font-semibold">₹{d.max} LPA</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      

      {/* Industry Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-800 border border-slate-600">
          <CardHeader>
            <CardTitle>Key Industry Trends</CardTitle>
            <CardDescription>
              Current trends shaping the industry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {insights.keyTrends.map((trend, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                  <span>{trend}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border border-slate-600">
          <CardHeader>
            <CardTitle>Recommended Skills</CardTitle>
            <CardDescription>Skills to consider developing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recSkillsFiltered.length > 0 ? (
                recSkillsFiltered.map((skill) => (
                  <Badge key={skill} variant="outline" className="border-slate-600 text-slate-100">
                    {skill}
                  </Badge>
                ))
              ) : (
                <span className="text-slate-300 text-sm">You&apos;re up to date with the recommended skills.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Career Roadmap Section */}
      <div className="mt-8">
        <h2 className="text-3xl font-bold mb-6 gradient-title">Your Career</h2>
        <CareerRoadmap 
          insights={insights} 
          userSkills={user.skills} 
          userExperience={user.experience}
          careerRoadmap={careerRoadmap}
        />
      </div>
    </div>
  );
};

export default DashboardView;
