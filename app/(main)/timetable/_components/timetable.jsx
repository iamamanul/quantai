"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar as CalendarIcon, CheckCircle, ListTodo, CalendarDays, Bot, Sparkles } from 'lucide-react';
import AIPrompt from './ai-prompt';

export default function TimeTable({ initialData }) {
  const [timetable, setTimetable] = useState(new Map());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTask, setCurrentTask] = useState("");
  const [progress, setProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showWeeklyView, setShowWeeklyView] = useState(false);
  const [showAIPrompt, setShowAIPrompt] = useState(false);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      const taskMap = new Map();
      initialData.forEach(item => {
        taskMap.set(new Date(item.date).toISOString(), {
          task: item.task,
          completed: item.completed,
          id: item.id,
          aiGenerated: item.aiGenerated || false,
          difficulty: item.difficulty,
          resources: item.resources || []
        });
      });
      setTimetable(taskMap);
    }
  }, [initialData]);

  useEffect(() => {
    const completedCount = Array.from(timetable.values()).filter(item => item.completed).length;
    setProgress((completedCount / Math.max(timetable.size, 1)) * 100);
  }, [timetable]);

  const handleDateSelect = (date) => {
    if (!date) return;
    setSelectedDate(date);
    const existingTask = timetable.get(date.toISOString());
    setCurrentTask(existingTask?.task || "");
  };

  const handleTaskChange = (task) => {
    setCurrentTask(task);
  };

  const handleTaskSave = async () => {
    if (!currentTask.trim()) return;
    
    setIsAddingTask(true);
    try {
      const newTimetable = new Map(timetable);
      const dateKey = selectedDate.toISOString();
      const existingTask = newTimetable.get(dateKey);
      
      newTimetable.set(dateKey, {
        task: currentTask,
        completed: existingTask?.completed || false,
        id: existingTask?.id,
        aiGenerated: false,
        difficulty: null,
        resources: []
      });
      
      setTimetable(newTimetable);
      toast.success("Task added successfully!");
    } catch (error) {
      toast.error("Failed to add task");
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleCompletedChange = (checked) => {
    const dateKey = selectedDate.toISOString();
    const existingTask = timetable.get(dateKey);
    if (!existingTask) return;

    const newTimetable = new Map(timetable);
    newTimetable.set(dateKey, {
      ...existingTask,
      completed: checked
    });
    setTimetable(newTimetable);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const timetableArray = Array.from(timetable.entries()).map(([dateStr, data]) => ({
        id: data.id,
        date: new Date(dateStr),
        task: data.task,
        completed: data.completed,
        aiGenerated: data.aiGenerated,
        difficulty: data.difficulty,
        resources: data.resources
      }));

      const response = await fetch("/api/timetable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(timetableArray),
      });

      if (!response.ok) {
        throw new Error("Failed to save timetable");
      }

      toast.success("Timetable saved successfully!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (dateKey, id) => {
    try {
      const response = await fetch(`/api/timetable`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      const newTimetable = new Map(timetable);
      newTimetable.delete(dateKey);
      setTimetable(newTimetable);
      setCurrentTask("");
      toast.success("Task deleted successfully!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleAITimetableGenerated = async (calendarTasks, aiTimetable) => {
    console.log('=== AI TIMETABLE DEBUG START ===');
    console.log('Received calendar tasks:', calendarTasks);
    console.log('Current timetable state before:', Array.from(timetable.entries()));
    
    if (!calendarTasks || calendarTasks.length === 0) {
      console.error('No calendar tasks received!');
      toast.error('No tasks were generated. Please try again.');
      return;
    }

    try {
      // Create completely new Map to force re-render
      const newTimetable = new Map();
      
      // Copy existing tasks first
      timetable.forEach((value, key) => {
        newTimetable.set(key, value);
      });
      
      // Add AI-generated tasks
      let addedCount = 0;
      calendarTasks.forEach((task, index) => {
        console.log(`Processing task ${index + 1}:`, task);
        
        if (!task || !task.date) {
          console.error('Invalid task - missing date:', task);
          return;
        }
        
        try {
          let taskDate;
          if (typeof task.date === 'string') {
            taskDate = new Date(task.date);
          } else if (task.date instanceof Date) {
            taskDate = task.date;
          } else {
            console.error('Invalid date format:', task.date);
            return;
          }
          
          if (isNaN(taskDate.getTime())) {
            console.error('Invalid date value:', task.date);
            return;
          }
          
          const dateKey = taskDate.toISOString();
          console.log('Using date key:', dateKey);
          
          const taskData = {
            task: task.task || 'AI Generated Task',
            completed: false,
            id: null,
            aiGenerated: true,
            difficulty: task.difficulty || 'beginner',
            resources: task.resources || []
          };
          
          console.log('Adding task data:', taskData);
          newTimetable.set(dateKey, taskData);
          addedCount++;
          
        } catch (taskError) {
          console.error('Error processing individual task:', taskError, task);
        }
      });
      
      console.log('Total tasks added:', addedCount);
      console.log('New timetable state after:', Array.from(newTimetable.entries()));
      
      if (addedCount === 0) {
        toast.error('No tasks could be processed. Please check the console for errors.');
        return;
      }
      
      // Force state update
      setTimetable(newTimetable);
      
      console.log('Timetable state updated - should trigger re-render');
      toast.success(`Successfully added ${addedCount} AI-generated tasks to your calendar!`);
      
      // Force a small delay to ensure state update
      setTimeout(() => {
        console.log('Final timetable check:', Array.from(newTimetable.entries()).length, 'entries');
      }, 100);
      
    } catch (error) {
      console.error('Error in handleAITimetableGenerated:', error);
      toast.error('Failed to add AI tasks. Check console for details.');
    }
    
    console.log('=== AI TIMETABLE DEBUG END ===');
  };

  // Lazy load WeeklyTimeTable component
  const [WeeklyTimeTable, setWeeklyTimeTable] = useState(null);
  
  useEffect(() => {
    if (showWeeklyView && !WeeklyTimeTable) {
      import('./weekly-timetable').then((mod) => {
        setWeeklyTimeTable(() => mod.default);
      });
    }
  }, [showWeeklyView, WeeklyTimeTable]);

  if (showWeeklyView) {
    if (!WeeklyTimeTable) {
      return (
        <div className="container mx-auto p-4 min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading Weekly View...</div>
        </div>
      );
    }
    return (
      <WeeklyTimeTable 
        initialData={Array.from(timetable.entries()).map(([dateStr, data]) => ({
          id: data.id,
          date: new Date(dateStr),
          task: data.task,
          completed: data.completed
        }))}
        onBackToCalendar={() => setShowWeeklyView(false)}
      />
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-blue-700/20 p-3 rounded-2xl border border-blue-500/30">
              <CalendarIcon className="w-8 h-8 text-blue-400" />
              <ListTodo className="w-8 h-8 text-blue-400" />
              <CheckCircle className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Calendar Timetable
              </h1>
              <p className="text-gray-400 text-sm mt-1">Plan, Track, and Achieve Your Goals</p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={() => setShowAIPrompt(true)}
              className="text-lg py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white relative flex items-center gap-2 shadow-lg"
            >
              <Bot className="w-5 h-5" />
              <Sparkles className="w-4 h-4" />
              AI Study Planner
            </Button>
            <Button 
              onClick={async () => {
                // Manual test - add a task directly
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                const testTasks = [{
                  date: tomorrow,
                  task: '[9:00-10:30] TEST: Manual AI task',
                  completed: false,
                  aiGenerated: true,
                  difficulty: 'beginner',
                  resources: ['Test Resource']
                }];
                
                console.log('MANUAL TEST: Adding tasks', testTasks);
                await handleAITimetableGenerated(testTasks, { goal: 'Manual Test' });
              }}
              className="text-sm py-2 px-4 bg-red-600 hover:bg-red-700 text-white"
            >
              🔧 TEST
            </Button>
            <Button 
              onClick={() => {
                console.log('=== CURRENT TIMETABLE STATE ===');
                console.log('Timetable size:', timetable.size);
                console.log('All entries:', Array.from(timetable.entries()));
                toast.info(`Current timetable has ${timetable.size} tasks`);
              }}
              className="text-sm py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              📊 DEBUG
            </Button>
            <Button 
              onClick={() => setShowWeeklyView(true)}
              className="text-lg py-4 px-6 bg-purple-600 hover:bg-purple-700 text-white relative flex items-center gap-2"
            >
              <CalendarDays className="w-5 h-5" />
              Weekly View
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="text-lg py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white relative"
            >
              {isSaving ? (
                <>
                  <span className="opacity-0">Save All Changes</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                </>
              ) : (
                "Save All Changes"
              )}
            </Button>
          </div>
        </div>
      <div className="flex flex-col items-center max-w-4xl mx-auto">
        <div className="w-full mb-8">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-2xl w-full bg-[#F5DEB3] p-6 text-gray-800 mx-auto max-w-[480px] shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] border border-[#DEB887] backdrop-blur-sm"
            icons={{
              prev: () => <div className="text-white text-2xl">←</div>,
              next: () => <div className="text-white text-2xl">→</div>
            }}
            modifiers={{
              hasTask: (date) => timetable.has(date.toISOString()),
              completed: (date) => {
                const task = timetable.get(date.toISOString());
                return task?.completed || false;
              }
            }}
            modifiersStyles={{
              hasTask: { 
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                color: "white",
                fontWeight: "bold",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.5)"
              },
              completed: {
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "white",
                fontWeight: "bold",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.5)"
              }
            }}
            classNames={{
              day: "h-12 sm:h-16 w-12 sm:w-16 text-center text-sm sm:text-base p-0 relative hover:bg-[#DEB887] rounded-xl transition-all duration-200 font-medium text-gray-800 hover:scale-110 hover:shadow-lg",
              day_selected: "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-[0_8px_16px_rgba(37,_99,_235,_0.5)] rounded-xl scale-110",
              day_today: "bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold rounded-xl ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-800",
              head_cell: "text-gray-700 font-bold text-base sm:text-lg mb-4",
              cell: "h-12 sm:h-16 w-12 sm:w-16 p-0 relative",
              nav_button: "h-12 w-12 text-3xl hover:bg-[#DEB887] hover:scale-110 transition-all duration-200 rounded-xl flex items-center justify-center hover:shadow-lg backdrop-blur-sm text-gray-800",
              caption: "mb-6 flex justify-between items-center px-4",
              caption_label: "text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 text-center flex-grow",
              row: "flex justify-center gap-1 sm:gap-2 mb-2",
              months: "space-y-4"
            }}
          />
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-600" />
              <span className="text-sm sm:text-base text-gray-300">Has Task</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-600" />
              <span className="text-sm sm:text-base text-gray-300">Completed</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-800 rounded-lg p-4 sm:p-6">
          <h2 className="text-2xl font-bold text-center text-white mb-6">
            Tasks for {format(selectedDate, "MMMM d, yyyy")}
          </h2>
          
          {/* Show existing task for the selected date if any */}
          {timetable.get(selectedDate.toISOString()) && (
            <div className="mb-4">
              {timetable.get(selectedDate.toISOString()).aiGenerated && (
                <div className="flex items-center gap-2 mb-2 text-xs text-purple-400">
                  <Bot className="w-3 h-3" />
                  <span>AI Generated Task</span>
                  {timetable.get(selectedDate.toISOString()).difficulty && (
                    <span className="px-2 py-1 bg-purple-600/20 rounded text-xs">
                      {timetable.get(selectedDate.toISOString()).difficulty}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          {timetable.get(selectedDate.toISOString()) && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-white text-lg break-words">
                    {timetable.get(selectedDate.toISOString()).task}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <Checkbox
                      checked={timetable.get(selectedDate.toISOString())?.completed || false}
                      onCheckedChange={handleCompletedChange}
                      className="h-5 w-5 border-2 border-gray-600 text-blue-600"
                    />
                    <span className="text-base text-gray-300">Completed</span>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const dateKey = selectedDate.toISOString();
                    const task = timetable.get(dateKey);
                    if (task && task.id) {
                      handleDelete(dateKey, task.id);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Show input for new task only if there isn't one for the selected date */}
          {!timetable.get(selectedDate.toISOString()) && (
            <div className="space-y-4">
              <Textarea
                value={currentTask}
                onChange={(e) => handleTaskChange(e.target.value)}
                placeholder="Enter your task for this day..."
                className="min-h-[120px] text-base sm:text-lg p-4 rounded-lg bg-gray-700 border-2 border-gray-600 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 placeholder:text-gray-500 text-white w-full"
              />
              <Button 
                onClick={handleTaskSave}
                className="w-full sm:w-auto text-base sm:text-lg py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white relative"
                disabled={!currentTask.trim() || isAddingTask}
              >
                {isAddingTask ? (
                  <>
                    <span className="opacity-0">Save Task</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                  </>
                ) : (
                  "Save Task"
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Progress bar moved to bottom */}
        <div className="w-full bg-gray-800 rounded-lg p-4 mt-8">
          <div className="relative h-3 w-full bg-gray-700 rounded-full overflow-hidden">
            <Progress 
              value={progress}
              className="h-full bg-blue-600 transition-all"
            />
          </div>
          <p className="text-center mt-3 text-lg font-medium text-white">
            {Math.round(progress)}% Tasks Completed
          </p>
        </div>

        {/* View All Tasks Button */}
        <Button
          onClick={() => setShowAllTasks(!showAllTasks)}
          className="mt-6 text-lg py-4 px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-[0_8px_16px_rgba(37,_99,_235,_0.5)] transition-all duration-300 hover:scale-105 w-full sm:w-auto mx-auto flex items-center justify-center gap-3"
        >
          <ListTodo className="w-6 h-6" />
          {showAllTasks ? "Hide All Tasks" : "View All Tasks"}
        </Button>

        {/* All Tasks List */}
        {showAllTasks && (
          <div className="mt-8 w-full bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 mb-6">
              All Saved Tasks ({Array.from(timetable.entries()).filter(([, data]) => data.aiGenerated).length} AI Generated)
            </h2>
            {Array.from(timetable.entries()).map(([dateStr, data]) => (
              <div key={dateStr} className={`p-4 rounded-lg hover:bg-gray-600 transition-colors ${
                data.aiGenerated ? 'bg-gradient-to-r from-gray-700 to-purple-900/30 border border-purple-500/20' : 'bg-gray-700'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-blue-400">
                        {format(new Date(dateStr), "MMMM d, yyyy")}
                      </p>
                      {data.aiGenerated && (
                        <div className="flex items-center gap-1 text-xs text-purple-400">
                          <Bot className="w-3 h-3" />
                          <span>AI</span>
                          {data.difficulty && (
                            <span className="px-2 py-1 bg-purple-600/20 rounded">
                              {data.difficulty}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-white text-lg break-words">
                      {data.task}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <Checkbox
                        checked={data.completed}
                        onCheckedChange={(checked) => {
                          const newTimetable = new Map(timetable);
                          newTimetable.set(dateStr, {
                            ...data,
                            completed: checked
                          });
                          setTimetable(newTimetable);
                        }}
                        className="h-5 w-5 border-2 border-gray-600 text-blue-600"
                      />
                      <span className="text-base text-gray-300">Completed</span>
                    </div>
                    {data.resources && data.resources.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 mb-1">Resources:</p>
                        <div className="flex flex-wrap gap-1">
                          {data.resources.slice(0, 3).map((resource, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-600/20 text-xs text-blue-300 rounded">
                              {resource}
                            </span>
                          ))}
                          {data.resources.length > 3 && (
                            <span className="px-2 py-1 bg-gray-600 text-xs text-gray-300 rounded">
                              +{data.resources.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      if (data.id) {
                        handleDelete(dateStr, data.id);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      
      {/* AI Prompt Modal */}
      {showAIPrompt && (
        <AIPrompt 
          onTimetableGenerated={handleAITimetableGenerated}
          onClose={() => setShowAIPrompt(false)}
        />
      )}
    </div>
  );
}
