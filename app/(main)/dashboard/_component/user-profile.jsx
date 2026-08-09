"use client";
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Briefcase, User, Layers, Star, Edit3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function getInitials(name) {
  return (name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const SKILL_COLORS = [
  "bg-blue-500/15 text-blue-300 border-blue-500/25",
  "bg-purple-500/15 text-purple-300 border-purple-500/25",
  "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
  "bg-rose-500/15 text-rose-300 border-rose-500/25",
];

export default function UserProfile({ user }) {
  const [open, setOpen] = useState(false);
  const safeUser = user || {};
  const [form, setForm] = useState({
    industry: safeUser.industry || "",
    experience: safeUser.experience ?? 0,
    bio: safeUser.bio || "",
    skills: Array.isArray(safeUser.skills) ? safeUser.skills.join(", ") : "",
  });
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const initials = getInitials(user.name);
  const industryDisplay = (user.industry || "").replace(/[-_]/g, " • ").split("•").map(s => s.trim()).join(" → ");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "experience" ? value.replace(/[^0-9]/g, "") : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: form.industry,
          experience: parseInt(form.experience || 0, 10),
          bio: form.bio || undefined,
          skills: form.skills,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to update");
      setOpen(false);
      window.location.reload();
    } catch (err) {
      alert(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative rounded-2xl border border-white/8 bg-white/3 overflow-hidden mb-6">
      {/* Gradient accent top */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500" />
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-extrabold text-white shadow-glow font-outfit">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-slate-950 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-center gap-3 mb-3">
              <div>
                <h2 className="text-xl font-bold text-white font-outfit">{user.name || "User"}</h2>
                {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
              </div>
              <div className="md:ml-auto">
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 gap-2 rounded-lg">
                      <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border border-white/10 text-slate-100">
                    <DialogHeader>
                      <DialogTitle className="text-white">Edit Profile</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="space-y-4">
                      <div>
                        <Label className="text-slate-300 mb-1.5 block">Industry</Label>
                        <Input name="industry" value={form.industry} onChange={onChange} className="bg-white/5 border-white/10 text-white" placeholder="e.g. tech-software-development" />
                      </div>
                      <div>
                        <Label className="text-slate-300 mb-1.5 block">Experience (years)</Label>
                        <Input name="experience" value={form.experience} onChange={onChange} inputMode="numeric" className="bg-white/5 border-white/10 text-white" />
                      </div>
                      <div>
                        <Label className="text-slate-300 mb-1.5 block">Bio</Label>
                        <Textarea name="bio" value={form.bio} onChange={onChange} className="bg-white/5 border-white/10 text-white resize-none" rows={3} />
                      </div>
                      <div>
                        <Label className="text-slate-300 mb-1.5 block">Skills (comma separated)</Label>
                        <Input name="skills" value={form.skills} onChange={onChange} className="bg-white/5 border-white/10 text-white" placeholder="React, Node.js, Python" />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-slate-400">Cancel</Button>
                        <Button type="submit" disabled={saving} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0">
                          {saving ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Saving...</> : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start mb-3">
              {user.industry && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-full px-3 py-1">
                  <Briefcase className="w-3 h-3" />
                  <span className="capitalize">{industryDisplay}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full px-3 py-1">
                <Layers className="w-3 h-3" />
                {user.experience || 0} yrs exp
              </span>
            </div>

            {/* Skills */}
            {user.skills && user.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center md:justify-start mb-3">
                {user.skills.map((skill, i) => (
                  <span key={skill} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${SKILL_COLORS[i % SKILL_COLORS.length]}`}>
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Bio */}
            {user.bio && (
              <p className="text-sm text-slate-400 leading-relaxed text-center md:text-left line-clamp-2">{user.bio}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
