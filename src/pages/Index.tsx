import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';

type Priority = 'high' | 'mid' | 'low';
type Tab = 'tasks' | 'calendar' | 'reminders' | 'notes' | 'settings';

interface Task {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  createdAt: string;
}

interface Reminder {
  id: string;
  text: string;
  time: string;
  enabled: boolean;
}

interface Note {
  id: string;
  text: string;
  updatedAt: string;
}

interface AppSettings {
  name: string;
  theme: 'light' | 'dark';
  notifications: boolean;
  startWeekMonday: boolean;
}

const PRIORITY_LABELS: Record<Priority, string> = { high: 'Высокий', mid: 'Средний', low: 'Низкий' };
const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'var(--app-tag-high)',
  mid: 'var(--app-tag-mid)',
  low: 'var(--app-tag-low)',
};
const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function useStorage<T>(key: string, init: T): [T, (v: T | ((prev: T) => T)) => void] {
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

function uid() { return Math.random().toString(36).slice(2); }

const NAV_ITEMS: { tab: Tab; icon: string; label: string }[] = [
  { tab: 'tasks', icon: 'CheckSquare', label: 'Задачи' },
  { tab: 'calendar', icon: 'CalendarDays', label: 'Календарь' },
  { tab: 'reminders', icon: 'Bell', label: 'Напоминания' },
  { tab: 'notes', icon: 'FileText', label: 'Заметки' },
  { tab: 'settings', icon: 'Settings', label: 'Настройки' },
];

export default function Index() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [tasks, setTasks] = useStorage<Task[]>('app_tasks', []);
  const [reminders, setReminders] = useStorage<Reminder[]>('app_reminders', []);
  const [notes, setNotes] = useStorage<Note[]>('app_notes', []);
  const [settings, setSettings] = useStorage<AppSettings>('app_settings', {
    name: '', theme: 'light', notifications: false, startWeekMonday: true,
  });
  const [calDate, setCalDate] = useState(new Date());
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    if (!settings.notifications) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [settings.notifications]);

  const isDark = settings.theme === 'dark';

  return (
    <div
      style={{
        background: isDark ? '#0f0f0f' : 'var(--app-paper)',
        color: isDark ? '#f0f0f0' : 'var(--app-ink)',
        fontFamily: "'Golos Text', sans-serif",
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 480,
        margin: '0 auto',
        position: 'relative',
        boxShadow: '0 0 0 1px rgba(0,0,0,.06)',
      }}
    >
      {/* Header */}
      <header style={{
        padding: '20px 20px 12px',
        borderBottom: `1px solid ${isDark ? '#222' : 'var(--app-line)'}`,
        background: isDark ? '#0f0f0f' : 'var(--app-surface)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--app-muted)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 2 }}>
              {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
              {settings.name ? `Привет, ${settings.name}` : NAV_ITEMS.find(n => n.tab === tab)?.label}
            </h1>
          </div>
          {tab === 'tasks' && (
            <span style={{
              background: isDark ? '#1e1e1e' : 'var(--app-paper)',
              borderRadius: 20, padding: '4px 12px',
              fontSize: 13, fontWeight: 500,
              color: 'var(--app-muted)',
            }}>
              {tasks.filter(t => !t.done).length} активных
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '0 0 80px' }} className="scrollbar-hide">
        {tab === 'tasks' && <TasksView tasks={tasks} setTasks={setTasks} isDark={isDark} showToast={showToast} />}
        {tab === 'calendar' && <CalendarView tasks={tasks} calDate={calDate} setCalDate={setCalDate} isDark={isDark} startMonday={settings.startWeekMonday} />}
        {tab === 'reminders' && <RemindersView reminders={reminders} setReminders={setReminders} isDark={isDark} showToast={showToast} />}
        {tab === 'notes' && <NotesView notes={notes} setNotes={setNotes} isDark={isDark} showToast={showToast} />}
        {tab === 'settings' && <SettingsView settings={settings} setSettings={setSettings} isDark={isDark} showToast={showToast} />}
      </main>

      {/* Bottom Nav */}
      <nav style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: isDark ? 'rgba(15,15,15,.96)' : 'rgba(255,255,255,.96)',
        borderTop: `1px solid ${isDark ? '#222' : 'var(--app-line)'}`,
        display: 'flex',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.tab}
            onClick={() => setTab(item.tab)}
            style={{
              flex: 1, padding: '10px 0 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === item.tab ? (isDark ? '#fff' : 'var(--app-ink)') : 'var(--app-muted)',
              transition: 'color .15s',
            }}
          >
            <Icon name={item.icon} size={22} />
            <span style={{ fontSize: 10, fontWeight: tab === item.tab ? 600 : 400, fontFamily: 'inherit' }}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 90, left: 20, right: 20,
          background: isDark ? '#1e1e1e' : '#141414',
          color: '#fff', borderRadius: 12,
          padding: '12px 16px', fontSize: 14, fontWeight: 500,
          animation: 'fade-in .2s ease-out',
          textAlign: 'center',
          zIndex: 100,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── TASKS ──────────────────────── */
function TasksView({ tasks, setTasks, isDark, showToast }: {
  tasks: Task[]; setTasks: (v: Task[] | ((p: Task[]) => Task[])) => void; isDark: boolean; showToast: (s: string) => void;
}) {
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<Priority>('mid');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    if (!input.trim()) return;
    setTasks((p: Task[]) => [{ id: uid(), text: input.trim(), done: false, priority, createdAt: new Date().toISOString() }, ...p]);
    setInput('');
    showToast('Задача добавлена');
  };

  const toggle = (id: string) => setTasks((p: Task[]) => p.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: string) => { setTasks((p: Task[]) => p.filter(t => t.id !== id)); showToast('Задача удалена'); };

  const filtered = tasks.filter(t => filter === 'all' ? true : filter === 'active' ? !t.done : t.done);
  const bg = isDark ? '#1a1a1a' : '#fff';
  const bgPaper = isDark ? '#0f0f0f' : 'var(--app-paper)';

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Add task */}
      <div style={{
        background: bg, borderRadius: 16,
        border: `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}`,
        padding: '12px 14px', marginBottom: 16,
        animation: 'fade-in .3s ease-out',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Новая задача..."
          style={{
            width: '100%', background: 'none', border: 'none', outline: 'none',
            fontSize: 15, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
            fontFamily: 'inherit', marginBottom: 10,
          }}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(['high', 'mid', 'low'] as Priority[]).map(p => (
            <button key={p} onClick={() => setPriority(p)} style={{
              padding: '4px 10px', borderRadius: 20,
              border: `1.5px solid ${priority === p ? PRIORITY_COLORS[p] : 'transparent'}`,
              background: priority === p ? `${PRIORITY_COLORS[p]}18` : (isDark ? '#222' : '#f4f4f4'),
              color: priority === p ? PRIORITY_COLORS[p] : 'var(--app-muted)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {PRIORITY_LABELS[p]}
            </button>
          ))}
          <button onClick={add} style={{
            marginLeft: 'auto', background: isDark ? '#fff' : 'var(--app-ink)',
            color: isDark ? '#000' : '#fff',
            border: 'none', borderRadius: 10, padding: '6px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            + Добавить
          </button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['all', 'active', 'done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 12px', borderRadius: 20,
            background: filter === f ? (isDark ? '#fff' : 'var(--app-ink)') : 'transparent',
            color: filter === f ? (isDark ? '#000' : '#fff') : 'var(--app-muted)',
            border: `1px solid ${isDark ? '#333' : 'var(--app-line)'}`,
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {{ all: 'Все', active: 'Активные', done: 'Выполненные' }[f]}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--app-muted)', padding: '40px 0', fontSize: 14 }}>
          Нет задач
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((task, i) => (
          <div key={task.id} style={{
            background: bg, borderRadius: 14,
            border: `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}`,
            padding: '12px 14px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            opacity: task.done ? .55 : 1,
            animation: `fade-in .2s ease-out ${i * .03}s both`,
          }}>
            <button onClick={() => toggle(task.id)} style={{
              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
              border: `2px solid ${task.done ? PRIORITY_COLORS[task.priority] : (isDark ? '#444' : '#ccc')}`,
              background: task.done ? PRIORITY_COLORS[task.priority] : 'transparent',
              cursor: 'pointer', marginTop: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {task.done && <Icon name="Check" size={11} style={{ color: '#fff' }} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 14, fontWeight: 500, lineHeight: 1.4,
                textDecoration: task.done ? 'line-through' : 'none',
                wordBreak: 'break-word',
              }}>{task.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{
                  fontSize: 11, color: PRIORITY_COLORS[task.priority],
                  fontWeight: 500,
                }}>● {PRIORITY_LABELS[task.priority]}</span>
                <span style={{ fontSize: 11, color: 'var(--app-muted)' }}>
                  {new Date(task.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
            <button onClick={() => remove(task.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--app-muted)', padding: 2, flexShrink: 0,
            }}>
              <Icon name="Trash2" size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────── CALENDAR ──────────────────────── */
function CalendarView({ tasks, calDate, setCalDate, isDark, startMonday }: {
  tasks: Task[]; calDate: Date; setCalDate: (d: Date) => void; isDark: boolean; startMonday: boolean;
}) {
  const today = new Date();
  const year = calDate.getFullYear();
  const month = calDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  if (startMonday) startDow = (startDow + 6) % 7;

  const days: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

  const taskDates = new Set(tasks.map(t => t.createdAt.split('T')[0]));
  const bg = isDark ? '#1a1a1a' : '#fff';
  const dayHeaders = startMonday ? ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'] : DAYS_RU;

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const dayTasks = selectedDay
    ? tasks.filter(t => t.createdAt.split('T')[0] === selectedDay.toISOString().split('T')[0])
    : [];

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setCalDate(new Date(year, month - 1, 1))} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#fff' : 'var(--app-ink)',
          padding: 6,
        }}>
          <Icon name="ChevronLeft" size={20} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 17 }}>{MONTHS_RU[month]} {year}</span>
        <button onClick={() => setCalDate(new Date(year, month + 1, 1))} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#fff' : 'var(--app-ink)',
          padding: 6,
        }}>
          <Icon name="ChevronRight" size={20} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
        {dayHeaders.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--app-muted)', fontWeight: 500, padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = day.toISOString().split('T')[0];
          const isToday = day.toDateString() === today.toDateString();
          const hasTasks = taskDates.has(iso);
          const isSel = selectedDay?.toDateString() === day.toDateString();
          return (
            <button key={i} onClick={() => setSelectedDay(isSel ? null : day)} style={{
              aspectRatio: '1', borderRadius: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              background: isSel ? (isDark ? '#fff' : 'var(--app-ink)') : isToday ? (isDark ? '#222' : '#f0f0f0') : 'transparent',
              color: isSel ? (isDark ? '#000' : '#fff') : (isDark ? '#f0f0f0' : 'var(--app-ink)'),
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: isToday ? 700 : 400,
              fontFamily: 'inherit',
            }}>
              {day.getDate()}
              {hasTasks && <div style={{
                width: 4, height: 4, borderRadius: 2,
                background: isSel ? (isDark ? '#000' : '#fff') : 'var(--app-blue)',
              }} />}
            </button>
          );
        })}
      </div>

      {/* Selected day tasks */}
      {selectedDay && (
        <div style={{ marginTop: 20, animation: 'slide-up .25s ease-out' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-muted)', marginBottom: 10 }}>
            {selectedDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </p>
          {dayTasks.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--app-muted)' }}>Задач в этот день нет</p>
          ) : (
            dayTasks.map(t => (
              <div key={t.id} style={{
                background: bg, borderRadius: 12, padding: '10px 12px', marginBottom: 6,
                border: `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ color: PRIORITY_COLORS[t.priority], fontSize: 12 }}>●</span>
                <span style={{ fontSize: 14, textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? .6 : 1 }}>
                  {t.text}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── REMINDERS ──────────────────────── */
function RemindersView({ reminders, setReminders, isDark, showToast }: {
  reminders: Reminder[]; setReminders: (v: Reminder[] | ((p: Reminder[]) => Reminder[])) => void; isDark: boolean; showToast: (s: string) => void;
}) {
  const [text, setText] = useState('');
  const [time, setTime] = useState('09:00');
  const bg = isDark ? '#1a1a1a' : '#fff';

  const add = () => {
    if (!text.trim()) return;
    setReminders((p: Reminder[]) => [{ id: uid(), text: text.trim(), time, enabled: true }, ...p]);
    setText('');
    showToast('Напоминание добавлено');

    if ('Notification' in window && Notification.permission === 'granted') {
      const [h, m] = time.split(':').map(Number);
      const now = new Date();
      const target = new Date();
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const ms = target.getTime() - now.getTime();
      setTimeout(() => new Notification('Ежедневник', { body: text.trim() }), ms);
    }
  };

  const toggle = (id: string) => setReminders((p: Reminder[]) => p.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const remove = (id: string) => { setReminders((p: Reminder[]) => p.filter(r => r.id !== id)); showToast('Напоминание удалено'); };

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Add */}
      <div style={{
        background: bg, borderRadius: 16,
        border: `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}`,
        padding: '12px 14px', marginBottom: 16,
        animation: 'fade-in .3s ease-out',
      }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Текст напоминания..."
          style={{
            width: '100%', background: 'none', border: 'none', outline: 'none',
            fontSize: 15, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
            fontFamily: 'inherit', marginBottom: 10,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={{
              background: isDark ? '#222' : '#f4f4f4',
              border: 'none', borderRadius: 8, padding: '6px 10px',
              fontSize: 14, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
          <button onClick={add} style={{
            marginLeft: 'auto', background: isDark ? '#fff' : 'var(--app-ink)',
            color: isDark ? '#000' : '#fff',
            border: 'none', borderRadius: 10, padding: '6px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            + Добавить
          </button>
        </div>
      </div>

      {reminders.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--app-muted)', padding: '40px 0', fontSize: 14 }}>
          Нет напоминаний
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reminders.map((r, i) => (
          <div key={r.id} style={{
            background: bg, borderRadius: 14,
            border: `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}`,
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            opacity: r.enabled ? 1 : .5,
            animation: `fade-in .2s ease-out ${i * .03}s both`,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{r.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="Clock" size={12} />
                <span style={{ fontSize: 12, color: 'var(--app-muted)' }}>{r.time}</span>
              </div>
            </div>
            {/* Toggle switch */}
            <button onClick={() => toggle(r.id)} style={{
              width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: r.enabled ? 'var(--app-blue)' : (isDark ? '#333' : '#ccc'),
              position: 'relative', transition: 'background .2s',
            }}>
              <span style={{
                position: 'absolute', top: 3, left: r.enabled ? 20 : 3,
                width: 18, height: 18, borderRadius: 9, background: '#fff',
                transition: 'left .2s',
              }} />
            </button>
            <button onClick={() => remove(r.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--app-muted)', padding: 2,
            }}>
              <Icon name="Trash2" size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────── NOTES ──────────────────────── */
function NotesView({ notes, setNotes, isDark, showToast }: {
  notes: Note[]; setNotes: (v: Note[] | ((p: Note[]) => Note[])) => void; isDark: boolean; showToast: (s: string) => void;
}) {
  const [active, setActive] = useState<Note | null>(null);
  const [text, setText] = useState('');
  const bg = isDark ? '#1a1a1a' : '#fff';

  const openNew = () => {
    const n: Note = { id: uid(), text: '', updatedAt: new Date().toISOString() };
    setNotes((p: Note[]) => [n, ...p]);
    setActive(n);
    setText('');
  };

  const save = () => {
    if (!active) return;
    if (!text.trim()) {
      setNotes((p: Note[]) => p.filter(n => n.id !== active.id));
    } else {
      setNotes((p: Note[]) => p.map(n => n.id === active.id ? { ...n, text: text.trim(), updatedAt: new Date().toISOString() } : n));
    }
    setActive(null);
    showToast('Заметка сохранена');
  };

  if (active) {
    return (
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => { setActive(null); if (!text.trim()) setNotes((p: Note[]) => p.filter(n => n.id !== active.id)); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-muted)', fontFamily: 'inherit', fontSize: 14 }}>
            ← Назад
          </button>
          <button onClick={save} style={{
            background: isDark ? '#fff' : 'var(--app-ink)', color: isDark ? '#000' : '#fff',
            border: 'none', borderRadius: 10, padding: '6px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>Сохранить</button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Начните писать..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 15, lineHeight: 1.7, resize: 'none',
            color: isDark ? '#f0f0f0' : 'var(--app-ink)',
            fontFamily: 'inherit',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <button onClick={openNew} style={{
        width: '100%', background: isDark ? '#1a1a1a' : '#fff',
        border: `1.5px dashed ${isDark ? '#333' : 'var(--app-line)'}`,
        borderRadius: 16, padding: '14px', cursor: 'pointer',
        color: 'var(--app-muted)', fontSize: 14, fontFamily: 'inherit',
        marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        animation: 'fade-in .3s ease-out',
      }}>
        <Icon name="Plus" size={16} /> Новая заметка
      </button>

      {notes.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--app-muted)', padding: '40px 0', fontSize: 14 }}>
          Нет заметок
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {notes.map((note, i) => (
          <div key={note.id} onClick={() => { setActive(note); setText(note.text); }} style={{
            background: bg, borderRadius: 14,
            border: `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}`,
            padding: '12px', cursor: 'pointer',
            animation: `fade-in .2s ease-out ${i * .04}s both`,
            minHeight: 80,
          }}>
            <p style={{ fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {note.text || <span style={{ color: 'var(--app-muted)' }}>Пустая заметка</span>}
            </p>
            <p style={{ fontSize: 11, color: 'var(--app-muted)' }}>
              {new Date(note.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────── SETTINGS ──────────────────────── */
function SettingsView({ settings, setSettings, isDark, showToast }: {
  settings: AppSettings; setSettings: (v: AppSettings | ((p: AppSettings) => AppSettings)) => void; isDark: boolean; showToast: (s: string) => void;
}) {
  const bg = isDark ? '#1a1a1a' : '#fff';

  const update = (patch: Partial<AppSettings>) => {
    setSettings((p: AppSettings) => ({ ...p, ...patch }));
  };

  const requestNotifs = () => {
    if (!('Notification' in window)) { showToast('Уведомления не поддерживаются'); return; }
    Notification.requestPermission().then(r => {
      if (r === 'granted') { update({ notifications: true }); showToast('Уведомления включены'); }
      else showToast('Уведомления отклонены браузером');
    });
  };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{
      background: bg, borderRadius: 14,
      border: `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}`,
      padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} style={{
      width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
      background: value ? 'var(--app-blue)' : (isDark ? '#333' : '#ccc'),
      position: 'relative', transition: 'background .2s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 20, height: 20, borderRadius: 10, background: '#fff',
        transition: 'left .2s',
      }} />
    </button>
  );

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, animation: 'fade-in .3s ease-out' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        Профиль
      </p>
      <div style={{
        background: bg, borderRadius: 14,
        border: `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}`,
        padding: '14px 16px',
      }}>
        <label style={{ fontSize: 12, color: 'var(--app-muted)', display: 'block', marginBottom: 6 }}>Ваше имя</label>
        <input
          value={settings.name}
          onChange={e => update({ name: e.target.value })}
          placeholder="Как вас зовут?"
          style={{
            width: '100%', background: 'none', border: 'none', outline: 'none',
            fontSize: 15, color: isDark ? '#f0f0f0' : 'var(--app-ink)', fontFamily: 'inherit',
          }}
        />
      </div>

      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 6, marginBottom: 4 }}>
        Внешний вид
      </p>
      <Row label="Тёмная тема">
        <Toggle value={isDark} onChange={() => update({ theme: isDark ? 'light' : 'dark' })} />
      </Row>
      <Row label="Неделя с понедельника">
        <Toggle value={settings.startWeekMonday} onChange={() => update({ startWeekMonday: !settings.startWeekMonday })} />
      </Row>

      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 6, marginBottom: 4 }}>
        Уведомления
      </p>
      <Row label="Пуш-уведомления">
        {settings.notifications ? (
          <Toggle value={true} onChange={() => update({ notifications: false })} />
        ) : (
          <button onClick={requestNotifs} style={{
            background: 'var(--app-blue)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '6px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Включить
          </button>
        )}
      </Row>

      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 6, marginBottom: 4 }}>
        Данные
      </p>
      <div style={{
        background: bg, borderRadius: 14,
        border: `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}`,
        padding: '14px 16px',
      }}>
        <p style={{ fontSize: 13, color: 'var(--app-muted)', lineHeight: 1.5 }}>
          Все данные хранятся локально в вашем браузере. Приложение работает без интернета.
        </p>
      </div>

      <button onClick={() => {
        if (!confirm('Удалить все данные?')) return;
        localStorage.clear();
        window.location.reload();
      }} style={{
        background: 'none', border: `1px solid ${isDark ? '#3a1a1a' : '#ffe0e0'}`,
        borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
        color: 'var(--app-tag-high)', fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
        marginTop: 4,
      }}>
        Очистить все данные
      </button>
    </div>
  );
}