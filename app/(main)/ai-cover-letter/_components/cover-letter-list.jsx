"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { Trash2, Eye, FileText, Building2, Calendar, Loader2, Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteCoverLetter } from "@/actions/cover-letter";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";

function StatusBadge({ status }) {
  if (status === "completed") return <span className="badge-success">Ready</span>;
  if (status === "draft") return <span className="badge-warning">Draft</span>;
  return <span className="badge-info">{status || "New"}</span>;
}

export default function CoverLetterList({ coverLetters }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState(null);
  const { loading: deleteLoading, fn: deleteFn } = useFetch(deleteCoverLetter);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteFn(id);
      toast.success("Cover letter deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete cover letter");
    } finally {
      setDeletingId(null);
    }
  };

  if (!coverLetters || coverLetters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-blue-500/20 flex items-center justify-center mb-6">
          <Mail className="h-10 w-10 text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No cover letters yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-8">Create your first AI-powered cover letter tailored perfectly to your target job.</p>
        <Link href="/ai-cover-letter/new">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl border-0 h-11">
            <Plus className="mr-2 h-4 w-4" /> Create First Cover Letter
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {coverLetters.map((letter) => (
        <div
          key={letter.id}
          className="group relative rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-blue-500/25 p-5 transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white truncate">{letter.jobTitle || "Untitled Position"}</h3>
                  <StatusBadge status={letter.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {letter.companyName && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {letter.companyName}
                    </span>
                  )}
                  {letter.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(letter.createdAt), "MMM dd, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href={`/ai-cover-letter/${letter.id}`}>
                <Button size="sm" variant="outline" className="border-white/10 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg h-8 gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> View
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                    {deletingId === letter.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Delete Cover Letter?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      This will permanently delete this cover letter. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/10 text-slate-300 hover:bg-white/5">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700 text-white border-0"
                      onClick={() => handleDelete(letter.id)}
                      disabled={deleteLoading}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
