import { useState } from 'react';

export type Priority = 'high' | 'mid' | 'low';
export type Tab = 'tasks' | 'calendar' | 'reminders' | 'notes' | 'settings';

export interface Task {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  createdAt: string;
}

export interface Reminder {
  id: string;
  text: string;
  time: string;
  enabled: boolean;
}

export interface Note {
  id: string;
  text: string;
  updatedAt: string;
}

export interface AppSettings {
  name: string;
  theme: 'light' | 'dark';
  notifications: boolean;
  startWeekMonday: boolean;
}

export const PRIORITY_LABELS: Record<Priority, string> = { high: 'Высокий', mid: 'Средний', low: 'Низкий' };
export const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'var(--app-tag-high)',
  mid: 'var(--app-tag-mid)',
  low: 'var(--app-tag-low)',
};
export const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

export const NAV_ITEMS: { tab: Tab; icon: string; label: string }[] = [
  { tab: 'tasks', icon: 'CheckSquare', label: 'Задачи' },
  { tab: 'calendar', icon: 'CalendarDays', label: 'Календарь' },
  { tab: 'reminders', icon: 'Bell', label: 'Напоминания' },
  { tab: 'notes', icon: 'FileText', label: 'Заметки' },
  { tab: 'settings', icon: 'Settings', label: 'Настройки' },
];

export function useStorage<T>(key: string, init: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  const set = (v: T | ((prev: T) => T)) => {
    setVal(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch (_e) { /* ignore */ }
      return next;
    });
  };
  return [val, set];
}

export function uid() { return Math.random().toString(36).slice(2); }
