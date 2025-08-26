"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';

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

export default function WeeklyTimeTable({ initialData, onBackToCalendar }) {
  const { user, isLoaded } = useUser();
  // Compute immediately so slot persistence does not get written under a null scope
  const userScope = useMemo(() => {
    return user?.id || user?.primaryEmailAddress?.emailAddress || 'guest';
  }, [user?.id, user?.primaryEmailAddress?.emailAddress]);
  const keyFor = (suffix) => userScope ? `timetable:${userScope}:${suffix}` : null;
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date()));
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [weeklyTasks, setWeeklyTasks] = useState(new Map());
  const [selectedTask, setSelectedTask] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  // Editing an existing time slot
  const [editingSlotIndex, setEditingSlotIndex] = useState(null);
  const [editingSlotValue, setEditingSlotValue] = useState("");

  // Keep a ref of latest timeSlots to avoid adding it to effect deps (prevents dep array size changes)
  const timeSlotsRef = useRef(timeSlots);
  useEffect(() => { timeSlotsRef.current = timeSlots; }, [timeSlots]);

  // Helpers to sort time slots chronologically by start time
  const toMinutes = (hh, mm, period) => {
    let h = parseInt(hh, 10);
    const m = parseInt(mm || '0', 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };
  const startMinutes = (slot) => {
    // Expect formats like "9:00 AM - 10:00 AM" or "5:00 AM - 6:00"
    const start = String(slot).split('-')[0].trim();
    const match = start.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!match) return Number.MAX_SAFE_INTEGER; // unknown format goes to end
    const [, hh, mm, ap] = match;
    const period = (ap || '').toUpperCase();
    // If no AM/PM, assume 24h-like input: treat as HH:MM
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
      // dedupe
      const deduped = Array.from(new Set(mapped));
      return sortSlots(deduped);
    } catch { return sortSlots(slots); }
  };

  // Load time slots from localStorage with migration from 'guest' scope
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const slotsKey = keyFor('time-slots');
    if (!slotsKey) return;
    const savedSlots = localStorage.getItem(slotsKey);
    if (savedSlots) {
      const parsed = JSON.parse(savedSlots);
      const normalized = Array.isArray(parsed) ? applyRenameHistoryToList(parsed) : DEFAULT_TIME_SLOTS;
      setTimeSlots(normalized);
      localStorage.setItem(slotsKey, JSON.stringify(normalized));
      try { window.dispatchEvent(new CustomEvent('timetable-time-slots-updated', { detail: { slots: normalized, source: 'weekly' } })); } catch {}
      setSlotsLoaded(true);
    } else {
      // Migration: adopt guest slots if present; else bootstrap defaults
      const guestKey = `timetable:guest:time-slots`;
      const guestSaved = localStorage.getItem(guestKey);
      if (guestSaved) {
        try {
          const parsed = JSON.parse(guestSaved);
          if (Array.isArray(parsed)) {
            const normalized = applyRenameHistoryToList(parsed);
            setTimeSlots(normalized);
            localStorage.setItem(slotsKey, JSON.stringify(normalized));
            try { window.dispatchEvent(new CustomEvent('timetable-time-slots-updated', { detail: { slots: normalized, source: 'weekly' } })); } catch {}
            setSlotsLoaded(true);
            return;
          }
        } catch {}
      }
      const normalized = applyRenameHistoryToList(DEFAULT_TIME_SLOTS);
      localStorage.setItem(slotsKey, JSON.stringify(normalized));
      setTimeSlots(normalized);
      try { window.dispatchEvent(new CustomEvent('timetable-time-slots-updated', { detail: { slots: normalized, source: 'weekly' } })); } catch {}
      setSlotsLoaded(true);
    }
  }, [userScope]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Handshake: notify Calendar that Weekly mounted so it can rebroadcast data
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent('weekly-mounted', { detail: { source: 'weekly' } })); } catch {}
  }, [userScope]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Same-tab hydration: listen for bulk timetable sync from Calendar
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const onBulk = (e) => {
      if (!e?.detail?.items) return;
      try {
        const items = Array.isArray(e.detail.items) ? e.detail.items : [];
        const taskMap = new Map();
        const ensureSlotSet = new Set(timeSlotsRef.current || []);
        items.forEach(item => {
          const dateKey = format(new Date(item.date), 'yyyy-MM-dd');
          if (!taskMap.has(dateKey)) taskMap.set(dateKey, []);
          const slot = item.timeSlot || '9:00 AM - 10:00 AM';
          taskMap.get(dateKey).push({ id: item.id, task: item.task, completed: !!item.completed, timeSlot: slot });
          ensureSlotSet.add(slot);
        });
        setWeeklyTasks(taskMap);
        const nextSlots = applyRenameHistoryToList(Array.from(ensureSlotSet));
        // Only update if changed
        const current = timeSlotsRef.current || [];
        const same = nextSlots.length === current.length && nextSlots.every((v, i) => v === current[i]);
        if (!same) {
          setTimeSlots(nextSlots);
          const slotsKey = keyFor('time-slots');
          if (slotsKey) {
            const saved = JSON.parse(localStorage.getItem(slotsKey) || '[]');
            const union = Array.isArray(saved) ? Array.from(new Set([...saved, ...nextSlots])) : [...nextSlots];
            const normalized = applyRenameHistoryToList(union);
            localStorage.setItem(slotsKey, JSON.stringify(normalized));
            try { window.dispatchEvent(new CustomEvent('timetable-time-slots-updated', { detail: { slots: normalized, source: 'weekly' } })); } catch {}
          }
        }
      } catch {}
    };
    window.addEventListener('timetable-bulk-sync', onBulk);
    return () => window.removeEventListener('timetable-bulk-sync', onBulk);
  }, [userScope]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Same-tab sync: listen for custom event when calendar updates slots
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const onCustom = (e) => {
      if (e?.detail?.source === 'weekly') return; // ignore our own broadcasts to avoid loops
      const slots = e?.detail?.slots;
      if (Array.isArray(slots)) {
        const normalized = applyRenameHistoryToList(slots);
        // Only update if changed to prevent ping-pong loops; compare with ref to keep deps stable
        const current = timeSlotsRef.current || [];
        const same = normalized.length === current.length && normalized.every((v, i) => v === current[i]);
        if (!same) setTimeSlots(normalized);
      }
    };
    window.addEventListener('timetable-time-slots-updated', onCustom);
    return () => window.removeEventListener('timetable-time-slots-updated', onCustom);
  }, [userScope]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Keep weekly view in sync if another page updates time slots (storage events)
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const slotsKey = keyFor('time-slots');
    if (!slotsKey) return;
    const onStorage = (e) => {
      if (e.key === slotsKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            const normalized = applyRenameHistoryToList(parsed);
            setTimeSlots(normalized);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userScope]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Save time slots to localStorage
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!slotsLoaded) return; // avoid overwriting saved slots with defaults on first mount
    const slotsKey = keyFor('time-slots');
    if (!slotsKey) return;
    const saved = JSON.parse(localStorage.getItem(slotsKey) || '[]');
    const union = Array.isArray(saved) ? Array.from(new Set([...saved, ...timeSlots])) : [...timeSlots];
    const normalized = applyRenameHistoryToList(union);
    localStorage.setItem(slotsKey, JSON.stringify(normalized));
    try { window.dispatchEvent(new CustomEvent('timetable-time-slots-updated', { detail: { slots: normalized, source: 'weekly' } })); } catch {}
  }, [timeSlots, slotsLoaded, userScope]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Load initial data
  // Hydrate from initialData once per userScope change; avoid looping on timeSlots changes
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      const taskMap = new Map();
      const applyRenameHistory = (slot) => {
        try {
          const histKey = keyFor('slot-rename-history');
          const hist = JSON.parse((histKey && localStorage.getItem(histKey)) || '[]');
          let current = slot;
          // Resolve chain of renames
          for (let i = 0; i < hist.length; i++) {
            const m = hist[i];
            if (m && m.from === current) current = m.to;
          }
          return current;
        } catch { return slot; }
      };
      const slotsInData = new Set();
      initialData.forEach(item => {
        const dateKey = format(new Date(item.date), 'yyyy-MM-dd');
        if (!taskMap.has(dateKey)) {
          taskMap.set(dateKey, []);
        }
        const normalizedSlot = applyRenameHistory(item.timeSlot || timeSlots[0])
        taskMap.get(dateKey).push({
          id: item.id,
          task: item.task,
          completed: item.completed,
          timeSlot: normalizedSlot
        });
        slotsInData.add(normalizedSlot);
      });
      setWeeklyTasks(taskMap);
      // Prune/persist: only defaults + slots referenced by tasks
      try {
        const allowed = sortSlots(applyRenameHistoryToList(Array.from(new Set([ ...DEFAULT_TIME_SLOTS, ...Array.from(slotsInData) ]))));
        // Only update if changed to avoid loops
        const current = timeSlotsRef.current || [];
        const same = allowed.length === current.length && allowed.every((v, i) => v === current[i]);
        if (!same) setTimeSlots(allowed);
        const slotsKey = keyFor('time-slots');
        if (slotsKey) {
          localStorage.setItem(slotsKey, JSON.stringify(allowed));
          try { window.dispatchEvent(new CustomEvent('timetable-time-slots-updated', { detail: { slots: allowed, source: 'weekly' } })); } catch {}
        }
      } catch {}
    }
  }, [initialData, userScope]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Fallback: if initialData is empty (e.g., navigated directly to weekly or came back from another page),
  // fetch tasks from API and hydrate weeklyTasks + ensure slots exist
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!userScope) return;
    if (initialData && initialData.length > 0) return; // parent already provided
    (async () => {
      try {
        const res = await fetch('/api/timetable');
        if (!res.ok) return;
        const items = await res.json();
        const taskMap = new Map();
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
          } catch { return slot; }
        };
        const slotsInData = new Set();
        items.forEach(item => {
          const dateKey = format(new Date(item.date), 'yyyy-MM-dd');
          const slot = applyRenameHistory(item.timeSlot || '9:00 AM - 10:00 AM');
          if (!taskMap.has(dateKey)) taskMap.set(dateKey, []);
          taskMap.get(dateKey).push({ id: item.id, task: item.task, completed: item.completed, timeSlot: slot });
          slotsInData.add(slot);
        });
        setWeeklyTasks(taskMap);
        // Prune/persist: only defaults + slots referenced by tasks
        const allowed = sortSlots(applyRenameHistoryToList(Array.from(new Set([ ...DEFAULT_TIME_SLOTS, ...Array.from(slotsInData) ]))));
        // Only update if changed to avoid loops
        const current = timeSlotsRef.current || [];
        const same = allowed.length === current.length && allowed.every((v, i) => v === current[i]);
        if (!same) setTimeSlots(allowed);
        const slotsKey = keyFor('time-slots');
        if (slotsKey) {
          localStorage.setItem(slotsKey, JSON.stringify(allowed));
          try { window.dispatchEvent(new CustomEvent('timetable-time-slots-updated', { detail: { slots: allowed, source: 'weekly' } })); } catch {}
        }
      } catch {}
    })();
  }, [initialData, userScope]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  // Add/Remove slot features are disabled by request; only editing is allowed

  const removeTimeSlot = (index) => {
    if (timeSlots.length <= 1) {
      toast.error("Must have at least one time slot");
      return;
    }
    const slot = timeSlots[index];
    // Prevent deleting a slot that currently has tasks
    try {
      for (const [, tasks] of weeklyTasks.entries()) {
        if (Array.isArray(tasks) && tasks.some(t => t.timeSlot === slot)) {
          toast.error('Cannot delete a time slot that has tasks. Rename it or move tasks first.');
          return;
        }
      }
    } catch {}
    const newSlots = timeSlots.filter((_, i) => i !== index);
    setTimeSlots(newSlots);
    try {
      const slotsKey = keyFor('time-slots');
      if (!slotsKey) return;
      const saved = JSON.parse(localStorage.getItem(slotsKey) || '[]');
      const union = Array.isArray(saved) ? Array.from(new Set([...saved, ...newSlots])) : [...newSlots];
      const normalized = applyRenameHistoryToList(union);
      localStorage.setItem(slotsKey, JSON.stringify(normalized));
      try { window.dispatchEvent(new CustomEvent('timetable-time-slots-updated', { detail: { slots: normalized, source: 'weekly' } })); } catch {}
    } catch {}
    toast.success("Time slot removed!");
  };

  const startEditSlot = (index) => {
    setEditingSlotIndex(index);
    setEditingSlotValue(timeSlots[index]);
  };

  const cancelEditSlot = () => {
    setEditingSlotIndex(null);
    setEditingSlotValue("");
  };

  const saveEditSlot = () => {
    if (editingSlotIndex === null) return;
    const trimmed = editingSlotValue.trim();
    if (!trimmed) {
      toast.error('Time slot cannot be empty');
      return;
    }
    const oldValue = timeSlots[editingSlotIndex];
    if (oldValue === trimmed) {
      cancelEditSlot();
      return;
    }
    // Update slots and keep them sorted
    const updatedSlots = sortSlots(timeSlots.map((s, i) => i === editingSlotIndex ? trimmed : s));
    setTimeSlots(updatedSlots);
    try {
      const slotsKey = keyFor('time-slots');
      if (!slotsKey) return;
      const saved = JSON.parse(localStorage.getItem(slotsKey) || '[]');
      const union = Array.isArray(saved) ? Array.from(new Set([...saved, ...updatedSlots])) : [...updatedSlots];
      const normalized = applyRenameHistoryToList(union);
      localStorage.setItem(slotsKey, JSON.stringify(normalized));
      try { window.dispatchEvent(new CustomEvent('timetable-time-slots-updated', { detail: { slots: normalized, source: 'weekly' } })); } catch {}
    } catch {}
    // Remap tasks that referenced the old slot to the new slot and persist to backend
    setWeeklyTasks(prev => {
      const newMap = new Map(prev);
      const updates = [];
      for (const [dateKey, tasks] of newMap.entries()) {
        const updated = tasks.map(t => {
          if (t.timeSlot === oldValue) {
            if (t.id) {
              updates.push({ id: t.id, to: trimmed });
            }
            return { ...t, timeSlot: trimmed };
          }
          return t;
        });
        newMap.set(dateKey, updated);
      }
      // Fire-and-forget persist requests
      if (updates.length > 0) {
        Promise.allSettled(
          updates.map(u => fetch('/api/timetable', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: u.id, timeSlot: trimmed })
          }))
        ).then(() => {
          // no-op; best-effort persistence
        }).catch(() => {});
      }
      return newMap;
    });
    // Notify other views (Calendar) about the rename so they can remap their keys
    try {
      const renameKey = keyFor('slot-rename');
      const histKey = keyFor('slot-rename-history');
      if (renameKey) localStorage.setItem(renameKey, JSON.stringify({ from: oldValue, to: trimmed, at: Date.now() }));
      const hist = JSON.parse((histKey && localStorage.getItem(histKey)) || '[]');
      hist.push({ from: oldValue, to: trimmed, at: Date.now() });
      histKey && localStorage.setItem(histKey, JSON.stringify(hist));
      // Same-tab sync via custom event
      window.dispatchEvent(new CustomEvent('timetable-slot-rename', { detail: { from: oldValue, to: trimmed } }));
    } catch {}
    toast.success('Time slot updated');
    cancelEditSlot();
  };

  // Reset tasks only when switching between different users (not on first load)
  const prevUserScopeRef = useRef(null);
  useEffect(() => {
    if (!isLoaded) return;
    const prev = prevUserScopeRef.current;
    if (prev && prev !== userScope) {
      setWeeklyTasks(new Map());
      setEditingSlotIndex(null);
      setEditingSlotValue("");
      // Ask Calendar to rebroadcast after user switch
      try { window.dispatchEvent(new CustomEvent('weekly-mounted', { detail: { source: 'weekly' } })); } catch {}
    }
    prevUserScopeRef.current = userScope;
  }, [userScope, isLoaded]);

  // Fallback hydrate from localStorage snapshot written by Calendar (per-user)
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const bulkKey = keyFor('bulk');
    if (!bulkKey) return;
    try {
      const snap = localStorage.getItem(bulkKey);
      if (!snap) return;
      const items = JSON.parse(snap) || [];
      if (!Array.isArray(items) || items.length === 0) return;
      const taskMap = new Map();
      const ensureSlotSet = new Set(timeSlotsRef.current || []);
      items.forEach(item => {
        const dateKey = format(new Date(item.date), 'yyyy-MM-dd');
        if (!taskMap.has(dateKey)) taskMap.set(dateKey, []);
        const slot = item.timeSlot || '9:00 AM - 10:00 AM';
        taskMap.get(dateKey).push({ id: item.id, task: item.task, completed: !!item.completed, timeSlot: slot });
        ensureSlotSet.add(slot);
      });
      setWeeklyTasks(taskMap);
      const nextSlots = applyRenameHistoryToList(Array.from(ensureSlotSet));
      const current = timeSlotsRef.current || [];
      const same = nextSlots.length === current.length && nextSlots.every((v, i) => v === current[i]);
      if (!same) setTimeSlots(nextSlots);
    } catch {}
  }, [userScope, slotsLoaded]);
  /* eslint-enable react-hooks/exhaustive-deps */


  const addTask = (date, timeSlot) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    
    // Ensure weeklyTasks is a Map before calling .get()
    if (!(weeklyTasks instanceof Map)) {
      console.warn('weeklyTasks is not a Map in addTask:', weeklyTasks);
      setWeeklyTasks(new Map());
      return;
    }
    
    const currentTasks = weeklyTasks.get(dateKey) || [];
    
    const newTask = {
      id: `temp-${Date.now()}`,
      task: "",
      completed: false,
      timeSlot,
      isEditing: true
    };

    const updatedTasks = [...currentTasks, newTask];
    const newWeeklyTasks = new Map(weeklyTasks);
    newWeeklyTasks.set(dateKey, updatedTasks);
    setWeeklyTasks(newWeeklyTasks);
  };

  const updateTask = (date, taskId, updates) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    
    // Ensure weeklyTasks is a Map before proceeding
    if (!(weeklyTasks instanceof Map)) {
      console.warn('weeklyTasks is not a Map in updateTask:', weeklyTasks);
      setWeeklyTasks(new Map());
      return;
    }
    
    setWeeklyTasks(prev => {
      const newMap = new Map(prev);
      const currentTasks = newMap.get(dateKey) || [];
      const updatedTasks = currentTasks.map(task => 
        task.id === taskId ? { 
          ...task, 
          ...updates,
          originalTask: updates.isEditing && !task.originalTask ? task.task : task.originalTask
        } : task
      );
      newMap.set(dateKey, updatedTasks);
      return newMap;
    });
  };

  const deleteTask = async (date, taskId) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    
    // Ensure weeklyTasks is a Map before calling .get()
    if (!(weeklyTasks instanceof Map)) {
      console.warn('weeklyTasks is not a Map in deleteTask:', weeklyTasks);
      setWeeklyTasks(new Map());
      return;
    }
    
    const currentTasks = weeklyTasks.get(dateKey) || [];
    
    // If it's a real task (not temp), delete from database
    if (!taskId.startsWith('temp-')) {
      try {
        const response = await fetch('/api/timetable', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: taskId }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete task');
        }
        // Notify calendar view to remove the task
        try {
          window.dispatchEvent(new CustomEvent('timetable-task-deleted', {
            detail: { id: taskId }
          }));
        } catch {}
      } catch (error) {
        toast.error(error.message);
        return;
      }
    }

    const updatedTasks = currentTasks.filter(task => task.id !== taskId);
    const newWeeklyTasks = new Map(weeklyTasks);
    
    if (updatedTasks.length === 0) {
      newWeeklyTasks.delete(dateKey);
    } else {
      newWeeklyTasks.set(dateKey, updatedTasks);
    }
    
    setWeeklyTasks(newWeeklyTasks);
    toast.success("Task deleted!");
  };

  const saveTask = async (date, task) => {
    if (!task.task.trim()) {
      deleteTask(date, task.id);
      return;
    }

    try {
      const response = await fetch('/api/timetable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskName: task.task,
          date: date.toISOString(),
          timeSlot: task.timeSlot,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save task');
      }

      const savedTask = await response.json();
      updateTask(date, task.id, { 
        id: savedTask.id, 
        isEditing: false 
      });
      // Notify calendar view to sync its timetable immediately
      try {
        window.dispatchEvent(new CustomEvent('timetable-task-upserted', {
          detail: {
            id: savedTask.id,
            date: date.toISOString(),
            timeSlot: task.timeSlot,
            task: task.task,
            completed: false
          }
        }));
      } catch {}
      
      toast.success("Task saved!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const toggleComplete = async (date, task) => {
    const newCompleted = !task.completed;
    updateTask(date, task.id, { completed: newCompleted });

    if (!task.id.startsWith('temp-')) {
      try {
        const response = await fetch('/api/timetable', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: task.id,
            isCompleted: newCompleted,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update task');
        }
        // Notify calendar view of completion change
        try {
          window.dispatchEvent(new CustomEvent('timetable-task-upserted', {
            detail: {
              id: task.id,
              date: date.toISOString(),
              timeSlot: task.timeSlot,
              task: task.task,
              completed: newCompleted
            }
          }));
        } catch {}
      } catch (error) {
        toast.error(error.message);
        // Revert on error
        updateTask(date, task.id, { completed: !newCompleted });
      }
    }
  };

  const getTasksForDateAndSlot = (date, timeSlot) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    // Ensure weeklyTasks is a Map before calling .get()
    if (!(weeklyTasks instanceof Map)) {
      console.warn('weeklyTasks is not a Map:', weeklyTasks);
      return [];
    }
    const dayTasks = weeklyTasks.get(dateKey) || [];
    return dayTasks.filter(task => task.timeSlot === timeSlot);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4 lg:p-6">
      <div className="max-w-full lg:max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">Weekly Timetable</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Back to Calendar - green, with left arrow. Order last on phones, first on larger screens */}
          <Button
            onClick={onBackToCalendar}
            className="order-3 sm:order-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-3 py-2 rounded-lg shadow-lg border border-emerald-500 text-sm sm:text-base flex-1 sm:flex-none"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Back to Calendar</span>
            <span className="sm:hidden">Calendar</span>
          </Button>

          {/* Previous / Next - keep default slate styling; order them before back on phones, after on larger screens */}
          <Button
            onClick={() => setCurrentWeek(prev => addDays(prev, -7))}
            className="order-1 sm:order-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg shadow-lg border border-slate-600 flex-1 sm:flex-none text-sm sm:text-base"
          >
            <ChevronLeft className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Previous Week</span>
          </Button>
          <Button
            onClick={() => setCurrentWeek(prev => addDays(prev, 7))}
            className="order-2 sm:order-3 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg shadow-lg border border-slate-600 flex-1 sm:flex-none text-sm sm:text-base"
          >
            <span className="hidden sm:inline">Next Week</span>
            <ChevronRight className="w-4 h-4 sm:ml-1" />
          </Button>
        </div>
      </div>

      {/* Removed separate Time Slot management chips. Controls are inline in the grid. */}

      {/* Weekly Timetable Grid */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-blue-700/50 p-2 sm:p-4 lg:p-6 overflow-x-auto">
        <div className="min-w-[800px] lg:min-w-0">
          <div className="grid grid-cols-8 gap-1 sm:gap-2 lg:gap-4">
            {/* Header Row */}
            <div className="col-span-1 p-1 sm:p-2 lg:p-3 text-center font-bold text-white bg-slate-700 rounded-lg border border-slate-600">
              <span className="text-xs sm:text-sm lg:text-base">Time</span>
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="p-1 sm:p-2 lg:p-3 text-center font-bold text-white bg-slate-700 rounded-lg border border-slate-600"
              >
                <div className="text-xs sm:text-sm lg:text-base">{format(day, 'EEE')}</div>
                <div className="text-xs text-slate-300">{format(day, 'MMM d')}</div>
              </div>
            ))}

              {/* Time Slots and Tasks */}
              {timeSlots.map((timeSlot, index) => (
                <React.Fragment key={timeSlot}>
                  {/* Time Slot Header with inline edit */}
                  <div 
                    className="p-1 sm:p-2 lg:p-3 font-medium text-white bg-slate-700 rounded-lg border border-slate-600 relative group text-left flex items-center min-h-16"
                    onDoubleClick={() => startEditSlot(index)}
                    title="Double-click to edit time slot"
                  >
                    {editingSlotIndex === index ? (
                      <div className="flex flex-col items-stretch gap-2 w-full">
                        <input
                          type="text"
                          value={editingSlotValue}
                          onChange={(e) => setEditingSlotValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditSlot();
                            if (e.key === 'Escape') cancelEditSlot();
                          }}
                          className="bg-slate-800 text-white px-2 py-1 rounded-md border border-blue-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-xs lg:text-sm w-full"
                          placeholder="e.g., 9:30 AM - 1:00 PM"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={saveEditSlot}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-md border border-emerald-400/40 text-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="pr-8 text-xs lg:text-sm w-full whitespace-normal break-words">{timeSlot}</div>
                        <div className="absolute right-1 top-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); startEditSlot(index); }}
                            className="p-1 rounded hover:bg-blue-600/30 border border-transparent hover:border-blue-500"
                            title="Edit time slot"
                          >
                            <Pencil className="w-3 h-3 text-slate-300" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Day Cells */}
                  {weekDays.map((day) => {
                    const tasks = getTasksForDateAndSlot(day, timeSlot);
                    const hasTask = tasks.length > 0;

                    return (
                      <div
                        key={`${day.toISOString()}-${timeSlot}`}
                        className={`group relative min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] p-1 sm:p-2 lg:p-3 rounded-lg border transition-all duration-200 ${
                          hasTask
                            ? 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600'
                            : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-blue-600/50 hover:bg-slate-700/50'
                        }`}
                        onDoubleClick={() => !hasTask && addTask(day, timeSlot)}
                      >
                        {/* Plus Button - only show if no task */}
                        {!hasTask && (
                          <Button
                            onClick={() => addTask(day, timeSlot)}
                            onDoubleClick={() => addTask(day, timeSlot)}
                            className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white p-1 h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full shadow-lg border border-emerald-400/50 hover:border-emerald-300 hover:scale-110 z-10"
                          >
                            <span className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 font-bold flex items-center justify-center leading-none">+</span>
                          </Button>
                        )}

                          {/* Tasks */}
                          <div className="space-y-1 sm:space-y-2">
                            {tasks.map((task) => (
                              <div key={task.id} className="space-y-1">
                                {task.isEditing ? (
                                  <div className="p-1 sm:p-2 bg-slate-700 rounded-lg border border-blue-600/50">
                                    <div className="space-y-1">
                                      <textarea
                                        value={task.task}
                                        onChange={(e) => {
                                          if (e.target.value.length <= 200) {
                                            updateTask(day, task.id, { task: e.target.value });
                                          }
                                        }}
                                        placeholder="Enter task (max 200 characters)..."
                                        className="bg-slate-600 text-white text-xs p-1 sm:p-2 min-h-[30px] sm:min-h-[40px] max-h-[50px] sm:max-h-[60px] border border-blue-600/50 rounded-md focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 resize-none w-full"
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            saveTask(day, task);
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <div className="text-xs text-blue-300/70 text-right">
                                        {task.task.length}/200
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          onClick={() => saveTask(day, task)}
                                          className="bg-green-600 hover:bg-green-700 text-white p-1 h-5 sm:h-6 w-10 sm:w-12 text-xs rounded"
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          onClick={() => updateTask(day, task.id, { isEditing: false, task: task.originalTask || task.task })}
                                          className="bg-gray-600 hover:bg-gray-700 text-white p-1 h-5 sm:h-6 w-12 sm:w-14 text-xs rounded"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {/* Clean Task Box */}
                                    <div 
                                      className={`p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 shadow-lg border-2 hover:shadow-xl hover:scale-[1.02] ${
                                        task.completed 
                                          ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white border-emerald-400/50 hover:border-emerald-300' 
                                          : 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white border-blue-400/50 hover:border-blue-300'
                                      }`}
                                      onClick={() => {
                                        setSelectedTask({...task, date: day, timeSlot});
                                        document.getElementById('task-details')?.scrollIntoView({ behavior: 'smooth' });
                                      }}
                                    >
                                      <div className="text-xs sm:text-sm font-semibold tracking-wide break-words overflow-hidden">
                                        {(() => {
                                          const words = task.task.split(' ');
                                          if (words.length <= 2) return task.task;
                                          return `${words.slice(0, 2).join(' ')}...`;
                                        })()}
                                      </div>
                                    </div>
                                    
                                    {/* Action Buttons Outside */}
                                    <div className="flex justify-between items-center mt-1 sm:mt-2 px-1 sm:px-2">
                                      {/* Checkbox */}
                                      <div 
                                        className={`relative cursor-pointer transition-all duration-200 ${
                                          task.completed ? 'text-emerald-400' : 'text-slate-400 hover:text-blue-400'
                                        }`}
                                        onClick={() => toggleComplete(day, task)}
                                      >
                                        <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                          task.completed 
                                            ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/30' 
                                            : 'border-slate-400 hover:border-blue-400 hover:shadow-md'
                                        }`}>
                                          {task.completed && <span className="text-white text-xs font-bold">✓</span>}
                                        </div>
                                      </div>
                                      
                                      {/* Action Buttons */}
                                      <div className="flex gap-1 sm:gap-2">
                                        {/* Edit Button */}
                                        <button
                                          onClick={() => updateTask(day, task.id, { isEditing: true })}
                                          className="group relative w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 rounded-full bg-slate-700 hover:bg-blue-600 border border-slate-600 hover:border-blue-500 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg hover:shadow-blue-500/30"
                                          title="Edit task"
                                        >
                                          <svg className="w-2 h-2 sm:w-3 sm:h-3 text-slate-300 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                          </svg>
                                        </button>
                                        
                                        {/* Delete Button */}
                                        <button
                                          onClick={() => deleteTask(day, task.id)}
                                          className="group relative w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 rounded-full bg-slate-700 hover:bg-red-600 border border-slate-600 hover:border-red-500 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg hover:shadow-red-500/30"
                                          title="Delete task"
                                        >
                                          <svg className="w-2 h-2 sm:w-3 sm:h-3 text-slate-300 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Add/Delete slot UI removed by request */}

      {/* Task Details Section */}
      {selectedTask && (
        <div 
          id="task-details" 
          className={`mt-4 sm:mt-6 lg:mt-8 p-3 sm:p-4 lg:p-6 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl border border-slate-600 shadow-xl transition-opacity duration-300 ${
            isClosing ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            📋 Task Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 items-stretch">
            {/* Card 1: Task Description */}
            <div className="h-full bg-slate-700 p-4 rounded-lg border border-slate-600 flex flex-col">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Task Description</h4>
              <p className="text-white text-lg leading-relaxed break-words">{selectedTask.task}</p>
              <div className="mt-auto" />
            </div>

            {/* Card 2: Status */}
            <div className="h-full bg-slate-700 p-4 rounded-lg border border-slate-600 flex flex-col justify-center">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Status</h4>
              <div className={`inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                selectedTask.completed 
                  ? 'bg-green-600 text-green-100' 
                  : 'bg-blue-600 text-blue-100'
              }`}>
                {selectedTask.completed ? '✅ Completed' : '⏳ Incomplete'}
              </div>
            </div>

            {/* Card 3: Date */}
            <div className="h-full bg-slate-700 p-4 rounded-lg border border-slate-600 flex flex-col">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Date</h4>
              <p className="text-white text-lg">{format(selectedTask.date, 'EEEE, MMMM do, yyyy')}</p>
              <div className="mt-auto" />
            </div>

            {/* Card 4: Time Slot */}
            <div className="h-full bg-slate-700 p-4 rounded-lg border border-slate-600 flex flex-col">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Time Slot</h4>
              <p className="text-white text-lg">{selectedTask.timeSlot}</p>
              <div className="mt-auto" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-3 mt-6 pt-4 border-t border-slate-600">
            <Button
              onClick={() => {
                setIsClosing(true);
                setTimeout(() => {
                  setSelectedTask(null);
                  setIsClosing(false);
                }, 300); // Match this with the transition duration (300ms)
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              ❌ Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
