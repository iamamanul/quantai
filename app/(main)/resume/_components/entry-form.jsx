// app/resume/_components/entry-form.jsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse, parseISO, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { educationEntrySchema, experienceEntrySchema } from "@/app/lib/schema";
import { Sparkles, PlusCircle, X, Pencil, Save, Loader2 } from "lucide-react";
import { improveWithAI } from "@/actions/resume";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";

const formatDisplayDate = (dateString) => {
  if (!dateString) return "";
  // If already in 'MMM yyyy' format, return as is
  if (/^[A-Za-z]{3} \d{4}$/.test(dateString)) return dateString;
  // If in 'yyyy-MM' format, format to 'MMM yyyy'
  const date = parse(dateString, "yyyy-MM", new Date());
  if (isValid(date)) return format(date, "MMM yyyy");
  // If in ISO format, parse and format
  const isoDate = parseISO(dateString);
  if (isValid(isoDate)) return format(isoDate, "MMM yyyy");
  return dateString;
};

// Helper to convert 'MMM yyyy' to 'yyyy-MM' for input fields
const toInputMonth = (dateString) => {
  if (!dateString) return "";
  // If already in 'yyyy-MM' format, return as is
  if (/^\d{4}-\d{2}$/.test(dateString)) return dateString;
  // If in 'MMM yyyy' format, convert to 'yyyy-MM'
  const parsed = parse(dateString, "MMM yyyy", new Date());
  if (isValid(parsed)) return format(parsed, "yyyy-MM");
  // If in ISO format, parse and format
  const isoDate = parseISO(dateString);
  if (isValid(isoDate)) return format(isoDate, "yyyy-MM");
  return "";
};

export function EntryForm({ type, entries, onChange }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const {
    register,
    handleSubmit: handleValidation,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(type === "Education" ? educationEntrySchema : experienceEntrySchema),
    defaultValues:
      type === "Education"
        ? {
            institution: "",
            degree: "",
            location: "",
            grade: "",
            startDate: "",
            endDate: "",
            current: false,
          }
        : {
            title: "",
            organization: "",
            startDate: "",
            endDate: "",
            description: "",
            current: false,
          },
  });

  const current = watch("current");

  const handleAdd = handleValidation((data) => {
    const formattedEntry = {
      ...data,
      type,
      startDate: data.startDate ? formatDisplayDate(data.startDate) : "",
      endDate: data.current ? "" : (data.endDate ? formatDisplayDate(data.endDate) : ""),
    };
    if (editIndex !== null) {
      // Update existing entry
      const updated = [...entries];
      updated[editIndex] = formattedEntry;
      onChange(updated);
      setEditIndex(null);
    } else {
      // Add new entry
      onChange([...entries, formattedEntry]);
    }
    reset();
    setIsAdding(false);
  });

  const handleDelete = (index) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(newEntries);
    // If editing the deleted entry, reset form
    if (editIndex === index) {
      reset();
      setIsAdding(false);
      setEditIndex(null);
    }
  };

  const {
    loading: isImproving,
    fn: improveWithAIFn,
    data: improvedContent,
    error: improveError,
  } = useFetch(improveWithAI);

  // Add this effect to handle the improvement result
  useEffect(() => {
    if (improvedContent && !isImproving) {
      setValue("description", improvedContent);
      toast.success("Description improved successfully!");
    }
    if (improveError) {
      toast.error(improveError.message || "Failed to improve description");
    }
  }, [improvedContent, improveError, isImproving, setValue]);

  // Replace handleImproveDescription with this
  const handleImproveDescription = async () => {
    const description = watch("description");
    if (!description) {
      toast.error("Please enter a description first");
      return;
    }

    await improveWithAIFn({
      current: description,
      type: type.toLowerCase(), // 'experience', 'education', or 'project'
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {entries.map((item, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {type === "Education"
                  ? `${item.institution} (${item.degree})`
                  : `${item.title} @ ${item.organization}`}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => {
                    // Populate form with entry data for editing
                    // Patch date fields for input
                    const patched = { ...item };
                    if (patched.startDate) patched.startDate = toInputMonth(patched.startDate);
                    if (patched.endDate) patched.endDate = toInputMonth(patched.endDate);
                    reset(patched);
                    setIsAdding(true);
                    setEditIndex(index);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => handleDelete(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {item.current
                  ? `${item.startDate} - Present`
                  : `${item.startDate} - ${item.endDate}`}
              </p>
              <p className="mt-2 text-sm whitespace-pre-wrap">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Add {type}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Education-specific fields */}
            {type === "Education" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Institution"
                    {...register("institution")}
                    error={errors.institution}
                  />
                  {errors.institution && (
                    <p className="text-sm text-red-500">{errors.institution.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Degree"
                    {...register("degree")}
                    error={errors.degree}
                  />
                  {errors.degree && (
                    <p className="text-sm text-red-500">{errors.degree.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Location"
                    {...register("location")}
                    error={errors.location}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-500">{errors.location.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Grade (optional)"
                    {...register("grade")}
                    error={errors.grade}
                  />
                  {errors.grade && (
                    <p className="text-sm text-red-500">{errors.grade.message}</p>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {type !== "Education" && (
                <>
                  <div className="space-y-2">
                    <Input
                      placeholder="Title/Position"
                      {...register("title")}
                      error={errors.title}
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500">{errors.title.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Organization/Company"
                      {...register("organization")}
                      error={errors.organization}
                    />
                    {errors.organization && (
                      <p className="text-sm text-red-500">{errors.organization.message}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Input
                  type="month"
                  {...register("startDate")}
                  error={errors.startDate}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500">
                    {errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Input
                  type="month"
                  {...register("endDate")}
                  disabled={current}
                  error={errors.endDate}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-500">
                    {errors.endDate.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="current"
                {...register("current")}
                onChange={(e) => {
                  setValue("current", e.target.checked);
                  if (e.target.checked) {
                    setValue("endDate", "");
                  }
                }}
              />
              <label htmlFor="current">Current {type}</label>
            </div>

            {/* Description field only for non-Education types */}
            {type !== "Education" && (
              <div className="space-y-2">
                <Textarea
                  placeholder={`Description of your ${type.toLowerCase()}`}
                  className="h-32"
                  {...register("description")}
                  error={errors.description}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>
            )}
            {/* Improve with AI only for non-Education types */}
            {type !== "Education" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleImproveDescription}
                disabled={isImproving || !watch("description")}
              >
                {isImproving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Improving...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Improve with AI
                  </>
                )}
              </Button>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setIsAdding(false);
                setEditIndex(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAdd}>
              {editIndex !== null ? <Save className="h-4 w-4 mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
              {editIndex !== null ? "Save Changes" : "Add Entry"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {!isAdding && (
        <Button
          className="w-full"
          variant="outline"
          onClick={() => setIsAdding(true)}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add {type}
        </Button>
      )}
    </div>
  );
}
