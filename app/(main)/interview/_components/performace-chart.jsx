"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const score = payload[0].value;
    const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#60a5fa";
    return (
      <div className="bg-slate-900 border border-white/10 rounded-xl p-3 shadow-2xl">
        <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.date}</p>
        <p className="text-lg font-bold" style={{ color }}>{score.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground">
          {score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Practice needed"}
        </p>
      </div>
    );
  }
  return null;
};

export default function PerformanceChart({ assessments }) {
  const [chartData, setChartData] = useState([]);
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    if (assessments && assessments.length > 0) {
      const formattedData = [...assessments]
        .reverse()
        .map((assessment) => ({
          date: format(new Date(assessment.createdAt), "MMM dd"),
          score: parseFloat(assessment.quizScore.toFixed(1)),
        }));
      setChartData(formattedData);

      if (formattedData.length >= 2) {
        const last = formattedData[formattedData.length - 1].score;
        const prev = formattedData[formattedData.length - 2].score;
        setTrend({ up: last >= prev, diff: Math.abs(last - prev).toFixed(1) });
      }
    }
  }, [assessments]);

  if (!assessments || assessments.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
        <h2 className="gradient-title text-2xl mb-4">Performance Trend</h2>
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <TrendingUp className="h-10 w-10 text-blue-400/30 mb-3" />
          <p className="text-muted-foreground text-sm">Complete quizzes to see your performance trend</p>
        </div>
      </div>
    );
  }

  const avg = chartData.reduce((s, d) => s + d.score, 0) / chartData.length;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="gradient-title text-2xl sm:text-3xl">Performance Trend</h2>
          <p className="text-sm text-muted-foreground mt-1">Your quiz scores over time</p>
        </div>
        {trend && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${
            trend.up
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {trend.up
              ? <TrendingUp className="h-3.5 w-3.5" />
              : <TrendingDown className="h-3.5 w-3.5" />}
            {trend.up ? "+" : "-"}{trend.diff}%
          </div>
        )}
      </div>

      <div className="h-56 sm:h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 5, left: -15 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
            <ReferenceLine y={avg} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" label={{ value: `Avg: ${avg.toFixed(0)}%`, position: "insideTopRight", fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#scoreGradient)"
              strokeWidth={2.5}
              dot={{ fill: "#60a5fa", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "#a78bfa", stroke: "rgba(167,139,250,0.3)", strokeWidth: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
