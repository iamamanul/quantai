"use client";

import React, { useState, useEffect } from "react";
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

export default function WeeklyTimeTable({ onBackToCalendar, initialData }) {
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
  const loadWeekTasks = async () => {
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
  };

  // Load tasks when week or time slots change
  useEffect(() => {
    loadWeekTasks();
  }, [currentWeek, timeSlots]);

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
    if (!task || !task.task.trim()) return "bg-slate-800 hover:bg-slate-700 border-slate-600";
    if (task.completed) return "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm";
    return "bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-sm";
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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-indigo-700/20 p-3 rounded-xl border border-blue-500/30 shadow-lg">
              <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
              <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
              <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent">
                Weekly Timetable
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Week of {format(currentWeek, "MMM d")} - {format(addDays(currentWeek, 6), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap w-full lg:w-auto justify-end">
            <Button 
              onClick={() => setShowTimeEditor(!showTimeEditor)}
              className="text-sm sm:text-base py-2 px-4 bg-slate-700 hover:bg-slate-800 text-white flex items-center gap-2 border border-slate-600"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">{showTimeEditor ? "Hide" : "Edit"} Time Slots</span>
              <span className="sm:hidden">Edit</span>
            </Button>
            <Button 
              onClick={onBackToCalendar}
              className="text-sm sm:text-base py-2 px-4 bg-slate-600 hover:bg-slate-700 text-white border border-slate-500"
            >
              <span className="hidden sm:inline">← Back to Calendar</span>
              <span className="sm:hidden">← Back</span>
            </Button>
            <Button 
              onClick={handleSaveAll}
              disabled={isSaving}
              className="text-sm sm:text-base py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white relative border border-blue-500"
            >
              {isSaving ? (
                <>
                  <span className="opacity-0">Save Schedule</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 mb-6 shadow-lg">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Previous/Next Week Controls */}
            <div className="flex items-center gap-3 order-2 lg:order-1">
              <Button 
                onClick={handlePreviousWeek}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 sm:p-3 border border-blue-500 shadow-md transition-all duration-200 hover:scale-105"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              
              <div className="text-center px-2 sm:px-4">
                <div className="text-white font-semibold text-base sm:text-lg">
                  {format(currentWeek, "MMM d")} - {format(addDays(currentWeek, 6), "MMM d, yyyy")}
                </div>
                <div className="text-slate-400 text-xs sm:text-sm mt-1">
                  Week {Math.ceil((currentWeek.getTime() - new Date(currentWeek.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}
                </div>
              </div>
              
              <Button 
                onClick={handleNextWeek}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 sm:p-3 border border-blue-500 shadow-md transition-all duration-200 hover:scale-105"
                size="sm"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
            
            {/* Date Picker and Today Button */}
            <div className="flex items-center gap-2 sm:gap-3 order-1 lg:order-2 w-full lg:w-auto justify-center lg:justify-end">
              <Button 
                onClick={handleTodayWeek}
                className="bg-white hover:bg-gray-100 text-slate-700 px-3 py-2 text-sm border border-gray-300 font-medium shadow-sm transition-all duration-200"
                size="sm"
              >
                <span className="hidden sm:inline">This Week</span>
                <span className="sm:hidden">Today</span>
              </Button>
              
              <div className="relative date-picker-container">
                <Button 
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm flex items-center gap-2 border border-indigo-500 shadow-md transition-all duration-200"
                  size="sm"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Jump to Date</span>
                  <span className="sm:hidden">Jump</span>
                </Button>
                
                {showDatePicker && (
                  <div className="absolute top-full right-0 mt-2 z-[100] bg-white rounded-lg shadow-2xl border border-gray-200">
                    <div className="p-3">
                      <input
                        type="date"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleWeekSelect(new Date(e.target.value));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                        style={{
                          colorScheme: 'light',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 mb-6 shadow-lg">
          <div className="relative h-3 w-full bg-slate-700 rounded-full overflow-hidden">
            <Progress 
              value={progress}
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
            />
          </div>
          <p className="text-center mt-3 text-base sm:text-lg font-medium text-white">
            {Math.round(progress)}% Weekly Tasks Completed
          </p>
        </div>

        {/* Time Slot Editor */}
        {showTimeEditor && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 mb-6 shadow-lg">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Manage Time Slots
            </h3>
            
            {/* Add New Time Slot */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
                <Input
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  placeholder="Enter new time slot (e.g., 2:00 - 3:00)"
                  className="flex-1 bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <Button
                  onClick={handleAddTimeSlot}
                  disabled={!newTimeSlot.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 border border-blue-500 shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Add Time Slot</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>
            
            {/* Existing Time Slots */}
            <div className="space-y-3">
              <h4 className="text-base sm:text-lg font-semibold text-white mb-3">Current Time Slots:</h4>
              <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                {timeSlots.map((slot, index) => (
                  <div key={slot} className="flex items-center gap-2 sm:gap-3 p-3 bg-slate-700 border border-slate-600 rounded-lg">
                    {editingTimeSlot === slot ? (
                      <>
                        <Input
                          value={editingTimeValue}
                          onChange={(e) => setEditingTimeValue(e.target.value)}
                          className="flex-1 bg-slate-600 border-slate-500 text-white focus:border-blue-500"
                          autoFocus
                        />
                        <Button
                          onClick={() => handleEditTimeSlot(slot, editingTimeValue)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 border border-blue-500"
                          size="sm"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingTimeSlot(null);
                            setEditingTimeValue("");
                          }}
                          className="bg-slate-500 hover:bg-slate-600 text-white px-2 py-1 border border-slate-400"
                          size="sm"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-white font-medium text-sm sm:text-base">{slot}</span>
                        <Button
                          onClick={() => {
                            setEditingTimeSlot(slot);
                            setEditingTimeValue(slot);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 border border-blue-500"
                          size="sm"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteTimeSlot(slot)}
                          className="bg-slate-500 hover:bg-slate-600 text-white px-2 py-1 border border-slate-400"
                          size="sm"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Reset Button */}
            <div className="mt-6 pt-4 border-t border-slate-600">
              <Button
                onClick={handleResetToDefault}
                className="bg-white hover:bg-gray-100 text-slate-700 border border-gray-300 shadow-sm"
              >
                Reset to Default Time Slots
              </Button>
            </div>
          </div>
        )}

        {/* Weekly Timetable Grid */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] sm:min-w-[600px] lg:min-w-[800px]">
              <thead>
                <tr>
                  <th className="bg-slate-700 border border-slate-600 text-white font-semibold text-center p-2 sm:p-3 min-w-[80px] sm:min-w-[120px] text-xs sm:text-sm">
                    Time
                  </th>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <th key={day} className={`text-white font-semibold text-center p-2 sm:p-3 min-w-[90px] sm:min-w-[140px] text-xs sm:text-sm border border-slate-600 ${
                      index === 0 ? 'bg-blue-600' : 
                      index === 1 ? 'bg-indigo-600' : 
                      index === 2 ? 'bg-blue-700' : 
                      index === 3 ? 'bg-indigo-700' : 
                      index === 4 ? 'bg-blue-800' : 
                      index === 5 ? 'bg-slate-600' : 'bg-slate-700'
                    }`}>
                      <div className="font-bold">{day.substring(0, 3)}</div>
                      <div className="text-xs font-normal mt-1 opacity-90">
                        {format(addDays(currentWeek, index), "MMM d")}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot) => (
                  <tr key={timeSlot}>
                    <td className="bg-white border border-slate-600 text-slate-800 font-semibold text-center p-2 sm:p-3 text-xs sm:text-sm">
                      <div className="break-words">{timeSlot}</div>
                    </td>
                    {DAYS_OF_WEEK.map((day) => (
                      <td 
                        key={`${day}-${timeSlot}`} 
                        className={`p-1 sm:p-2 border border-slate-600 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${getCellBackgroundColor(day, timeSlot)}`}
                      >
                        {editingCell?.day === day && editingCell?.timeSlot === timeSlot ? (
                          <div className="space-y-2 p-1">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full text-xs sm:text-sm bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              placeholder="Enter task..."
                              autoFocus
                            />
                            <div className="flex gap-1 justify-center">
                              <Button
                                size="sm"
                                onClick={handleSaveCell}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 border border-blue-500"
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleCancelEdit}
                                className="bg-slate-500 hover:bg-slate-600 text-white px-2 py-1 border border-slate-400"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="min-h-[50px] sm:min-h-[60px] p-1 sm:p-2 rounded flex flex-col justify-between hover:bg-opacity-80 transition-all duration-200"
                            onClick={() => handleCellClick(day, timeSlot)}
                          >
                            <div className="text-white text-xs sm:text-sm break-words flex-1 leading-tight">
                              {weeklyTasks[day]?.[timeSlot]?.task || (
                                <div className="text-slate-400 flex items-center justify-center h-full">
                                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                                </div>
                              )}
                            </div>
                            {weeklyTasks[day]?.[timeSlot]?.task && (
                              <div className="flex items-center gap-1 mt-2">
                                <Checkbox
                                  checked={weeklyTasks[day][timeSlot].completed}
                                  onCheckedChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleCompleted(day, timeSlot);
                                  }}
                                  className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-slate-300 text-blue-600"
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
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-sm bg-slate-600 border border-slate-500" />
            <span className="text-xs sm:text-sm text-slate-300">Empty</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-sm bg-gradient-to-br from-indigo-600 to-indigo-700 border border-indigo-500" />
            <span className="text-xs sm:text-sm text-slate-300">Has Task</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-sm bg-gradient-to-br from-blue-600 to-blue-700 border border-blue-500" />
            <span className="text-xs sm:text-sm text-slate-300">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
