"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar as CalendarIcon, CheckCircle, ListTodo, CalendarDays } from 'lucide-react';

export default function TimeTable({ initialData }) {
  const { user, isLoaded } = useUser();
  // Compute a stable scope immediately to avoid dropping persistence before auth resolves
  const userScope = useMemo(() => {
    return user?.id || user?.primaryEmailAddress?.emailAddress || 'guest';
  }, [user?.id, user?.primaryEmailAddress?.emailAddress]);
  const keyFor = (suffix) => userScope ? `timetable:${userScope}:${suffix}` : null;
  const [timetable, setTimetable] = useState(new Map());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTask, setCurrentTask] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('9:00 AM - 10:00 AM');

  // Sync time slots when changed in another view/tab
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const onStorage = (e) => {
      const slotsKey = keyFor('time-slots');
      const renameKey = keyFor('slot-rename');
      if (!slotsKey || !renameKey) return;
      if (e.key === slotsKey && e.newValue) {
        try {
          const slots = JSON.parse(e.newValue);
          if (Array.isArray(slots)) {
            const normalized = applyRenameHistoryToList(slots);
            setTimeSlots(normalized);
            try { localStorage.setItem(slotsKey, JSON.stringify(normalized)); } catch {}
          }
        } catch {}
      }
      if (e.key === renameKey && e.newValue) {
        try {
          const { from, to } = JSON.parse(e.newValue);
          if (from && to && from !== to) {
            // Remap existing timetable keys using slot rename
            setTimetable(prev => {
              const remapped = new Map();
              for (const [key, value] of prev.entries()) {
                const [datePart, slot] = key.split('|');
                const newKey = slot === from ? `${datePart}|${to}` : key;
                remapped.set(newKey, { ...value, timeSlot: slot === from ? to : value.timeSlot });
              }
              return remapped;
            });
            if (selectedTimeSlot === from) setSelectedTimeSlot(to);
            // Ensure new slot exists in list
            setTimeSlots(prev => {
              const set = new Set(prev);
              if (!set.has(to)) return sortSlots([...prev, to]);
              return prev;
            });
            // Persist rename in slots storage
            try {
              const saved = JSON.parse(localStorage.getItem(slotsKey) || '[]');
              const updated = applyRenameHistoryToList(saved.map(s => (s === from ? to : s)));
              localStorage.setItem(slotsKey, JSON.stringify(updated));
            } catch {}
          }
        } catch {}
      }
    };
    const onCustom = (e) => {
      const { from, to } = (e.detail || {});
      if (from && to && from !== to) {
        setTimetable(prev => {
          const remapped = new Map();
          for (const [key, value] of prev.entries()) {
            const [datePart, slot] = key.split('|');
            const newKey = slot === from ? `${datePart}|${to}` : key;
            remapped.set(newKey, { ...value, timeSlot: slot === from ? to : value.timeSlot });
          }
          return remapped;
        });
        if (selectedTimeSlot === from) setSelectedTimeSlot(to);
        setTimeSlots(prev => {
          const set = new Set(prev);
          if (!set.has(to)) return sortSlots([...prev, to]);
          return prev;
        });
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('timetable-slot-rename', onCustom);
    // Listen for weekly view task changes to keep calendar state in sync
    const onTaskUpserted = (e) => {
      try {
        const { id, date, timeSlot, task, completed } = e?.detail || {};
        if (!date || !timeSlot) return;
        const d = new Date(date);
        const key = makeKey(d, timeSlot);
        setTimetable(prev => {
          const nt = new Map(prev);
          nt.set(key, { id, task, completed: !!completed, date: d, timeSlot });
          return nt;
        });
      } catch {}
    };
    const onTaskDeleted = (e) => {
      try {
        const { id } = e?.detail || {};
        if (!id) return;
        setTimetable(prev => {
          const nt = new Map(prev);
          for (const [k, v] of nt.entries()) {
            if (v.id === id) nt.delete(k);
          }
          return nt;
        });
      } catch {}
    };
    window.addEventListener('timetable-task-upserted', onTaskUpserted);
    window.addEventListener('timetable-task-deleted', onTaskDeleted);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('timetable-slot-rename', onCustom);
      window.removeEventListener('timetable-task-upserted', onTaskUpserted);
      window.removeEventListener('timetable-task-deleted', onTaskDeleted);
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  

  // Helpers to sort time slots chronologically by start time
  const toMinutes = (hh, mm, period) => {
    let h = parseInt(hh, 10);
    const m = parseInt(mm || '0', 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };
  const startMinutes = (slot) => {
    const start = String(slot).split('-')[0].trim();
    const match = start.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!match) return Number.MAX_SAFE_INTEGER;
    const [, hh, mm, ap] = match;
    const period = (ap || '').toUpperCase();
    if (!period) {
      const h = parseInt(hh, 10);
      const m = parseInt(mm || '0', 10);
      return h * 60 + m;
    }
    return toMinutes(hh, mm, period);
  };
  const sortSlots = (slots) => [...slots].sort((a, b) => startMinutes(a) - startMinutes(b));
  const applyRenameHistoryToList = (slots) => {
    try {
      const histKey = keyFor('slot-rename-history');
      const hist = JSON.parse((histKey && localStorage.getItem(histKey)) || '[]');
      const mapSlot = (s) => {
        let cur = s;
        for (let i = 0; i < hist.length; i++) {
          const m = hist[i];
          if (m && m.from === cur) cur = m.to;
        }
        return cur;
      };
      const mapped = slots.map(mapSlot);
      const deduped = Array.from(new Set(mapped));
      return sortSlots(deduped);
    } catch { return sortSlots(slots); }
  };
  const applyRenameHistoryToSlot = (slot) => {
    try {
      const histKey = keyFor('slot-rename-history');
      const hist = JSON.parse((histKey && localStorage.getItem(histKey)) || '[]');
      let cur = slot;
      for (let i = 0; i < hist.length; i++) {
        const m = hist[i];
        if (m && m.from === cur) cur = m.to;
      }
      return cur;
    } catch { return slot; }
  };

  // Helpers for composite keys (date + timeSlot)
  const getDatePart = (date) => new Date(date).toDateString();
  const makeKey = (date, slot) => `${getDatePart(date)}|${slot}`;
  const tasksForDate = (date) => {
    const d = getDatePart(date);
    return Array.from(timetable.entries())
      .filter(([key]) => key.startsWith(`${d}|`))
      .map(([key, value]) => ({ key, ...value }));
  };
  const getTaskFor = (date, slot) => timetable.get(makeKey(date, slot));
  const [isAddingTask, setIsAddingTask] = useState(false);
  // Track in-flight deletions per task id
  const [deletingIds, setDeletingIds] = useState({});
  // Prevent rapid double-submits before state updates
  const addLockRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  // Filters for All Saved Tasks
  const [taskFilterRange, setTaskFilterRange] = useState('all'); // all | today | last7 | next7 | thisMonth | lastMonth
  const [taskFilterStatus, setTaskFilterStatus] = useState('all'); // all | completed | incomplete
  const [taskSearch, setTaskSearch] = useState('');

  const dateFromKey = (key) => new Date(key.split('|')[0]);
  const allEntries = useMemo(() => Array.from(timetable.entries()), [timetable]);
  const filteredEntries = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startLast7 = new Date(startOfToday);
    startLast7.setDate(startOfToday.getDate() - 6);
    const endNext7 = new Date(endOfToday);
    endNext7.setDate(endOfToday.getDate() + 6);
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const inRange = (d) => {
      switch (taskFilterRange) {
        case 'today':
          return d >= startOfToday && d <= endOfToday;
        case 'last7':
          return d >= startLast7 && d <= endOfToday;
        case 'next7':
          return d >= startOfToday && d <= endNext7;
        case 'thisMonth':
          return d >= startThisMonth && d <= endNext7; // endNext7 is future but fine; month check below is cleaner
        case 'lastMonth':
          return d >= startLastMonth && d <= endLastMonth;
        case 'all':
        default:
          return true;
      }
    };

    return allEntries
      .filter(([key, data]) => {
        const d = dateFromKey(key);
        // Better month checks
        if (taskFilterRange === 'thisMonth') {
          if (!(d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth())) return false;
        } else if (taskFilterRange === 'lastMonth') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          if (!(d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth())) return false;
        } else if (!inRange(d)) {
          return false;
        }

        if (taskFilterStatus === 'completed' && !data.completed) return false;
        if (taskFilterStatus === 'incomplete' && data.completed) return false;

        if (q) {
          const name = (data.task || '').toLowerCase();
          if (!name.includes(q)) return false;
        }
        return true;
      })
      // optional sort: newest first
      .sort((a, b) => dateFromKey(b[0]) - dateFromKey(a[0]));
  }, [allEntries, taskFilterRange, taskFilterStatus, taskSearch]);
  
  // Default, fixed time slots (feature to add/remove was removed)
  const DEFAULT_TIME_SLOTS = [
    "9:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM", 
    "11:00 AM - 12:00 PM",
    "12:00 PM - 1:00 PM",
    "1:00 PM - 2:00 PM",
    "2:00 PM - 3:00 PM",
    "3:00 PM - 4:00 PM",
    "4:00 PM - 5:00 PM"
  ];
  // Get time slots from localStorage or use defaults - sync with weekly timetable
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);
  // Prevent overwriting saved slots with defaults on first mount
  const [slotsLoaded, setSlotsLoaded] = useState(false);

  // Keep a ref of latest timeSlots to compare in listeners without expanding deps
  const timeSlotsRef = useRef(timeSlots);
  useEffect(() => { timeSlotsRef.current = timeSlots; }, [timeSlots]);

  // Listen for time slot changes from weekly timetable (fallback)
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!userScope) return;
    const handleStorageChange = () => {
      const slotsKey = keyFor('time-slots');
      const saved = slotsKey ? localStorage.getItem(slotsKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const normalized = applyRenameHistoryToList(parsed);
          setTimeSlots(normalized);
          try { slotsKey && localStorage.setItem(slotsKey, JSON.stringify(normalized)); } catch {}
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userScope, isLoaded]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Ensure selectedTimeSlot is normalized and present after timeSlots changes
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    setSelectedTimeSlot(prev => {
      const normalized = applyRenameHistoryToSlot(prev);
      if (timeSlots.includes(normalized)) return normalized;
      return timeSlots[0] || normalized;
    });
  }, [timeSlots]);
  /* eslint-enable react-hooks/exhaustive-deps */
  const [showWeeklyView, setShowWeeklyView] = useState(() => {
    // Check URL or localStorage to maintain state on reload
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('view') === 'weekly';
    }
    return false;
  });

  // Calculate progress percentage
  const progress = useMemo(() => {
    if (timetable.size === 0) return 0;
    const completedTasks = Array.from(timetable.values()).filter(task => task.completed).length;
    return (completedTasks / timetable.size) * 100;
  }, [timetable]);

  // Update URL when view changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      if (showWeeklyView) {
        url.searchParams.set('view', 'weekly');
      } else {
        url.searchParams.delete('view');
      }
      window.history.replaceState({}, '', url);
    }
  }, [showWeeklyView]);

  // Handle browser back/forward navigation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.view === 'weekly') {
        setShowWeeklyView(true);
      } else {
        setShowWeeklyView(false);
      }
    };

    // Listen for browser back/forward events
    window.addEventListener('popstate', handlePopState);

    // Check initial URL state on component mount
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'weekly') {
      setShowWeeklyView(true);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      const taskMap = new Map();
      // Apply any rename history so tasks stay visible under the new slot names even after reload
      const applyRenameHistory = (slot) => {
        try {
          const histKey = keyFor('slot-rename-history');
          const hist = JSON.parse((histKey && localStorage.getItem(histKey)) || '[]');
          let current = slot;
          for (let i = 0; i < hist.length; i++) {
            const m = hist[i];
            if (m && m.from === current) current = m.to;
          }
          return current;
        } catch {
          return slot;
        }
      };
      initialData.forEach(item => {
        const datePart = getDatePart(item.date);
        const rawSlot = item.timeSlot || '9:00 AM - 10:00 AM';
        const slot = applyRenameHistory(rawSlot);
        // Ensure slot exists in timeSlots list
        setTimeSlots(prev => {
          const set = new Set(prev);
          if (!set.has(slot)) return sortSlots([...prev, slot]);
          return prev;
        });
        const key = `${datePart}|${slot}`;
        taskMap.set(key, {
          task: item.task,
          completed: item.completed,
          id: item.id,
          timeSlot: slot,
          date: new Date(item.date)
        });
      });
      setTimetable(taskMap);
    }
  }, [initialData, userScope]);
  /* eslint-enable react-hooks/exhaustive-deps */


  const handleDateSelect = (date) => {
    if (!date) return;
    setSelectedDate(date);
    // Prefer current slot if it exists; else auto-pick first occupied; else keep current
    const currentExists = !!getTaskFor(date, selectedTimeSlot);
    const dayTasks = tasksForDate(date);
    const nextSlot = currentExists
      ? selectedTimeSlot
      : (dayTasks[0]?.timeSlot || selectedTimeSlot);
    if (nextSlot !== selectedTimeSlot) setSelectedTimeSlot(nextSlot);
    const existingForSlot = getTaskFor(date, nextSlot);
    setCurrentTask(existingForSlot?.task || "");
  };

  const handleTaskChange = (task) => {
    setCurrentTask(task);
  };

  const handleTaskSave = async () => {
    if (!currentTask.trim()) return;
    if (addLockRef.current) return; // ignore rapid double-clicks
    
    setIsAddingTask(true);
    addLockRef.current = true;
    const dateKey = makeKey(selectedDate, selectedTimeSlot);
    
    try {
      const response = await fetch('/api/timetable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskName: currentTask,
          date: selectedDate.toISOString(),
          timeSlot: selectedTimeSlot,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', response.status, errorData);
        throw new Error(`Failed to save task: ${response.status} - ${errorData}`);
      }

      const newTask = await response.json();
      
      // Update local state (composite key per date+slot)
      setTimetable(prev => new Map(prev.set(dateKey, {
        id: newTask.id,
        task: currentTask,
        completed: false,
        date: selectedDate,
        timeSlot: selectedTimeSlot
      })));
      
      setCurrentTask('');
      // Do not auto-reset selectedTimeSlot; keep user's context
      toast.success('Task saved successfully!');
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task. Please try again.');
    } finally {
      setIsAddingTask(false);
      addLockRef.current = false;
    }
  };

  const handleCompletedChange = async (checked) => {
    const dateKey = makeKey(selectedDate, selectedTimeSlot);
    const existingTask = timetable.get(dateKey);
    if (!existingTask) return;

    // Update local state immediately for instant feedback
    setTimetable(prev => new Map(prev.set(dateKey, {
      ...existingTask,
      completed: checked
    })));

    // Update in database automatically
    try {
      const response = await fetch('/api/timetable', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: existingTask.id,
          isCompleted: checked,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Show success message
      toast.success(checked ? 'Task completed! 🎉' : 'Task marked as incomplete');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task. Please try again.');
      
      // Revert local state on error
      setTimetable(prev => new Map(prev.set(dateKey, {
        ...existingTask,
        completed: !checked
      })));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Only save tasks that don't have IDs yet (new tasks)
      const unsavedTasks = Array.from(timetable.entries())
        .filter(([_, data]) => !data.id)
        .map(([key, data]) => {
          const [datePart, slot] = key.split('|');
          return {
            taskName: data.task,
            date: new Date(datePart).toISOString(),
            timeSlot: slot,
          };
        });

      if (unsavedTasks.length === 0) {
        toast.success("All tasks are already saved!");
        return;
      }

      // Save each unsaved task
      for (const task of unsavedTasks) {
        const response = await fetch("/api/timetable", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(task),
        });

        if (!response.ok) {
          throw new Error("Failed to save task");
        }

        const savedTask = await response.json();
        
        // Update local state with saved task ID using composite key again
        const compositeKey = `${getDatePart(task.date)}|${task.timeSlot}`;
        setTimetable(prev => {
          const nt = new Map(prev);
          const existingTask = nt.get(compositeKey);
          if (existingTask) {
            nt.set(compositeKey, { ...existingTask, id: savedTask.id });
          }
          return nt;
        });
      }

      toast.success("All tasks saved successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to save tasks");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (dateKey, id) => {
    try {
      // mark this id as deleting
      setDeletingIds(prev => ({ ...prev, [id]: true }));
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
    } finally {
      // clear deleting state
      setDeletingIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
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

  // When switching to Weekly, broadcast current tasks so Weekly can hydrate instantly
  useEffect(() => {
    if (!showWeeklyView) return;
    try {
      const items = Array.from(timetable.entries()).map(([key, data]) => {
        const [datePart, timeSlot] = key.split('|');
        return {
          id: data.id,
          date: (data.date instanceof Date ? data.date : new Date(data.date)).toISOString(),
          timeSlot,
          task: data.task,
          completed: !!data.completed,
        };
      });
      window.dispatchEvent(new CustomEvent('timetable-bulk-sync', { detail: { items, source: 'calendar' } }));
    } catch {}
  }, [showWeeklyView, timetable]);

  // Handshake: if Weekly mounts after our initial broadcast, respond to its signal by rebroadcasting
  useEffect(() => {
    const rebroadcast = () => {
      try {
        const items = Array.from(timetable.entries()).map(([key, data]) => {
          const [datePart, timeSlot] = key.split('|');
          return {
            id: data.id,
            date: (data.date instanceof Date ? data.date : new Date(data.date)).toISOString(),
            timeSlot,
            task: data.task,
            completed: !!data.completed,
          };
        });
        window.dispatchEvent(new CustomEvent('timetable-bulk-sync', { detail: { items, source: 'calendar' } }));
      } catch {}
    };
    window.addEventListener('weekly-mounted', rebroadcast);
    return () => window.removeEventListener('weekly-mounted', rebroadcast);
  }, [timetable]);

  // Persist per-user bulk snapshot so Weekly can hydrate on mount without relying on events
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    try {
      const bulkKey = keyFor('bulk');
      if (!bulkKey) return;
      const items = Array.from(timetable.entries()).map(([key, data]) => {
        const [datePart, timeSlot] = key.split('|');
        return {
          id: data.id,
          date: (data.date instanceof Date ? data.date : new Date(data.date)).toISOString(),
          timeSlot,
          task: data.task,
          completed: !!data.completed,
        };
      });
      localStorage.setItem(bulkKey, JSON.stringify(items));
    } catch {}
  }, [userScope, timetable]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Persist current timeSlots whenever they change (normalized) AFTER we've loaded them
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!slotsLoaded) return;
    try {
      const slotsKey = keyFor('time-slots');
      if (!slotsKey) return;
      const saved = JSON.parse(localStorage.getItem(slotsKey) || '[]');
      const union = Array.isArray(saved) ? Array.from(new Set([...saved, ...timeSlots])) : [...timeSlots];
      const normalized = applyRenameHistoryToList(union);
      localStorage.setItem(slotsKey, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent('timetable-time-slots-updated', { detail: { slots: normalized, source: 'calendar' } }));
    } catch {}
  }, [timeSlots, userScope, slotsLoaded]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Rehydrate per-user time slots and tasks when user changes or on mount
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!userScope) return;
    // 1) Load time slots from per-user localStorage or bootstrap defaults
    try {
      const slotsKey = keyFor('time-slots');
      const saved = slotsKey ? localStorage.getItem(slotsKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge any 'guest' slots into the current user scope to capture slots added before auth/navigation
        let baseList = Array.isArray(parsed) ? parsed : [
          "9:00 AM - 10:00 AM",
          "10:00 AM - 11:00 AM",
          "11:00 AM - 12:00 PM",
          "12:00 PM - 1:00 PM",
          "1:00 PM - 2:00 PM",
          "2:00 PM - 3:00 PM",
          "3:00 PM - 4:00 PM",
          "4:00 PM - 5:00 PM",
        ];
        try {
          const guestKey = `timetable:guest:time-slots`;
          const guestSaved = localStorage.getItem(guestKey);
          if (guestSaved) {
            const guestParsed = JSON.parse(guestSaved);
            if (Array.isArray(guestParsed)) {
              baseList = Array.from(new Set([ ...baseList, ...guestParsed ]));
            }
          }
        } catch {}
        const normalized = applyRenameHistoryToList(baseList);
        setTimeSlots(normalized);
        try { slotsKey && localStorage.setItem(slotsKey, JSON.stringify(normalized)); } catch {}
        // Ensure selected time slot is valid under this user
        setSelectedTimeSlot(prev => {
          const normPrev = applyRenameHistoryToSlot(prev);
          if (normalized.includes(normPrev)) return normPrev;
          return normalized[0] || '9:00 AM - 10:00 AM';
        });
        setSlotsLoaded(true);
      } else {
        // Migration: if current scope has no slots yet, but 'guest' scope does, adopt them
        const guestKey = `timetable:guest:time-slots`;
        const guestSaved = localStorage.getItem(guestKey);
        if (guestSaved) {
          const parsed = JSON.parse(guestSaved);
          if (Array.isArray(parsed)) {
            const normalized = applyRenameHistoryToList(parsed);
            setTimeSlots(normalized);
            try { slotsKey && localStorage.setItem(slotsKey, JSON.stringify(normalized)); } catch {}
            setSelectedTimeSlot(normalized[0] || '9:00 AM - 10:00 AM');
            setSlotsLoaded(true);
          }
        } else {
          const defaults = applyRenameHistoryToList([
            "9:00 AM - 10:00 AM",
            "10:00 AM - 11:00 AM",
            "11:00 AM - 12:00 PM",
            "12:00 PM - 1:00 PM",
            "1:00 PM - 2:00 PM",
            "2:00 PM - 3:00 PM",
            "3:00 PM - 4:00 PM",
            "4:00 PM - 5:00 PM",
          ]);
          setTimeSlots(defaults);
          try { const slotsKey2 = keyFor('time-slots'); slotsKey2 && localStorage.setItem(slotsKey2, JSON.stringify(defaults)); } catch {}
          setSelectedTimeSlot(defaults[0] || '9:00 AM - 10:00 AM');
          setSlotsLoaded(true);
        }
      }
    } catch (error) {
      console.error(error);
    }

    // 2) Fetch tasks for this user from API and hydrate timetable
    (async () => {
      try {
        const res = await fetch('/api/timetable');
        if (!res.ok) return; // if unauthorized or no data, keep empty
        const items = await res.json();
        const map = new Map();
        const slotsInDataSet = new Set();
        items.forEach(item => {
          const date = new Date(item.date);
          const datePart = getDatePart(date);
          const slot = applyRenameHistoryToSlot(item.timeSlot || '9:00 AM - 10:00 AM');
          slotsInDataSet.add(slot);
          const key = `${datePart}|${slot}`;
          map.set(key, { id: item.id, task: item.task, completed: item.completed, date, timeSlot: slot });
        });
        setTimetable(map);
        // Prune time slots: keep only defaults + those referenced by tasks
        try {
          const allowed = sortSlots(applyRenameHistoryToList(Array.from(new Set([ ...DEFAULT_TIME_SLOTS, ...Array.from(slotsInDataSet) ]))));
          const current = timeSlotsRef.current || [];
          const same = allowed.length === current.length && allowed.every((v, i) => v === current[i]);
          if (!same) {
            setTimeSlots(allowed);
            const slotsKey = keyFor('time-slots');
            if (slotsKey) localStorage.setItem(slotsKey, JSON.stringify(allowed));
            window.dispatchEvent(new CustomEvent('timetable-time-slots-updated', { detail: { slots: allowed, source: 'calendar' } }));
          }
        } catch {}
        // Broadcast hydrated tasks for Weekly to consume if mounted
        try {
          const broadcast = items.map(item => ({
            id: item.id,
            date: new Date(item.date).toISOString(),
            timeSlot: applyRenameHistoryToSlot(item.timeSlot || '9:00 AM - 10:00 AM'),
            task: item.task,
            completed: item.completed,
          }));
          window.dispatchEvent(new CustomEvent('timetable-bulk-sync', { detail: { items: broadcast, source: 'calendar' } }));
        } catch {}
      } catch {}
    })();
  }, [userScope, isLoaded]);
  /* eslint-enable react-hooks/exhaustive-deps */

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
        initialData={Array.from(timetable.entries()).map(([key, data]) => {
          const [, timeSlot] = key.split('|');
          return {
            id: data.id,
            // Use the original Date object to avoid timezone parsing shifts
            date: data.date instanceof Date ? data.date : new Date(data.date),
            task: data.task,
            completed: data.completed,
            timeSlot,
          };
        })}
        onBackToCalendar={() => {
          setShowWeeklyView(false);
          // Refresh local timeSlots from localStorage when returning
          try {
            const slotsKey = keyFor('time-slots');
            const renameKey = keyFor('slot-rename');
            const saved = slotsKey ? localStorage.getItem(slotsKey) : null;
            if (saved) {
              const slots = JSON.parse(saved);
              if (Array.isArray(slots)) {
                const normalized = applyRenameHistoryToList(slots);
                setTimeSlots(normalized);
                try { slotsKey && localStorage.setItem(slotsKey, JSON.stringify(normalized)); } catch {}
              }
            }
            const rename = renameKey ? localStorage.getItem(renameKey) : null;
            if (rename) {
              const { from, to } = JSON.parse(rename);
              if (from && to && from !== to) {
                setTimetable(prev => {
                  const remapped = new Map();
                  for (const [key, value] of prev.entries()) {
                    const [datePart, slot] = key.split('|');
                    const newKey = slot === from ? `${datePart}|${to}` : key;
                    remapped.set(newKey, { ...value, timeSlot: slot === from ? to : value.timeSlot });
                  }
                  return remapped;
                });
                if (selectedTimeSlot === from) setSelectedTimeSlot(to);
              }
              renameKey && localStorage.removeItem(renameKey);
            }
          } catch {}
          // Update URL when going back to calendar view
          const currentUrl = new URL(window.location);
          currentUrl.searchParams.delete('view');
          window.history.pushState({ view: 'calendar' }, '', currentUrl);
        }}
      />
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-2 sm:px-0">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-800/30 to-blue-900/30 p-2 sm:p-3 rounded-2xl border border-blue-600/50">
                <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-300" />
                <ListTodo className="w-6 h-6 sm:w-8 sm:h-8 text-blue-300" />
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-300" />
            </div>
            <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent">
                Calendar Timetable
              </h1>
                <p className="text-blue-200 text-xs sm:text-sm mt-1">Plan, Track, and Achieve Your Goals</p>
            </div>
          </div>
          <div className="flex justify-center">
            <Button
              onClick={() => setShowWeeklyView(true)}
              className="text-sm sm:text-base lg:text-lg py-2 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 text-white flex items-center gap-2 sm:gap-3 shadow-lg"
            >
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              <span className="hidden sm:block">Weekly View</span>
              <span className="sm:hidden">Weekly</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center max-w-4xl mx-auto">
        <div className="w-full mb-6 sm:mb-8">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="mx-auto max-w-xs sm:max-w-sm md:max-w-md"
            modifiers={{
              hasTask: (date) => tasksForDate(date).length > 0,
              completed: (date) => tasksForDate(date).some(t => t.completed)
            }}
            modifiersClassNames={{
              hasTask: "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 font-semibold shadow-md",
              completed: "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 font-semibold shadow-md"
            }}
          />
          <div className="flex justify-center gap-3 sm:gap-6 mt-4 sm:mt-6 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
              <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-blue-500 shadow-sm" />
              <span className="text-xs sm:text-sm font-medium text-blue-200">Has Task</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
              <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-green-500 shadow-sm" />
              <span className="text-xs sm:text-sm font-medium text-blue-200">Completed</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-blue-700/50 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-center text-white mb-4 sm:mb-6 border-b border-blue-700/50 pb-3 sm:pb-4">
            Tasks for {format(selectedDate, "MMMM d, yyyy")}
          </h2>
          
          {getTaskFor(selectedDate, selectedTimeSlot) && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-5 bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-xl border border-blue-600/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Time Slot Display */}
                  <div className="mb-3 sm:mb-4">
                    <div className="inline-flex items-center gap-2 bg-blue-700/50 px-3 py-1 rounded-full border border-blue-500/50">
                      <CalendarIcon className="w-4 h-4 text-blue-300" />
                      <span className="text-sm font-medium text-blue-200">
                        {getTaskFor(selectedDate, selectedTimeSlot)?.timeSlot || selectedTimeSlot}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-700/50 p-3 sm:p-4 rounded-lg shadow-sm border border-blue-600/30 mb-3 sm:mb-4">
                    <p className="text-white text-sm sm:text-base lg:text-lg break-words leading-relaxed">
                      {getTaskFor(selectedDate, selectedTimeSlot)?.task}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <Checkbox
                      checked={getTaskFor(selectedDate, selectedTimeSlot)?.completed || false}
                      onCheckedChange={handleCompletedChange}
                      className="h-5 w-5 border-2 border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <span className="text-base text-gray-300">Completed</span>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const dateKey = makeKey(selectedDate, selectedTimeSlot);
                    const task = timetable.get(dateKey);
                    if (task && task.id) {
                      handleDelete(dateKey, task.id);
                    }
                  }}
                  disabled={(() => { const task = timetable.get(makeKey(selectedDate, selectedTimeSlot)); return task && deletingIds[task.id]; })()}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-3 py-2 rounded-lg shadow-lg transition-all duration-200 disabled:opacity-60"
                >
                  {(() => {
                    const task = timetable.get(makeKey(selectedDate, selectedTimeSlot));
                    return task && deletingIds[task.id] ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </div>
                    ) : 'Delete';
                  })()}
                </Button>
              </div>
            </div>
          )}

          {/* Show input for new task - always show time slot selection */}
          <div className="space-y-4 sm:space-y-6">
            {/* Time Slot Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-200">Select Time Slot</label>
              <select
                value={selectedTimeSlot}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedTimeSlot(val);
                  const t = getTaskFor(selectedDate, val);
                  setCurrentTask(t?.task || "");
                }}
                className="w-full p-3 rounded-xl bg-slate-800 text-white border-2 border-blue-600/70 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 text-sm sm:text-base appearance-none"
              >
{timeSlots.map((slot) => {
                  const occupied = timetable.has(makeKey(selectedDate, slot));
                  return (
                    <option key={slot} value={slot}>
                      {slot} {occupied ? '• Occupied' : '• Free'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Show task input only if selected slot is not taken */}
            {!timetable.has(makeKey(selectedDate, selectedTimeSlot)) && (
              <>
                {/* Task Input */}
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-blue-200">Task Description</label>
                  <Textarea
                    value={currentTask}
                    onChange={(e) => handleTaskChange(e.target.value)}
                    placeholder="What would you like to accomplish on this day?"
                    className="min-h-[120px] sm:min-h-[140px] text-sm sm:text-base p-3 sm:p-4 rounded-xl bg-slate-700/50 border-2 border-blue-600/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 placeholder:text-blue-300 text-white w-full resize-none shadow-sm transition-all duration-200"
                  />
                  <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 text-xs text-blue-300">
                    {currentTask.length}/500
                  </div>
                </div>
                <Button 
                  onClick={handleTaskSave}
                  className="w-full text-sm sm:text-base py-2 sm:py-3 px-4 sm:px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                  disabled={!currentTask.trim() || isAddingTask}
                >
                  {isAddingTask ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding Task...
                    </>
                  ) : (
                    'Add Task'
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress bar moved to bottom */}
        <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-blue-700/50 p-4 sm:p-6 mt-6 sm:mt-8">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-center">Progress Overview</h3>
          <div className="relative h-3 sm:h-4 w-full bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg font-medium text-white">
            {Math.round(progress)}% Tasks Completed
          </p>
          <div className="flex justify-center mt-2">
            <span className="text-xs sm:text-sm text-blue-300">
              {Array.from(timetable.values()).filter(item => item.completed).length} of {timetable.size} tasks done
            </span>
          </div>
        </div>

        {/* View All Tasks Button */}
        <Button
          onClick={() => setShowAllTasks(!showAllTasks)}
          className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg py-3 sm:py-4 px-6 sm:px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full sm:w-auto mx-auto flex items-center justify-center gap-2 sm:gap-3"
        >
          <ListTodo className="w-5 h-5 sm:w-6 sm:h-6" />
          {showAllTasks ? "Hide All Tasks" : "View All Tasks"}
        </Button>

        {/* All Tasks List */}
        {showAllTasks && (
          <div className="mt-6 sm:mt-8 w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-blue-700/50 p-4 sm:p-6 space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500 mb-4 sm:mb-6">
              All Saved Tasks
            </h2>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <select
                value={taskFilterRange}
                onChange={(e) => setTaskFilterRange(e.target.value)}
                className="w-full sm:w-1/3 p-3 rounded-xl bg-slate-800 text-white border-2 border-blue-600/70 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 text-sm appearance-none"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="last7">Last 7 Days</option>
                <option value="next7">Next 7 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
              </select>
              <select
                value={taskFilterStatus}
                onChange={(e) => setTaskFilterStatus(e.target.value)}
                className="w-full sm:w-1/4 p-3 rounded-xl bg-slate-800 text-white border-2 border-blue-600/70 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 text-sm appearance-none"
              >
                <option value="all">All (Progress)</option>
                <option value="completed">Completed</option>
                <option value="incomplete">Incomplete</option>
              </select>
              <Input
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Search by task name..."
                className="w-full sm:flex-1 bg-slate-800 text-white border-2 border-blue-600/70 focus-visible:ring-blue-500/20 placeholder:text-blue-300"
              />
            </div>
            {filteredEntries.map(([key, data]) => {
              const [datePart, slot] = key.split('|');
              return (
              <div key={key} className="p-4 rounded-lg hover:bg-gray-600 transition-colors bg-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-blue-400">
                        {format(new Date(datePart), "MMMM d, yyyy")} • <span className="text-blue-300">{slot}</span>
                      </p>
                    </div>
                    <p className="text-white text-lg break-words">
                      {data.task}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <Checkbox
                        checked={data.completed}
                        onCheckedChange={(checked) => {
                          const newTimetable = new Map(timetable);
                          newTimetable.set(key, {
                            ...data,
                            completed: checked
                          });
                          setTimetable(newTimetable);
                        }}
                        className="h-5 w-5 border-2 border-gray-600 text-blue-600"
                      />
                      <span className="text-base text-gray-300">Completed</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (data.id) {
                        handleDelete(key, data.id);
                      }
                    }}
                    disabled={!!deletingIds[data.id]}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 disabled:opacity-60"
                  >
                    {deletingIds[data.id] ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </div>
                    ) : 'Delete'}
                  </Button>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
