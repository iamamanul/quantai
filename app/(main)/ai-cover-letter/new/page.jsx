import Link from "next/link";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoverLetterGenerator from "../_components/cover-letter-generator";

export default function NewCoverLetterPage() {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-blue-700/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Navigation */}
      <div className="flex flex-col space-y-2">
        <Link href="/ai-cover-letter">
          <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border border-emerald-400/50 w-fit">
            <ArrowLeft className="h-4 w-4" />
            Back to Cover Letters
          </Button>
        </Link>
      </div>

      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl border border-slate-600 flex items-center justify-center">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-bold gradient-title">
              Create Cover Letter
            </h1>
            <p className="text-slate-300 text-lg max-w-2xl">
              Generate a tailored cover letter for your job application using AI
            </p>
          </div>
        </div>
        
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg border border-slate-600">
            <div className="w-8 h-8 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-white">AI-Powered</p>
              <p className="text-sm text-slate-300">Tailored to your profile</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg border border-slate-600">
            <div className="w-8 h-8 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-white">Professional</p>
              <p className="text-sm text-slate-300">Industry-standard format</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg border border-slate-600">
            <div className="w-8 h-8 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-white">ATS-Friendly</p>
              <p className="text-sm text-slate-300">Optimized for tracking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Generator Component */}
      <CoverLetterGenerator />
    </div>
  );
}
