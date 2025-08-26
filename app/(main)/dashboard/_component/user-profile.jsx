"use client";
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, User, Layers, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function stringToColor(str) {
  // Simple hash to color
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

function getContrastYIQ(hexcolor) {
  hexcolor = hexcolor.replace('#', '');
  const r = parseInt(hexcolor.substr(0,2),16);
  const g = parseInt(hexcolor.substr(2,2),16);
  const b = parseInt(hexcolor.substr(4,2),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? '#111' : '#fff';
}

export default function UserProfile({ user }) {
  // Hooks must be called unconditionally
  const [open, setOpen] = useState(false);
  const safeUser = user || {};
  const [form, setForm] = useState({
    industry: safeUser.industry || "",
    experience: safeUser.experience ?? 0,
    bio: safeUser.bio || "",
    skills: Array.isArray(safeUser.skills) ? safeUser.skills.join(", ") : "",
  });

  const [saving, setSaving] = useState(false);
  const initials = (safeUser.name || "U").split(" ").map((n) => n[0]).join("").toUpperCase();
  const avatarColor = stringToColor(safeUser.name || safeUser.email || "U");
  const avatarTextColor = getContrastYIQ(avatarColor);

  if (!user) return null;

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
      // Refresh page data
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6 shadow-xl bg-slate-800 text-slate-100 border border-slate-600">
      <CardContent className="relative z-10 flex flex-col md:flex-row items-center gap-6 py-8 px-6 md:px-12">
        {/* Avatar */}
        <div className="flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg border-4 border-slate-500" style={{ background: avatarColor, color: avatarTextColor }}>
          {initials}
        </div>
        {/* Info */}
        <div className="flex-1 w-full text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-center md:gap-6 gap-2">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <User className="w-6 h-6 text-slate-200" />
              {user.name || "User"}
            </div>
            {user.email && (
              <span className="text-slate-200 text-base break-words">{user.email}</span>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <div className="w-full md:w-auto md:ml-auto flex justify-center md:justify-end">
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-slate-900 border-slate-600 text-slate-100">Edit Profile</Button>
                </DialogTrigger>
              </div>
              <DialogContent className="bg-slate-900 text-slate-100 border border-slate-700">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm mb-1">Industry</label>
                    <Input name="industry" value={form.industry} onChange={onChange} className="bg-slate-800 border-slate-600" placeholder="e.g. software" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Experience (years)</label>
                    <Input name="experience" value={form.experience} onChange={onChange} inputMode="numeric" className="bg-slate-800 border-slate-600" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Bio</label>
                    <Textarea name="bio" value={form.bio} onChange={onChange} className="bg-slate-800 border-slate-600" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Skills (comma separated)</label>
                    <Input name="skills" value={form.skills} onChange={onChange} className="bg-slate-800 border-slate-600" placeholder="React, Node.js, SQL" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-slate-300">Cancel</Button>
                    <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 items-center justify-center md:justify-start text-center md:text-left">
            {user.industry && (
              <span className="flex items-center gap-1 text-base font-medium text-slate-200">
                <Briefcase className="w-4 h-4 text-slate-200" />
                <span className="capitalize">{user.industry}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-base font-medium text-slate-200">
              <Layers className="w-4 h-4 text-slate-200" />
              {user.experience || 0} yrs experience
            </span>
            {user.skills && user.skills.length > 0 && (
              <span className="flex items-center gap-1 text-base font-medium text-slate-200">
                <Star className="w-4 h-4 text-slate-200" />
                <span>Skills:</span>
                <span className="flex flex-wrap gap-1">
                  {user.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs px-2 py-1 bg-slate-900 text-slate-100 border border-slate-600">
                      {skill}
                    </Badge>
                  ))}
                </span>
              </span>
            )}
            {user.bio && (
              <div
                className="mt-3 text-slate-300 text-sm leading-relaxed break-words"
                style={{ textAlign: "justify", textJustify: "inter-word" }}
              >
                <span className="font-medium text-slate-200">Bio: </span>
                <span className="inline">{user.bio}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
