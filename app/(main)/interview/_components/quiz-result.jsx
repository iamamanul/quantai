"use client";
import { Trophy, CheckCircle2, XCircle, RefreshCw, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

function ScoreCircle({ score }) {
  const s = parseFloat(score) || 0;
  const r = 52; const c = 2 * Math.PI * r;
  const offset = c - (s / 100) * c;
  const color = s >= 80 ? "#34d399" : s >= 60 ? "#fbbf24" : "#60a5fa";
  const label = s >= 80 ? "Excellent!" : s >= 60 ? "Good Job!" : "Keep Practicing";
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 65 65)" style={{ transition: "stroke-dashoffset 1.4s ease", filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <text x="65" y="60" textAnchor="middle" fontSize="26" fontWeight="800" fill="white">{s.toFixed(1)}%</text>
        <text x="65" y="80" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.6)">{label}</text>
      </svg>
    </div>
  );
}

export default function QuizResult({ result, hideStartNew = false, onStartNew }) {
  if (!result) return null;
  return (
    <div className="space-y-6 p-2">
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="h-6 w-6 text-yellow-400" />
        <h2 className="gradient-title text-2xl">Quiz Results</h2>
      </div>

      {/* Score */}
      <div className="flex justify-center py-4">
        <ScoreCircle score={result.quizScore} />
      </div>

      {/* Improvement tip */}
      {result.improvementTip && (
        <div className="flex gap-3 p-4 rounded-xl bg-blue-500/8 border border-blue-500/20">
          <Lightbulb className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-300 mb-1">Improvement Tip</p>
            <p className="text-sm text-slate-300">{result.improvementTip}</p>
          </div>
        </div>
      )}

      {/* Question review */}
      <div className="space-y-3">
        <h3 className="font-semibold text-white">Question Review</h3>
        {result.questions.map((q, i) => (
          <div key={i} className={`rounded-xl border p-4 space-y-2 transition-colors ${
            q.isCorrect ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-sm text-white flex-1">{i + 1}. {q.question}</p>
              {q.isCorrect
                ? <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                : <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />}
            </div>
            <div className="text-xs space-y-0.5">
              <p className="text-slate-400">Your answer: <span className={q.isCorrect ? "text-green-400" : "text-red-400"}>{q.userAnswer}</span></p>
              {!q.isCorrect && <p className="text-slate-400">Correct: <span className="text-green-400">{q.answer}</span></p>}
            </div>
            <div className="text-xs bg-white/4 rounded-lg p-2.5 mt-2">
              <span className="text-muted-foreground font-medium">Explanation: </span>
              <span className="text-slate-300">{q.explanation}</span>
            </div>
          </div>
        ))}
      </div>

      {!hideStartNew && (
        <Button onClick={onStartNew} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl border-0 h-12">
          <RefreshCw className="mr-2 h-4 w-4" /> Start New Quiz
        </Button>
      )}
    </div>
  );
}
