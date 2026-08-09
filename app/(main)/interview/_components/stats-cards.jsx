"use client";
import { Brain, Target, Trophy, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

function AnimatedNumber({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = parseFloat(value) || 0;
    const duration = 1200;
    const steps = 40;
    const step = target / steps;
    let current = 0;
    let count = 0;
    const timer = setInterval(() => {
      count++;
      current = Math.min(current + step, target);
      setDisplay(parseFloat(current.toFixed(1)));
      if (count >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}{suffix}</span>;
}

const cards = [
  {
    title: "Average Score",
    icon: Trophy,
    gradient: "from-yellow-500/20 to-orange-500/20",
    iconColor: "text-yellow-400",
    borderColor: "border-yellow-500/20",
    glowColor: "hover:border-yellow-500/40",
    getValue: (a) => ({ value: a?.length ? (a.reduce((s, x) => s + x.quizScore, 0) / a.length).toFixed(1) : 0, suffix: "%" }),
    subtitle: "Across all assessments",
  },
  {
    title: "Questions Practiced",
    icon: Brain,
    gradient: "from-purple-500/20 to-blue-500/20",
    iconColor: "text-purple-400",
    borderColor: "border-purple-500/20",
    glowColor: "hover:border-purple-500/40",
    getValue: (a) => ({ value: a?.length ? a.reduce((s, x) => s + (x.questions?.length || 0), 0) : 0, suffix: "" }),
    subtitle: "Total questions answered",
  },
  {
    title: "Latest Score",
    icon: Target,
    gradient: "from-cyan-500/20 to-teal-500/20",
    iconColor: "text-cyan-400",
    borderColor: "border-cyan-500/20",
    glowColor: "hover:border-cyan-500/40",
    getValue: (a) => ({ value: a?.[0]?.quizScore?.toFixed(1) || 0, suffix: "%" }),
    subtitle: "Most recent quiz",
  },
  {
    title: "Quizzes Taken",
    icon: TrendingUp,
    gradient: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-400",
    borderColor: "border-green-500/20",
    glowColor: "hover:border-green-500/40",
    getValue: (a) => ({ value: a?.length || 0, suffix: "" }),
    subtitle: "Total assessments",
  },
];

export default function StatsCards({ assessments }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map(({ title, icon: Icon, gradient, iconColor, borderColor, glowColor, getValue, subtitle }, i) => {
        const { value, suffix } = getValue(assessments);
        return (
          <div
            key={title}
            className={`relative overflow-hidden rounded-2xl border ${borderColor} ${glowColor} bg-gradient-to-br ${gradient} backdrop-blur-sm p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center ${iconColor} flex-shrink-0`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white font-outfit mb-1">
              <AnimatedNumber value={value} suffix={suffix} />
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
