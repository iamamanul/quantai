"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search, ChevronRight, ChevronLeft, Check, Briefcase, User, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import useFetch from "@/hooks/use-fetch";
import { onboardingSchema } from "@/app/lib/schema";
import { updateUser } from "@/actions/user";

const CUSTOM_INDUSTRY_ID = "custom";

const OnboardingForm = ({ industries }) => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [industrySearch, setIndustrySearch] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [showSubDropdown, setShowSubDropdown] = useState(false);
  const [customIndustry, setCustomIndustry] = useState("");
  const [customSubIndustry, setCustomSubIndustry] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const industryRef = useRef(null);
  const subRef = useRef(null);

  const {
    loading: updateLoading,
    fn: updateUserFn,
    data: updateResult,
  } = useFetch(updateUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm({
    resolver: zodResolver(onboardingSchema),
  });

  const watchIndustry = watch("industry");
  const watchSubIndustry = watch("subIndustry");

  // Click outside to close dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (industryRef.current && !industryRef.current.contains(e.target)) {
        setShowIndustryDropdown(false);
      }
      if (subRef.current && !subRef.current.contains(e.target)) {
        setShowSubDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (updateResult?.success && !updateLoading) {
      toast.success("Profile completed! Welcome to QuantAI 🎉");
      router.push("/dashboard");
      router.refresh();
    }
  }, [updateResult, updateLoading, router]);

  // Filter industries based on search
  const filteredIndustries = industries.filter((ind) =>
    ind.name.toLowerCase().includes(industrySearch.toLowerCase()) ||
    ind.subIndustries.some((sub) => sub.toLowerCase().includes(industrySearch.toLowerCase()))
  );

  const filteredSubs = selectedIndustry
    ? selectedIndustry.subIndustries.filter((sub) =>
        sub.toLowerCase().includes(subSearch.toLowerCase())
      )
    : [];

  const handleIndustrySelect = (ind) => {
    if (ind.id === CUSTOM_INDUSTRY_ID) {
      setIsCustom(true);
      setSelectedIndustry(null);
      setValue("industry", customIndustry || "custom");
      setValue("subIndustry", customSubIndustry || "");
    } else {
      setIsCustom(false);
      setSelectedIndustry(ind);
      setValue("industry", ind.id);
      setValue("subIndustry", "");
      setSubSearch("");
    }
    setIndustrySearch(ind.id === CUSTOM_INDUSTRY_ID ? "" : ind.name);
    setShowIndustryDropdown(false);
  };

  const handleSubSelect = (sub) => {
    setValue("subIndustry", sub);
    setSubSearch(sub);
    setShowSubDropdown(false);
  };

  const handleNextStep = async () => {
    const valid = await trigger(["industry", "subIndustry"]);
    if (valid) setStep(2);
  };

  const onSubmit = async (values) => {
    try {
      let industryId = values.industry;
      let subIndustryStr = values.subIndustry;

      // Handle custom industry
      if (isCustom) {
        industryId = customIndustry.toLowerCase().replace(/\s+/g, "-") || "custom";
        subIndustryStr = customSubIndustry || values.subIndustry;
      }

      const formattedIndustry = `${industryId}-${subIndustryStr
        .toLowerCase()
        .replace(/ /g, "-")}`;

      await updateUserFn({
        ...values,
        industry: formattedIndustry,
      });
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Failed to save profile. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="orb w-96 h-96 bg-blue-600/10 animate-orb-1" style={{ top: '10%', left: '5%' }} />
      <div className="orb w-80 h-80 bg-purple-600/10 animate-orb-2" style={{ bottom: '10%', right: '5%' }} />
      <div className="orb w-64 h-64 bg-cyan-600/8 animate-orb-3" style={{ top: '40%', right: '20%' }} />

      <div className="w-full max-w-xl relative z-10 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-4">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-blue-300 font-medium">Step {step} of 2</span>
          </div>
          <h1 className="gradient-title text-4xl md:text-5xl mb-3">
            {step === 1 ? "Your Career Path" : "Your Profile"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {step === 1
              ? "Select your industry for personalized AI insights"
              : "Tell us about your experience and skills"}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: step === 1 ? "50%" : "100%",
                background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                boxShadow: "0 0 12px hsl(217,91%,60%,0.6)",
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span className={step >= 1 ? "text-blue-400 font-medium" : ""}>Industry</span>
            <span className={step >= 2 ? "text-blue-400 font-medium" : ""}>Profile</span>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                {/* Industry search */}
                <div className="space-y-2" ref={industryRef}>
                  <Label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-400" />
                    Industry / Career Field
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={industrySearch}
                      onChange={(e) => {
                        setIndustrySearch(e.target.value);
                        setShowIndustryDropdown(true);
                        if (!e.target.value) {
                          setSelectedIndustry(null);
                          setValue("industry", "");
                        }
                      }}
                      onFocus={() => setShowIndustryDropdown(true)}
                      placeholder="Search or type your career field..."
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                    />
                  </div>
                  {showIndustryDropdown && (
                    <div className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto bg-slate-900 border border-white/10 rounded-xl shadow-2xl animate-fade-in">
                      {filteredIndustries.length === 0 && (
                        <div className="p-3 text-sm text-muted-foreground text-center">No matches found</div>
                      )}
                      {filteredIndustries.map((ind) => (
                        <button
                          key={ind.id}
                          type="button"
                          onClick={() => handleIndustrySelect(ind)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-500/10 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <div className="font-medium text-sm text-white">{ind.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{ind.subIndustries.slice(0, 3).join(", ")}...</div>
                          </div>
                          {watchIndustry === ind.id && <Check className="h-4 w-4 text-blue-400" />}
                        </button>
                      ))}
                      {/* Custom option */}
                      <button
                        type="button"
                        onClick={() => handleIndustrySelect({ id: CUSTOM_INDUSTRY_ID, name: "Custom Career", subIndustries: [] })}
                        className="w-full text-left px-4 py-3 hover:bg-purple-500/10 border-t border-white/5 transition-colors flex items-center gap-3"
                      >
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <Sparkles className="h-3 w-3 text-purple-400" />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-purple-300">Custom Career Field</div>
                          <div className="text-xs text-muted-foreground">Enter any career not listed above</div>
                        </div>
                      </button>
                    </div>
                  )}
                  {errors.industry && (
                    <p className="text-sm text-red-400 flex items-center gap-1 animate-slide-up">
                      <X className="h-3 w-3" /> {errors.industry.message}
                    </p>
                  )}
                </div>

                {/* Custom industry text input */}
                {isCustom && (
                  <div className="space-y-2 animate-slide-up">
                    <Label className="text-sm font-semibold text-slate-200">Your Career Field</Label>
                    <input
                      type="text"
                      value={customIndustry}
                      onChange={(e) => {
                        setCustomIndustry(e.target.value);
                        setValue("industry", e.target.value.toLowerCase().replace(/\s+/g, "-") || "custom");
                      }}
                      placeholder="e.g., Space Engineering, Film Directing..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm"
                    />
                  </div>
                )}

                {/* Specialization */}
                {(selectedIndustry || isCustom) && (
                  <div className="space-y-2 animate-slide-up" ref={subRef}>
                    <Label className="text-sm font-semibold text-slate-200">Specialization</Label>
                    {isCustom ? (
                      <input
                        type="text"
                        value={customSubIndustry}
                        onChange={(e) => {
                          setCustomSubIndustry(e.target.value);
                          setValue("subIndustry", e.target.value);
                        }}
                        placeholder="e.g., Rocket Propulsion, Documentary..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm"
                      />
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={subSearch}
                          onChange={(e) => {
                            setSubSearch(e.target.value);
                            setShowSubDropdown(true);
                          }}
                          onFocus={() => setShowSubDropdown(true)}
                          placeholder="Search specialization..."
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                        />
                        {showSubDropdown && filteredSubs.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-white/10 rounded-xl shadow-2xl animate-fade-in">
                            {filteredSubs.map((sub) => (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => handleSubSelect(sub)}
                                className="w-full text-left px-4 py-2.5 hover:bg-blue-500/10 text-sm text-slate-200 transition-colors flex items-center justify-between"
                              >
                                {sub}
                                {watchSubIndustry === sub && <Check className="h-3 w-3 text-blue-400" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {errors.subIndustry && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <X className="h-3 w-3" /> {errors.subIndustry.message}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-glow group"
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-400" />
                    Years of Experience
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    placeholder="e.g., 3"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder-slate-400 focus-visible:ring-blue-500/50 rounded-xl"
                    {...register("experience")}
                  />
                  {errors.experience && (
                    <p className="text-sm text-red-400">{errors.experience.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-200">Skills</Label>
                  <Input
                    placeholder="Python, React, Project Management, etc."
                    className="h-12 bg-white/5 border-white/10 text-white placeholder-slate-400 focus-visible:ring-blue-500/50 rounded-xl"
                    {...register("skills")}
                  />
                  <p className="text-xs text-muted-foreground">Separate skills with commas</p>
                  {errors.skills && (
                    <p className="text-sm text-red-400">{errors.skills.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-200">Professional Bio</Label>
                  <Textarea
                    placeholder="Share your professional background, goals, and what makes you unique..."
                    className="min-h-28 bg-white/5 border-white/10 text-white placeholder-slate-400 focus-visible:ring-blue-500/50 rounded-xl resize-none"
                    {...register("bio")}
                  />
                  {errors.bio && (
                    <p className="text-sm text-red-400">{errors.bio.message}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1 h-12 border-white/10 text-slate-300 hover:bg-white/5 rounded-xl"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateLoading}
                    className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-glow"
                  >
                    {updateLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" /> Complete Profile</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Bottom hint */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          Your data is private and secure. AI insights are generated fresh for you.
        </p>
      </div>
    </div>
  );
};

export default OnboardingForm;
