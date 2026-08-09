"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { generateQuiz, saveQuizResult } from "@/actions/interview";
import QuizResult from "./quiz-result";
import useFetch from "@/hooks/use-fetch";
import { Brain, ChevronRight, Loader2, Sparkles, RefreshCw, AlertCircle, Trophy } from "lucide-react";

function SkeletonQuiz() {
  return (
    <div className="space-y-6 p-6">
      <div className="skeleton h-4 w-32 rounded" />
      <div className="skeleton h-6 w-full rounded" />
      <div className="skeleton h-5 w-4/5 rounded" />
      <div className="space-y-3 mt-6">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}
      </div>
    </div>
  );
}

export default function Quiz({ provider = "gemini" }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [actualProvider, setActualProvider] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [answerFeedback, setAnswerFeedback] = useState(null); // 'correct' | 'wrong'

  const { loading: generatingQuiz, fn: generateQuizFn, data: quizData } = useFetch(async (prov) => {
    setErrorDetails(null);
    try {
      const result = await generateQuiz(prov);
      setActualProvider(prov);
      return result;
    } catch (err) {
      setErrorDetails(err.message || "Unknown error");
      throw err;
    }
  });

  const { loading: savingResult, fn: saveQuizResultFn, data: resultData, setData: setResultData } = useFetch(saveQuizResult);

  useEffect(() => {
    if (quizData) setAnswers(new Array(quizData.length).fill(null));
  }, [quizData]);

  const handleAnswer = (answer) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);
    // Show instant feedback color
    const q = quizData[currentQuestion];
    if (q?.correctAnswer) {
      setAnswerFeedback(answer === q.correctAnswer ? "correct" : "wrong");
      setTimeout(() => setAnswerFeedback(null), 600);
    }
  };

  const handleNext = () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((ans, i) => { if (ans === quizData[i].correctAnswer) correct++; });
    return (correct / quizData.length) * 100;
  };

  const finishQuiz = async () => {
    const score = calculateScore();
    try {
      await saveQuizResultFn(quizData, answers, score);
      toast.success("Quiz completed! 🎉");
    } catch (error) {
      toast.error(error.message || "Failed to save quiz results");
    }
  };

  const startNewQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setShowExplanation(false);
    setResultData(null);
    setAnswerFeedback(null);
    generateQuizFn(provider);
  };

  if (generatingQuiz) return <SkeletonQuiz />;

  if (quizData && !Array.isArray(quizData) && (quizData.error || typeof quizData === "string")) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="font-semibold text-white">Couldn&apos;t generate quiz</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{quizData.error || quizData}</p>
        <Button onClick={startNewQuiz} variant="outline" className="border-white/10 mt-2">
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (resultData) {
    return <QuizResult result={resultData} onStartNew={startNewQuiz} />;
  }

  if (!quizData) {
    return (
      <div className="flex flex-col items-center text-center p-8 gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
            <Brain className="h-12 w-12 text-blue-400" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-400/80 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-yellow-900" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">Ready to test your knowledge?</h3>
          <p className="text-muted-foreground max-w-sm">10 AI-generated questions specific to your industry and skills. Take your time and choose wisely.</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center text-sm">
          {["10 Questions", "Industry Specific", "Instant Feedback"].map(f => (
            <span key={f} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300">{f}</span>
          ))}
        </div>
        <Button
          onClick={() => generateQuizFn(provider)}
          className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl border-0 font-semibold text-base"
        >
          <Sparkles className="mr-2 h-4 w-4" /> Start Quiz
        </Button>
      </div>
    );
  }

  const question = quizData[currentQuestion];
  const progress = ((currentQuestion + 1) / quizData.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Question {currentQuestion + 1} of {quizData.length}</span>
          {actualProvider && (
            <span className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wide">Powered by {actualProvider}</span>
          )}
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, #60a5fa, #a78bfa)" }}
          />
        </div>
      </div>

      {/* Question */}
      <div
        className={`rounded-2xl border p-6 transition-colors duration-300 ${
          answerFeedback === "correct" ? "border-green-500/40 bg-green-500/5" :
          answerFeedback === "wrong" ? "border-red-500/40 bg-red-500/5" :
          "border-white/8 bg-white/3"
        }`}
      >
        <p className="text-lg font-semibold text-white leading-relaxed">{question.question}</p>
      </div>

      {/* Options */}
      <RadioGroup onValueChange={handleAnswer} value={answers[currentQuestion]} className="space-y-3">
        {question.options.map((option, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
              answers[currentQuestion] === option
                ? "border-blue-500/50 bg-blue-500/10"
                : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5"
            }`}
            onClick={() => handleAnswer(option)}
          >
            <RadioGroupItem value={option} id={`opt-${i}`} className="border-white/30" />
            <Label htmlFor={`opt-${i}`} className="cursor-pointer text-sm text-slate-200 leading-relaxed flex-1">{option}</Label>
          </div>
        ))}
      </RadioGroup>

      {/* Explanation */}
      {showExplanation && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 p-4 animate-slide-up">
          <p className="text-sm font-semibold text-blue-300 mb-1">Explanation</p>
          <p className="text-sm text-slate-300">{question.explanation}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!showExplanation && (
          <Button
            variant="outline"
            className="border-white/10 text-slate-300 hover:bg-white/5"
            disabled={!answers[currentQuestion]}
            onClick={() => setShowExplanation(true)}
          >
            Explain
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={!answers[currentQuestion] || savingResult}
          className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl border-0 font-semibold group"
        >
          {savingResult ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : currentQuestion < quizData.length - 1 ? (
            <>Next Question <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></>
          ) : (
            <>Finish Quiz <Trophy className="ml-1 h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
