"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Save,
  X,
  CalendarDays,
  CheckCircle2,
  Clock,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { toast } from "sonner";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEFAULT_TIME_SLOTS = [
  "8:30 - 9:20",
  "9:20 - 10:10",
  "10:10 - 11:50",
  "11:50 - 12:40",
  "12:40 - 1:30",
  "3:40 - 4:30"
];

export default function WeeklyTimeTable({ onBackToCalendar }) {
  const [weeklyTasks, setWeeklyTasks] = useState({});
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeSlots, setTimeSlots] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('weekly-timetable-slots');
      return saved ? JSON.parse(saved) : DEFAULT_TIME_SLOTS;
    }
    return DEFAULT_TIME_SLOTS;
  });
  const [showTimeEditor, setShowTimeEditor] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [editingTimeSlot, setEditingTimeSlot] = useState(null);
  const [editingTimeValue, setEditingTimeValue] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load tasks for the selected week
  const loadWeekTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/timetable');
      if (response.ok) {
        const allTasks = await response.json();

        // Filter tasks for the current week
        const weekStart = currentWeek;
        const weekEnd = addDays(currentWeek, 6);

        const weekTasks = allTasks.filter(task => {
          const taskDate = new Date(task.date);
          return taskDate >= weekStart && taskDate <= weekEnd;
        });

        const tasksMap = {};

        // Initialize structure
        DAYS_OF_WEEK.forEach(day => {
          tasksMap[day] = {};
          timeSlots.forEach(slot => {
            tasksMap[day][slot] = { task: "", completed: false, id: null };
          });
        });

        // Populate with existing data for this week
        weekTasks.forEach(item => {
          const date = new Date(item.date);
          const dayName = format(date, 'EEEE');

          // Extract time slot from task if it exists
          const taskText = item.task;
          let timeSlot = null;
          let actualTask = taskText;

          // Check if task has time slot format [timeSlot] task
          const timeSlotMatch = taskText.match(/^\[([^\]]+)\]\s*(.*)/);
          if (timeSlotMatch) {
            timeSlot = timeSlotMatch[1];
            actualTask = timeSlotMatch[2];
          } else {
            // Find first empty slot if no time slot specified
            timeSlot = timeSlots.find(slot =>
              !tasksMap[dayName] || !tasksMap[dayName][slot] || !tasksMap[dayName][slot].task
            );
          }

          if (timeSlot && tasksMap[dayName] && timeSlots.includes(timeSlot)) {
            tasksMap[dayName][timeSlot] = {
              task: actualTask,
              completed: item.completed,
              id: item.id
            };
          }
        });

        setWeeklyTasks(tasksMap);
      }
    } catch (error) {
      console.error('Error loading week tasks:', error);
      // Initialize empty structure on error
      const emptyTasks = {};
      DAYS_OF_WEEK.forEach(day => {
        emptyTasks[day] = {};
        timeSlots.forEach(slot => {
          emptyTasks[day][slot] = { task: "", completed: false, id: null };
        });
      });
      setWeeklyTasks(emptyTasks);
    }
  }, [currentWeek, timeSlots]);

  // Load tasks when week or time slots change
  useEffect(() => {
    loadWeekTasks();
  }, [loadWeekTasks]);

  // Calculate progress
  useEffect(() => {
    let totalTasks = 0;
    let completedTasks = 0;

    Object.values(weeklyTasks).forEach(dayTasks => {
      Object.values(dayTasks).forEach(slot => {
        if (slot.task.trim()) {
          totalTasks++;
          if (slot.completed) {
            completedTasks++;
          }
        }
      });
    });

    setProgress(totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0);
  }, [weeklyTasks]);

  // Persist time slots to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('weekly-timetable-slots', JSON.stringify(timeSlots));
    }
  }, [timeSlots]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDatePicker && !event.target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  const handleCellClick = (day, timeSlot) => {
    setEditingCell({ day, timeSlot });
    setEditValue(weeklyTasks[day]?.[timeSlot]?.task || "");
  };

  const handleSaveCell = () => {
    if (!editingCell) return;

    const { day, timeSlot } = editingCell;
    const newWeeklyTasks = { ...weeklyTasks };

    if (!newWeeklyTasks[day]) {
      newWeeklyTasks[day] = {};
    }

    newWeeklyTasks[day][timeSlot] = {
      ...newWeeklyTasks[day][timeSlot],
      task: editValue
    };

    setWeeklyTasks(newWeeklyTasks);
    setEditingCell(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleToggleCompleted = (day, timeSlot) => {
    const newWeeklyTasks = { ...weeklyTasks };
    if (newWeeklyTasks[day] && newWeeklyTasks[day][timeSlot]) {
      newWeeklyTasks[day][timeSlot] = {
        ...newWeeklyTasks[day][timeSlot],
        completed: !newWeeklyTasks[day][timeSlot].completed
      };
      setWeeklyTasks(newWeeklyTasks);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const timetableArray = [];

      DAYS_OF_WEEK.forEach((day, dayIndex) => {
        const dayDate = addDays(currentWeek, dayIndex);

        timeSlots.forEach(timeSlot => {
          const task = weeklyTasks[day]?.[timeSlot];
          if (task && task.task.trim()) {
            timetableArray.push({
              id: task.id,
              date: dayDate,
              task: `[${timeSlot}] ${task.task}`,
              completed: task.completed
            });
          }
        });
      });

      const response = await fetch("/api/timetable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(timetableArray),
      });

      if (!response.ok) {
        throw new Error("Failed to save weekly timetable");
      }

      toast.success("Weekly timetable saved successfully!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const getCellBackgroundColor = (day, timeSlot) => {
    const task = weeklyTasks[day]?.[timeSlot];
    if (!task || !task.task.trim()) return "bg-slate-800 hover:bg-slate-700";
    if (task.completed) return "bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800";
    return "bg-gradient-to-br from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800";
  };

  const handleAddTimeSlot = () => {
    if (!newTimeSlot.trim()) return;

    const updatedTimeSlots = [...timeSlots, newTimeSlot];
    setTimeSlots(updatedTimeSlots);

    // Add new time slot to all days in weeklyTasks
    const newWeeklyTasks = { ...weeklyTasks };
    DAYS_OF_WEEK.forEach(day => {
      if (!newWeeklyTasks[day]) {
        newWeeklyTasks[day] = {};
      }
      newWeeklyTasks[day][newTimeSlot] = { task: "", completed: false, id: null };
    });
    setWeeklyTasks(newWeeklyTasks);

    setNewTimeSlot("");
    toast.success("Time slot added successfully!");
  };

  const handleEditTimeSlot = (oldSlot, newSlot) => {
    if (!newSlot.trim()) return;

    const updatedTimeSlots = timeSlots.map(slot => slot === oldSlot ? newSlot : slot);
    setTimeSlots(updatedTimeSlots);

    // Update time slot in all days
    const newWeeklyTasks = { ...weeklyTasks };
    DAYS_OF_WEEK.forEach(day => {
      if (newWeeklyTasks[day] && newWeeklyTasks[day][oldSlot]) {
        newWeeklyTasks[day][newSlot] = { ...newWeeklyTasks[day][oldSlot] };
        delete newWeeklyTasks[day][oldSlot];
      }
    });
    setWeeklyTasks(newWeeklyTasks);

    setEditingTimeSlot(null);
    setEditingTimeValue("");
    toast.success("Time slot updated successfully!");
  };

  const handleDeleteTimeSlot = (timeSlot) => {
    const updatedTimeSlots = timeSlots.filter(slot => slot !== timeSlot);
    setTimeSlots(updatedTimeSlots);

    // Remove time slot from all days
    const newWeeklyTasks = { ...weeklyTasks };
    DAYS_OF_WEEK.forEach(day => {
      if (newWeeklyTasks[day] && newWeeklyTasks[day][timeSlot]) {
        delete newWeeklyTasks[day][timeSlot];
      }
    });
    setWeeklyTasks(newWeeklyTasks);

    toast.success("Time slot deleted successfully!");
  };

  const handleResetToDefault = () => {
    setTimeSlots(DEFAULT_TIME_SLOTS);

    // Reset weekly tasks structure
    const emptyTasks = {};
    DAYS_OF_WEEK.forEach(day => {
      emptyTasks[day] = {};
      DEFAULT_TIME_SLOTS.forEach(slot => {
        emptyTasks[day][slot] = { task: "", completed: false, id: null };
      });
    });
    setWeeklyTasks(emptyTasks);

    toast.success("Time slots reset to default!");
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleWeekSelect = (date) => {
    if (date) {
      setCurrentWeek(startOfWeek(date, { weekStartsOn: 1 }));
      setShowDatePicker(false);
    }
  };

  const handleTodayWeek = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-3 rounded-2xl border border-blue-500/30">
              <CalendarDays className="w-8 h-8 text-blue-400" />
              <CalendarIcon className="w-8 h-8 text-purple-400" />
              <CheckCircle2 className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                Weekly Timetable
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Week of {format(currentWeek, "MMM d")} - {format(addDays(currentWeek, 6), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex gap-2 lg:gap-3 flex-wrap justify-center lg:justify-end">
            <Button
              onClick={() => setShowTimeEditor(!showTimeEditor)}
              className="text-sm lg:text-base py-2 lg:py-3 px-3 lg:px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white flex items-center gap-2 shadow-lg"
            >
              <Settings className="w-4 lg:w-5 h-4 lg:h-5" />
              <span className="hidden sm:inline">{showTimeEditor ? "Hide" : "Edit"} Time Slots</span>
              <span className="sm:hidden">Edit</span>
            </Button>
            <Button
              onClick={onBackToCalendar}
              className="text-sm lg:text-base py-2 lg:py-3 px-3 lg:px-6 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg"
            >
              <span className="hidden sm:inline">← Back to Calendar</span>
              <span className="sm:hidden">← Back</span>
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="text-sm lg:text-base py-2 lg:py-3 px-3 lg:px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white relative shadow-lg"
            >
              {isSaving ? (
                <>
                  <span className="opacity-0">
                    <span className="hidden sm:inline">Save Weekly Schedule</span>
                    <span className="sm:hidden">Save</span>
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 lg:w-6 h-4 lg:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Save Weekly Schedule</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 lg:p-6 mb-6 border border-slate-700">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Previous/Next Week Controls */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handlePreviousWeek}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-2 lg:p-3 shadow-lg"
                size="sm"
              >
                <ChevronLeft className="w-4 lg:w-5 h-4 lg:h-5" />
              </Button>

              <div className="text-center px-2">
                <div className="text-white font-semibold text-base lg:text-lg">
                  {format(currentWeek, "MMM d")} - {format(addDays(currentWeek, 6), "MMM d, yyyy")}
                </div>
                <div className="text-blue-300 text-xs lg:text-sm">
                  Week {Math.ceil((currentWeek.getTime() - new Date(currentWeek.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}
                </div>
              </div>

              <Button
                onClick={handleNextWeek}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-2 lg:p-3 shadow-lg"
                size="sm"
              >
                <ChevronRight className="w-4 lg:w-5 h-4 lg:h-5" />
              </Button>
            </div>

            {/* Date Picker and Today Button */}
            <div className="flex items-center gap-2 lg:gap-3">
              <Button
                onClick={handleTodayWeek}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-3 lg:px-4 py-2 text-sm lg:text-base shadow-lg"
                size="sm"
              >
                <span className="hidden sm:inline">This Week</span>
                <span className="sm:hidden">Today</span>
              </Button>

              <div className="relative date-picker-container">
                <Button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-3 lg:px-4 py-2 flex items-center gap-2 text-sm lg:text-base shadow-lg"
                  size="sm"
                >
                  <CalendarIcon className="w-3 lg:w-4 h-3 lg:h-4" />
                  <span className="hidden sm:inline">Jump to Date</span>
                  <span className="sm:hidden">Jump</span>
                </Button>

                {showDatePicker && (
                  <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-lg shadow-xl border border-gray-200">
                    <div className="p-3">
                      <input
                        type="date"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleWeekSelect(new Date(e.target.value));
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm lg:text-base"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 lg:p-6 mb-6 border border-slate-700">
          <div className="relative h-4 w-full bg-slate-700 rounded-full overflow-hidden">
            <Progress
              value={progress}
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
            />
          </div>
          <p className="text-center mt-3 text-base lg:text-lg font-medium text-white">
            {Math.round(progress)}% Weekly Tasks Completed
          </p>
        </div>

        {/* Time Slot Editor */}
        {showTimeEditor && (
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 lg:p-6 mb-6 border border-slate-700">
            <h3 className="text-lg lg:text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Manage Time Slots
            </h3>

            {/* Add New Time Slot */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
                <Input
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  placeholder="Enter new time slot (e.g., 2:00 - 3:00)"
                  className="flex-1 bg-slate-700 border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Button
                  onClick={handleAddTimeSlot}
                  disabled={!newTimeSlot.trim()}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-4 py-2 shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Add Time Slot</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>

            {/* Existing Time Slots */}
            <div className="space-y-3">
              <h4 className="text-base lg:text-lg font-semibold text-white">Current Time Slots:</h4>
              {timeSlots.map((slot) => (
                <div key={slot} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-slate-700 rounded-lg border border-slate-600">
                  {editingTimeSlot === slot ? (
                    <>
                      <Input
                        value={editingTimeValue}
                        onChange={(e) => setEditingTimeValue(e.target.value)}
                        className="flex-1 bg-slate-600 border-slate-500 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditTimeSlot(slot, editingTimeValue)}
                          className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-3 py-1 shadow-lg"
                          size="sm"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingTimeSlot(null);
                            setEditingTimeValue("");
                          }}
                          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-3 py-1 shadow-lg"
                          size="sm"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-white font-medium">{slot}</span>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setEditingTimeSlot(slot);
                            setEditingTimeValue(slot);
                          }}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-1 shadow-lg"
                          size="sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteTimeSlot(slot)}
                          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-3 py-1 shadow-lg"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Reset Button */}
            <div className="mt-6 pt-4 border-t border-slate-600">
              <Button
                onClick={handleResetToDefault}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg"
              >
                Reset to Default Time Slots
              </Button>
            </div>
          </div>
        )}

        {/* Weekly Timetable Grid */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr>
                  <th className="bg-gradient-to-r from-slate-700 to-slate-800 text-white font-bold text-center p-3 lg:p-4 min-w-[120px] border-r border-slate-600">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-sm lg:text-base">Time</span>
                    </div>
                  </th>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <th key={day} className={`text-white font-bold text-center p-3 lg:p-4 min-w-[140px] border-r border-slate-600 ${index === 0 ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
                      index === 1 ? 'bg-gradient-to-r from-indigo-600 to-indigo-700' :
                        index === 2 ? 'bg-gradient-to-r from-purple-600 to-purple-700' :
                          index === 3 ? 'bg-gradient-to-r from-blue-600 to-purple-600' :
                            index === 4 ? 'bg-gradient-to-r from-indigo-600 to-blue-700' :
                              index === 5 ? 'bg-gradient-to-r from-slate-600 to-slate-700' : 'bg-gradient-to-r from-slate-600 to-slate-700'
                      }`}>
                      <div className="text-sm lg:text-base">{day}</div>
                      <div className="text-xs lg:text-sm font-normal mt-1 opacity-90">
                        {format(addDays(currentWeek, index), "MMM d")}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot, rowIndex) => (
                  <tr key={timeSlot} className={rowIndex % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-900/50'}>
                    <td className="bg-gradient-to-r from-blue-100 to-blue-50 text-slate-800 font-bold text-center p-3 lg:p-4 border border-slate-600">
                      <div className="text-xs lg:text-sm">{timeSlot}</div>
                    </td>
                    {DAYS_OF_WEEK.map((day) => (
                      <td
                        key={`${day}-${timeSlot}`}
                        className={`p-2 lg:p-3 border border-slate-600 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${getCellBackgroundColor(day, timeSlot)}`}
                      >
                        {editingCell?.day === day && editingCell?.timeSlot === timeSlot ? (
                          <div className="space-y-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full text-xs lg:text-sm bg-slate-700 border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter task..."
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={handleSaveCell}
                                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-2 py-1 shadow-lg"
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleCancelEdit}
                                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-2 py-1 shadow-lg"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="min-h-[60px] lg:min-h-[70px] p-2 rounded-lg flex flex-col justify-between transition-all duration-200 hover:shadow-lg"
                            onClick={() => handleCellClick(day, timeSlot)}
                          >
                            <div className="text-white text-xs lg:text-sm break-words flex-1 leading-tight">
                              {weeklyTasks[day]?.[timeSlot]?.task || (
                                <div className="text-slate-400 flex items-center justify-center h-full opacity-60">
                                  <Plus className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            {weeklyTasks[day]?.[timeSlot]?.task && (
                              <div className="flex items-center gap-2 mt-2">
                                <Checkbox
                                  checked={weeklyTasks[day][timeSlot].completed}
                                  onCheckedChange={() => {
                                    handleToggleCompleted(day, timeSlot);
                                  }}
                                  className="h-3 lg:h-4 w-3 lg:w-4 border-2 border-white text-blue-600"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-xs text-slate-300">Done</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 lg:gap-6 mt-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-slate-700 border border-slate-600" />
            <span className="text-xs lg:text-sm text-slate-300">Empty</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gradient-to-r from-blue-600 to-purple-700" />
            <span className="text-xs lg:text-sm text-slate-300">Has Task</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gradient-to-r from-emerald-600 to-emerald-700" />
            <span className="text-xs lg:text-sm text-slate-300">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}