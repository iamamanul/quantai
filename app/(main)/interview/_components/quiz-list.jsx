"use client";
import { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QuizResult from "./quiz-result";
import { Trophy, Plus, Clock, ChevronRight, Brain } from "lucide-react";

function ScoreBadge({ score }) {
  const s = parseFloat(score);
  if (s >= 80) return <span className="badge-success">Excellent</span>;
  if (s >= 60) return <span className="badge-warning">Good</span>;
  return <span className="badge-info">Practice</span>;
}

function ScoreRing({ score }) {
  const s = parseFloat(score) || 0;
  const r = 22; const c = 2 * Math.PI * r;
  const offset = c - (s / 100) * c;
  const color = s >= 80 ? "#34d399" : s >= 60 ? "#fbbf24" : "#60a5fa";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 28 28)"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">{s.toFixed(0)}%</text>
    </svg>
  );
}

export default function QuizList({ assessments }) {
  const router = useRouter();
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const items = Array.isArray(assessments) ? assessments : [];

  return (
    <>
      <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/8">
          <div>
            <h2 className="gradient-title text-2xl sm:text-3xl">Recent Quizzes</h2>
            <p className="text-sm text-muted-foreground mt-1">Review your performance history</p>
          </div>
          <Button
            onClick={() => router.push("/interview/mock")}
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl border-0"
          >
            <Plus className="h-4 w-4" /> New Quiz
          </Button>
        </div>

        {/* List */}
        <div className="p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Brain className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No quizzes yet</h3>
              <p className="text-muted-foreground text-sm max-w-xs">Take your first quiz to start tracking your progress and improving your skills.</p>
              <Button
                onClick={() => router.push("/interview/mock")}
                className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl border-0"
              >
                <Plus className="h-4 w-4 mr-2" /> Start First Quiz
              </Button>
            </div>
          ) : (
            items.map((assessment, i) => (
              <button
                key={assessment.id}
                onClick={() => setSelectedQuiz(assessment)}
                className="w-full text-left rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-blue-500/30 p-4 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <ScoreRing score={assessment.quizScore} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">Quiz #{i + 1}</span>
                      <ScoreBadge score={assessment.quizScore} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(assessment.createdAt), "MMM dd, yyyy · HH:mm")}
                      </span>
                      {assessment.questions?.length > 0 && (
                        <span>{assessment.questions.length} questions</span>
                      )}
                    </div>
                    {assessment.improvementTip && (
                      <p className="text-xs text-muted-foreground/70 mt-1 truncate">{assessment.improvementTip}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!selectedQuiz} onOpenChange={() => setSelectedQuiz(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10">
          <DialogHeader><DialogTitle></DialogTitle></DialogHeader>
          <QuizResult result={selectedQuiz} hideStartNew onStartNew={() => router.push("/interview/mock")} />
        </DialogContent>
      </Dialog>
    </>
  );
}
