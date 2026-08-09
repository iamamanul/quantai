"use client";

import React, { useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Download, Edit, Eye, FileText, Copy, Check, Save } from "lucide-react";
import { toast } from "sonner";
import { updateCoverLetter } from "@/actions/cover-letter";

const CoverLetterPreview = ({ content, coverLetterId }) => {
  const [previewMode, setPreviewMode] = useState("preview");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      if (typeof window === 'undefined') {
        toast.error("PDF generation is not available during server rendering");
        return;
      }
      const html2pdf = (await import("html2pdf.js/dist/html2pdf.min.js")).default;
      
      const element = document.getElementById("cover-letter-pdf");
      if (!element) {
        toast.error("Cover letter content not found");
        return;
      }

      const opt = {
        margin: [15, 15],
        filename: "cover-letter.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCoverLetter(coverLetterId, editContent);
      toast.success("Cover letter updated!");
      setPreviewMode("preview");
    } catch (e) {
      toast.error(e.message || "Failed to update cover letter");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editContent);
      setIsCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy text");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 glass-card p-6 rounded-2xl border border-white/10 bg-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Cover Letter</h2>
          </div>
          <p className="text-sm text-slate-400 ml-13">Review, edit, and export your generated letter</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(previewMode === "preview" ? "edit" : "preview")}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 h-10 rounded-xl transition-all"
          >
            {previewMode === "preview" ? (
              <><Edit className="h-4 w-4 mr-2" /> Edit Letter</>
            ) : (
              <><Eye className="h-4 w-4 mr-2" /> Preview</>
            )}
          </Button>

          {previewMode === "preview" && (
            <Button
              variant="outline"
              onClick={handleCopy}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 h-10 rounded-xl transition-all"
            >
              {isCopied ? <Check className="h-4 w-4 mr-2 text-green-400" /> : <Copy className="h-4 w-4 mr-2" />}
              {isCopied ? "Copied" : "Copy Text"}
            </Button>
          )}

          {previewMode === "edit" && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 transition-all shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? <FileText className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          )}

          <Button
            onClick={generatePDF}
            disabled={isGeneratingPDF}
            className="h-10 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 transition-all shadow-lg shadow-blue-500/20"
          >
            {isGeneratingPDF ? (
              <><FileText className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Download PDF</>
            )}
          </Button>
        </div>
      </div>

      {/* Editor/Preview Area */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1117] overflow-hidden shadow-2xl ring-1 ring-white/5" data-color-mode="dark">
        <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-sm shadow-red-500/20" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-sm shadow-yellow-500/20" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-sm shadow-green-500/20" />
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{previewMode === "edit" ? "Markdown Editor" : "Document Preview"}</span>
        </div>
        <div className="p-1 min-h-[600px] cover-letter-wrapper">
          {previewMode === "edit" ? (
            <MDEditor
              value={editContent}
              onChange={setEditContent}
              preview="edit"
              height={700}
              className="border-0 bg-transparent !shadow-none font-sans"
              textareaProps={{
                placeholder: "Write your cover letter here...",
              }}
            />
          ) : (
            <div className="p-8 md:p-12 max-w-4xl mx-auto rounded-xl">
              <div className="prose prose-invert prose-slate max-w-none 
                prose-p:leading-relaxed prose-p:text-slate-300 prose-headings:text-white 
                prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-strong:text-white 
                prose-ul:text-slate-300 prose-ol:text-slate-300">
                <MDEditor.Markdown source={editContent} className="bg-transparent text-slate-200" style={{ background: 'transparent' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden PDF Element */}
      <div className="hidden">
        <div id="cover-letter-pdf" className="p-10 bg-white text-black font-serif">
          <style dangerouslySetInnerHTML={{__html: `
            #cover-letter-pdf {
              font-family: 'Times New Roman', Times, serif;
              font-size: 11pt;
              line-height: 1.6;
              color: #000;
              max-width: 800px;
              margin: 0 auto;
            }
            #cover-letter-pdf h1, #cover-letter-pdf h2, #cover-letter-pdf h3 {
              color: #111;
              font-weight: 600;
              margin-bottom: 1rem;
            }
            #cover-letter-pdf p {
              margin-bottom: 1rem;
              text-align: justify;
            }
            #cover-letter-pdf ul, #cover-letter-pdf ol {
              margin-bottom: 1rem;
              padding-left: 2rem;
            }
          `}} />
          <MDEditor.Markdown
            source={editContent}
            style={{
              background: "white",
              color: "black",
              fontFamily: "inherit",
              fontSize: "inherit",
              lineHeight: "inherit",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CoverLetterPreview;
