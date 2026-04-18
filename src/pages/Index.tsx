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
  taskDate?: string;
  taskTime?: string;
}

interface Reminder {
  id: string;
  text: string;
  time: string;
  enabled: boolean;
  advanceType?: 'day' | 'hours' | 'custom';
  advanceHours?: number;
  advanceMinutes?: number;
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
const PRIORITY_BG: Record<Priority, string> = {
  high: 'rgba(255,68,68,0.10)',
  mid: 'rgba(255,149,0,0.10)',
  low: 'rgba(52,199,89,0.10)',
};
const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const DAYS_RU_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function useStorage<T>(key: string, init: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  const set = (v: T | ((prev: T) => T)) => {
    setVal(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  return [val, set];
}

function uid() { return Math.random().toString(36).slice(2); }
function toIso(d: Date) { return d.toISOString().split('T')[0]; }
function isWeekend(date: Date) { const d = date.getDay(); return d === 0 || d === 6; }

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
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    if (!settings.notifications) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
  }, [settings.notifications]);

  // Фоновые уведомления для задач
  useEffect(() => {
    if (!settings.notifications || Notification.permission !== 'granted') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    tasks.forEach(task => {
      if (task.done || !task.taskDate || !task.taskTime) return;
      const taskDt = new Date(`${task.taskDate}T${task.taskTime}`);
      const now = Date.now();
      const offsets = [0, 60 * 60 * 1000, 24 * 60 * 60 * 1000];
      offsets.forEach(off => {
        const fireAt = taskDt.getTime() - off;
        if (fireAt > now) {
          const label = off === 0 ? 'сейчас' : off === 3600000 ? 'через 1 час' : 'через сутки';
          timers.push(setTimeout(() => new Notification('Ежедневник — задача', { body: `${task.text} (${label})` }), fireAt - now));
        }
      });
    });
    return () => timers.forEach(clearTimeout);
  }, [tasks, settings.notifications]);

  const isDark = settings.theme === 'dark';

  return (
    <div style={{
      background: isDark ? '#0f0f0f' : 'var(--app-paper)',
      color: isDark ? '#f0f0f0' : 'var(--app-ink)',
      fontFamily: "'Golos Text', sans-serif",
      height: '100%', display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', position: 'relative',
      boxShadow: '0 0 0 1px rgba(0,0,0,.06)',
    }}>
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
              fontSize: 13, fontWeight: 500, color: 'var(--app-muted)',
            }}>
              {tasks.filter(t => !t.done).length} активных
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '0 0 80px' }} className="scrollbar-hide">
        {tab === 'tasks' && <TasksView tasks={tasks} setTasks={setTasks} isDark={isDark} showToast={showToast} onTaskClick={setActiveTask} />}
        {tab === 'calendar' && <CalendarView tasks={tasks} setTasks={setTasks} calDate={calDate} setCalDate={setCalDate} isDark={isDark} startMonday={settings.startWeekMonday} />}
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
          <button key={item.tab} onClick={() => setTab(item.tab)} style={{
            flex: 1, padding: '10px 0 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'none', border: 'none', cursor: 'pointer',
            color: tab === item.tab ? (isDark ? '#fff' : 'var(--app-ink)') : 'var(--app-muted)',
            transition: 'color .15s',
          }}>
            <Icon name={item.icon} size={22} />
            <span style={{ fontSize: 10, fontWeight: tab === item.tab ? 600 : 400, fontFamily: 'inherit' }}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Task popup */}
      {activeTask && (
        <div
          onClick={() => setActiveTask(null)}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)',
            display: 'flex', alignItems: 'flex-end', zIndex: 200,
            animation: 'fade-in .2s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              background: isDark ? '#1a1a1a' : '#fff',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 40px',
              animation: 'slide-up .25s ease-out',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: isDark ? '#333' : '#ddd', margin: '0 auto 18px' }} />
            <div style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: 20,
              background: PRIORITY_BG[activeTask.priority],
              color: PRIORITY_COLORS[activeTask.priority],
              fontSize: 12, fontWeight: 600, marginBottom: 12,
            }}>
              {PRIORITY_LABELS[activeTask.priority]}
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>{activeTask.text}</p>
            {activeTask.taskDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--app-muted)', fontSize: 13 }}>
                <Icon name="Calendar" size={14} />
                <span>{(() => { const [,m,d] = activeTask.taskDate!.split('-'); return `${d} ${['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'][+m-1]}`; })()}</span>
                {activeTask.taskTime && <><Icon name="Clock" size={14} /><span>{activeTask.taskTime}</span></>}
              </div>
            )}
            <button onClick={() => setActiveTask(null)} style={{
              marginTop: 20, width: '100%', padding: '12px', borderRadius: 12,
              background: isDark ? '#fff' : 'var(--app-ink)', color: isDark ? '#000' : '#fff',
              border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 90, left: 20, right: 20,
          background: isDark ? '#1e1e1e' : '#141414',
          color: '#fff', borderRadius: 12,
          padding: '12px 16px', fontSize: 14, fontWeight: 500,
          animation: 'fade-in .2s ease-out',
          textAlign: 'center', zIndex: 100,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── TASKS ──────────────────────── */
function TasksView({ tasks, setTasks, isDark, showToast, onTaskClick }: {
  tasks: Task[];
  setTasks: (v: Task[] | ((p: Task[]) => Task[])) => void;
  isDark: boolean;
  showToast: (s: string) => void;
  onTaskClick: (t: Task) => void;
}) {
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<Priority>('mid');
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('mid');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  const add = () => {
    if (!input.trim()) return;
    setTasks((p: Task[]) => [{
      id: uid(), text: input.trim(), done: false, priority,
      createdAt: new Date().toISOString(),
      taskDate: taskDate || undefined,
      taskTime: taskTime || undefined,
    }, ...p]);
    setInput(''); setTaskDate(''); setTaskTime('');
    showToast('Задача добавлена');
  };

  const toggle = (id: string) => setTasks((p: Task[]) => p.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: string) => { setTasks((p: Task[]) => p.filter(t => t.id !== id)); showToast('Задача удалена'); };

  const startEdit = (task: Task) => {
    setEditId(task.id);
    setEditText(task.text);
    setEditPriority(task.priority);
    setEditDate(task.taskDate || '');
    setEditTime(task.taskTime || '');
  };

  const saveEdit = () => {
    if (!editId) return;
    setTasks((p: Task[]) => p.map(t => t.id === editId ? {
      ...t, text: editText, priority: editPriority,
      taskDate: editDate || undefined,
      taskTime: editTime || undefined,
    } : t));
    setEditId(null);
    showToast('Задача обновлена');
  };

  const filtered = tasks.filter(t => filter === 'all' ? true : filter === 'active' ? !t.done : t.done);
  const bg = isDark ? '#1a1a1a' : '#fff';

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
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} style={{
            background: isDark ? '#222' : '#f4f4f4', border: 'none', borderRadius: 8,
            padding: '5px 8px', fontSize: 13, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
            fontFamily: 'inherit', outline: 'none', flex: 1,
          }} />
          <input type="time" value={taskTime} onChange={e => setTaskTime(e.target.value)} style={{
            background: isDark ? '#222' : '#f4f4f4', border: 'none', borderRadius: 8,
            padding: '5px 8px', fontSize: 13, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
            fontFamily: 'inherit', outline: 'none', width: 90,
          }} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(['high', 'mid', 'low'] as Priority[]).map(p => (
            <button type="button" key={p} onClick={() => setPriority(p)} style={{
              padding: '4px 10px', borderRadius: 20,
              border: `1.5px solid ${priority === p ? PRIORITY_COLORS[p] : 'transparent'}`,
              background: priority === p ? PRIORITY_BG[p] : (isDark ? '#222' : '#f4f4f4'),
              color: priority === p ? PRIORITY_COLORS[p] : 'var(--app-muted)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {PRIORITY_LABELS[p]}
            </button>
          ))}
          <button type="button" onClick={add} style={{
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

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--app-muted)', padding: '40px 0', fontSize: 14 }}>Нет задач</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((task, i) => (
          <div key={task.id}>
            {editId === task.id ? (
              <div style={{
                background: PRIORITY_BG[editPriority],
                borderRadius: 14, border: `1.5px solid ${PRIORITY_COLORS[editPriority]}`,
                padding: '12px 14px', animation: 'fade-in .2s ease-out',
              }}>
                <input value={editText} onChange={e => setEditText(e.target.value)}
                  style={{
                    width: '100%', background: 'none', border: 'none', outline: 'none',
                    fontSize: 14, fontWeight: 500, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
                    fontFamily: 'inherit', marginBottom: 8,
                  }}
                />
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{
                    background: isDark ? '#2a2a2a' : '#f0f0f0', border: 'none', borderRadius: 8,
                    padding: '4px 8px', fontSize: 12, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
                    fontFamily: 'inherit', outline: 'none', flex: 1,
                  }} />
                  <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={{
                    background: isDark ? '#2a2a2a' : '#f0f0f0', border: 'none', borderRadius: 8,
                    padding: '4px 8px', fontSize: 12, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
                    fontFamily: 'inherit', outline: 'none', width: 90,
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {(['high', 'mid', 'low'] as Priority[]).map(p => (
                    <button type="button" key={p} onClick={() => setEditPriority(p)} style={{
                      padding: '3px 8px', borderRadius: 20,
                      border: `1.5px solid ${editPriority === p ? PRIORITY_COLORS[p] : 'transparent'}`,
                      background: editPriority === p ? PRIORITY_BG[p] : 'transparent',
                      color: editPriority === p ? PRIORITY_COLORS[p] : 'var(--app-muted)',
                      fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{PRIORITY_LABELS[p]}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={saveEdit} style={{
                    flex: 1, background: isDark ? '#fff' : 'var(--app-ink)', color: isDark ? '#000' : '#fff',
                    border: 'none', borderRadius: 8, padding: '7px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Сохранить</button>
                  <button type="button" onClick={() => setEditId(null)} style={{
                    flex: 1, background: isDark ? '#222' : '#eee', color: 'var(--app-muted)',
                    border: 'none', borderRadius: 8, padding: '7px', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Отмена</button>
                </div>
              </div>
            ) : (
              <div style={{
                background: PRIORITY_BG[task.priority],
                borderRadius: 14,
                border: `1px solid ${PRIORITY_COLORS[task.priority]}44`,
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
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => onTaskClick(task)} role="button">
                  <p style={{
                    fontSize: 14, fontWeight: 500, lineHeight: 1.4,
                    textDecoration: task.done ? 'line-through' : 'none',
                    wordBreak: 'break-word',
                  }}>{task.text}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: PRIORITY_COLORS[task.priority], fontWeight: 500 }}>
                      ● {PRIORITY_LABELS[task.priority]}
                    </span>
                    {task.taskDate && (
                      <span style={{ fontSize: 11, color: 'var(--app-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Icon name="Calendar" size={10} />
                        {(() => { const [y,m,d] = task.taskDate!.split('-'); return `${d} ${['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][+m-1]}`; })()}
                        {task.taskTime && <><Icon name="Clock" size={10} />{task.taskTime}</>}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => startEdit(task)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-muted)', padding: 2, flexShrink: 0,
                }}>
                  <Icon name="Pencil" size={14} />
                </button>
                <button onClick={() => remove(task.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-muted)', padding: 2, flexShrink: 0,
                }}>
                  <Icon name="Trash2" size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────── CALENDAR ──────────────────────── */
function CalendarView({ tasks, setTasks, calDate, setCalDate, isDark, startMonday }: {
  tasks: Task[];
  setTasks: (v: Task[] | ((p: Task[]) => Task[])) => void;
  calDate: Date;
  setCalDate: (d: Date) => void;
  isDark: boolean;
  startMonday: boolean;
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

  const dayHeaders = startMonday ? ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'] : DAYS_RU;

  // Недели
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  days.forEach((d, i) => {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  });
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const [addingForDate, setAddingForDate] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('mid');
  const [newTaskTime, setNewTaskTime] = useState('');

  const bg = isDark ? '#1a1a1a' : '#fff';
  const bgPaper = isDark ? '#0f0f0f' : 'var(--app-paper)';

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    const key = t.taskDate || t.createdAt.split('T')[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const toggleWeek = (wi: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(wi)) next.delete(wi); else next.add(wi);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedWeeks(new Set());
      setAllExpanded(false);
    } else {
      setExpandedWeeks(new Set(weeks.map((_, i) => i)));
      setAllExpanded(true);
    }
  };

  const addTaskForDate = (dateIso: string) => {
    if (!newTaskText.trim()) return;
    setTasks((p: Task[]) => [{
      id: uid(), text: newTaskText.trim(), done: false, priority: newTaskPriority,
      createdAt: new Date().toISOString(),
      taskDate: dateIso,
      taskTime: newTaskTime || undefined,
    }, ...p]);
    setNewTaskText(''); setNewTaskTime(''); setNewTaskPriority('mid');
    setAddingForDate(null);
  };

  const toggleTaskDone = (id: string) => setTasks((p: Task[]) => p.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const isWeekendInGrid = (day: Date | null) => {
    if (!day) return false;
    const dow = day.getDay();
    return dow === 0 || dow === 6;
  };

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => setCalDate(new Date(year, month - 1, 1))} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#fff' : 'var(--app-ink)', padding: 6,
        }}>
          <Icon name="ChevronLeft" size={20} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 17 }}>{MONTHS_RU[month]} {year}</span>
        <button onClick={() => setCalDate(new Date(year, month + 1, 1))} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#fff' : 'var(--app-ink)', padding: 6,
        }}>
          <Icon name="ChevronRight" size={20} />
        </button>
      </div>

      {/* Кнопка развернуть/свернуть все */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button onClick={toggleAll} style={{
          background: isDark ? '#222' : '#f0f0f0',
          border: 'none', borderRadius: 20, padding: '5px 14px',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          color: 'var(--app-muted)', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Icon name={allExpanded ? 'ChevronsUp' : 'ChevronsDown'} size={14} />
          {allExpanded ? 'Свернуть все' : 'Развернуть все'}
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {dayHeaders.map((d, i) => {
          const isWknd = startMonday ? i >= 5 : (i === 0 || i === 6);
          return (
            <div key={d} style={{
              textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '4px 0',
              color: isWknd ? 'var(--app-tag-low)' : 'var(--app-muted)',
            }}>
              {d}
            </div>
          );
        })}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => {
        const isExpanded = expandedWeeks.has(wi);
        const weekDates = week.filter(Boolean) as Date[];
        const weekHasTasks = weekDates.some(d => (tasksByDate[toIso(d)] || []).length > 0);

        return (
          <div key={wi} style={{ marginBottom: 6 }}>
            {/* Week row — days grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2,
              background: isExpanded ? (isDark ? '#1a1a1a' : '#fff') : 'transparent',
              borderRadius: isExpanded ? '14px 14px 0 0' : 10,
              border: isExpanded ? `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}` : '1px solid transparent',
              borderBottom: isExpanded ? 'none' : undefined,
              padding: isExpanded ? '6px 6px 0' : '2px',
            }}>
              {week.map((day, di) => {
                if (!day) return <div key={di} />;
                const iso = toIso(day);
                const isToday = day.toDateString() === today.toDateString();
                const dayTaskCount = (tasksByDate[iso] || []).length;
                const weekend = isWeekendInGrid(day);

                return (
                  <div key={di} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <button onClick={() => toggleWeek(wi)} style={{
                      width: '100%', aspectRatio: '1', borderRadius: 10,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                      background: isToday ? (isDark ? '#333' : '#e8f0ff') : 'transparent',
                      border: isToday ? `2px solid var(--app-blue)` : '2px solid transparent',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 500,
                        color: weekend ? 'var(--app-tag-low)' : 'var(--app-muted)',
                        lineHeight: 1,
                      }}>
                        {DAYS_RU[day.getDay()]}
                      </span>
                      <span style={{
                        fontSize: 14, fontWeight: isToday ? 700 : 400,
                        color: isToday ? 'var(--app-blue)' : weekend ? '#34c759' : (isDark ? '#f0f0f0' : 'var(--app-ink)'),
                        lineHeight: 1,
                      }}>
                        {day.getDate()}
                      </span>
                      {dayTaskCount > 0 && (
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: 'var(--app-blue)',
                          marginTop: 1,
                        }} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Expanded week content */}
            {isExpanded && (
              <div style={{
                background: isDark ? '#1a1a1a' : '#fff',
                border: `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}`,
                borderTop: 'none',
                borderRadius: '0 0 14px 14px',
                padding: '8px 10px 12px',
                animation: 'fade-in .2s ease-out',
              }}>
                {/* Задачи по дням недели */}
                {weekDates.map(day => {
                  const iso = toIso(day);
                  const dayTasks = tasksByDate[iso] || [];
                  const weekend = isWeekendInGrid(day);
                  const isToday = day.toDateString() === today.toDateString();

                  return (
                    <div key={iso} style={{ marginBottom: 10 }}>
                      {/* Заголовок дня */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 4,
                      }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: isToday ? 'var(--app-blue)' : weekend ? 'var(--app-tag-low)' : 'var(--app-muted)',
                        }}>
                          {DAYS_RU_FULL[day.getDay()]}, {day.getDate()} {MONTHS_RU[day.getMonth()]}
                        </span>
                        <button onClick={() => {
                          if (addingForDate === iso) {
                            setAddingForDate(null);
                          } else {
                            setNewTaskText('');
                            setNewTaskTime('');
                            setNewTaskPriority('mid');
                            setAddingForDate(iso);
                          }
                        }} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--app-blue)', padding: 2,
                        }}>
                          <Icon name="Plus" size={15} />
                        </button>
                      </div>

                      {/* Форма добавления задачи */}
                      {addingForDate === iso && (
                        <div style={{
                          background: isDark ? '#222' : '#f8f8f8',
                          borderRadius: 10, padding: '8px 10px', marginBottom: 6,
                          border: `1px solid ${isDark ? '#333' : 'var(--app-line)'}`,
                          animation: 'fade-in .15s ease-out',
                        }}>
                          <input
                            autoFocus
                            value={newTaskText}
                            onChange={e => setNewTaskText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTaskForDate(iso)}
                            placeholder="Текст задачи..."
                            style={{
                              width: '100%', background: 'none', border: 'none', outline: 'none',
                              fontSize: 13, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
                              fontFamily: 'inherit', marginBottom: 6,
                            }}
                          />
                          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                            <input type="time" value={newTaskTime} onChange={e => setNewTaskTime(e.target.value)} style={{
                              background: isDark ? '#2a2a2a' : '#eee', border: 'none', borderRadius: 6,
                              padding: '3px 6px', fontSize: 12, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
                              fontFamily: 'inherit', outline: 'none',
                            }} />
                            {(['high', 'mid', 'low'] as Priority[]).map(p => (
                              <button type="button" key={p} onClick={() => setNewTaskPriority(p)} style={{
                                padding: '2px 8px', borderRadius: 20,
                                border: `1.5px solid ${newTaskPriority === p ? PRIORITY_COLORS[p] : 'transparent'}`,
                                background: newTaskPriority === p ? PRIORITY_BG[p] : 'transparent',
                                color: newTaskPriority === p ? PRIORITY_COLORS[p] : 'var(--app-muted)',
                                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                              }}>{PRIORITY_LABELS[p]}</button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={() => addTaskForDate(iso)} style={{
                              flex: 1, background: isDark ? '#fff' : 'var(--app-ink)',
                              color: isDark ? '#000' : '#fff',
                              border: 'none', borderRadius: 7, padding: '6px',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                            }}>Добавить</button>
                            <button type="button" onClick={() => { setAddingForDate(null); setNewTaskText(''); }} style={{
                              flex: 1, background: isDark ? '#2a2a2a' : '#eee',
                              border: 'none', borderRadius: 7, padding: '6px',
                              fontSize: 12, color: 'var(--app-muted)', cursor: 'pointer', fontFamily: 'inherit',
                            }}>Отмена</button>
                          </div>
                        </div>
                      )}

                      {/* Задачи дня */}
                      {dayTasks.length === 0 ? (
                        <p style={{ fontSize: 12, color: isDark ? '#444' : '#ccc', padding: '2px 0 0 4px' }}>—</p>
                      ) : (
                        dayTasks.map(task => (
                          <div key={task.id} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 8,
                            background: PRIORITY_BG[task.priority],
                            borderRadius: 8, padding: '6px 8px', marginBottom: 4,
                            border: `1px solid ${PRIORITY_COLORS[task.priority]}33`,
                          }}>
                            <button onClick={() => toggleTaskDone(task.id)} style={{
                              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                              border: `2px solid ${task.done ? PRIORITY_COLORS[task.priority] : (isDark ? '#555' : '#bbb')}`,
                              background: task.done ? PRIORITY_COLORS[task.priority] : 'transparent',
                              cursor: 'pointer', marginTop: 2,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {task.done && <Icon name="Check" size={9} style={{ color: '#fff' }} />}
                            </button>
                            <div style={{ flex: 1 }}>
                              <span style={{
                                fontSize: 13, fontWeight: 500, lineHeight: 1.4,
                                textDecoration: task.done ? 'line-through' : 'none',
                                opacity: task.done ? 0.6 : 1,
                                wordBreak: 'break-word',
                                display: 'block',
                              }}>{task.text}</span>
                              {task.taskTime && (
                                <span style={{ fontSize: 11, color: 'var(--app-muted)' }}>{task.taskTime}</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}

                {/* Свернуть */}
                <button onClick={() => toggleWeek(wi)} style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--app-muted)', fontSize: 12, fontWeight: 500,
                  padding: '6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  fontFamily: 'inherit',
                }}>
                  <Icon name="ChevronUp" size={14} /> Свернуть
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────── REMINDERS ──────────────────────── */
function RemindersView({ reminders, setReminders, isDark, showToast }: {
  reminders: Reminder[];
  setReminders: (v: Reminder[] | ((p: Reminder[]) => Reminder[])) => void;
  isDark: boolean;
  showToast: (s: string) => void;
}) {
  const [text, setText] = useState('');
  const [time, setTime] = useState('09:00');
  const [advanceType, setAdvanceType] = useState<'none' | 'day' | 'hours' | 'custom'>('none');
  const [advanceHours, setAdvanceHours] = useState(1);
  const [advanceMinutes, setAdvanceMinutes] = useState(30);
  const bg = isDark ? '#1a1a1a' : '#fff';

  const scheduleNotif = (r: Reminder) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const [h, m] = r.time.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);

    const fire = (at: Date, label: string) => {
      const ms = at.getTime() - now.getTime();
      if (ms > 0) setTimeout(() => new Notification('Ежедневник', { body: `${r.text} (${label})` }), ms);
    };

    fire(target, 'в срок');
    if (r.advanceType === 'day') {
      const early = new Date(target.getTime() - 24 * 3600 * 1000);
      fire(early, 'за сутки');
    } else if (r.advanceType === 'hours') {
      const early = new Date(target.getTime() - (r.advanceHours || 1) * 3600 * 1000);
      fire(early, `за ${r.advanceHours || 1} ч`);
    } else if (r.advanceType === 'custom') {
      const ms2 = ((r.advanceHours || 0) * 60 + (r.advanceMinutes || 0)) * 60 * 1000;
      const early = new Date(target.getTime() - ms2);
      fire(early, `заранее`);
    }
  };

  const add = () => {
    if (!text.trim()) return;
    const r: Reminder = {
      id: uid(), text: text.trim(), time, enabled: true,
      advanceType: advanceType === 'none' ? undefined : (advanceType as 'day' | 'hours' | 'custom'),
      advanceHours: advanceType !== 'none' ? advanceHours : undefined,
      advanceMinutes: advanceType === 'custom' ? advanceMinutes : undefined,
    };
    setReminders((p: Reminder[]) => [r, ...p]);
    scheduleNotif(r);
    setText('');
    showToast('Напоминание добавлено');
  };

  const toggle = (id: string) => setReminders((p: Reminder[]) => p.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const remove = (id: string) => { setReminders((p: Reminder[]) => p.filter(r => r.id !== id)); showToast('Напоминание удалено'); };

  return (
    <div style={{ padding: '16px 20px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Icon name="Clock" size={14} style={{ color: 'var(--app-muted)' }} />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{
            background: isDark ? '#222' : '#f4f4f4', border: 'none', borderRadius: 8,
            padding: '6px 10px', fontSize: 14, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
            fontFamily: 'inherit', outline: 'none',
          }} />
        </div>

        {/* Предупреждение заранее */}
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: 'var(--app-muted)', marginBottom: 6, fontWeight: 500 }}>Предупредить заранее:</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['none', 'day', 'hours', 'custom'] as const).map(type => (
              <button key={type} onClick={() => setAdvanceType(type)} style={{
                padding: '4px 10px', borderRadius: 20,
                border: `1.5px solid ${advanceType === type ? 'var(--app-blue)' : 'transparent'}`,
                background: advanceType === type ? 'rgba(0,122,255,0.1)' : (isDark ? '#222' : '#f4f4f4'),
                color: advanceType === type ? 'var(--app-blue)' : 'var(--app-muted)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {{ none: 'Нет', day: 'За сутки', hours: 'За часы', custom: 'Своё время' }[type]}
              </button>
            ))}
          </div>
          {advanceType === 'hours' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--app-muted)' }}>За</span>
              <input type="number" min={1} max={48} value={advanceHours}
                onChange={e => setAdvanceHours(Number(e.target.value))}
                style={{
                  width: 50, background: isDark ? '#222' : '#f4f4f4', border: 'none', borderRadius: 6,
                  padding: '4px 8px', fontSize: 13, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
                  fontFamily: 'inherit', outline: 'none', textAlign: 'center',
                }} />
              <span style={{ fontSize: 12, color: 'var(--app-muted)' }}>ч</span>
            </div>
          )}
          {advanceType === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--app-muted)' }}>За</span>
              <input type="number" min={0} max={48} value={advanceHours}
                onChange={e => setAdvanceHours(Number(e.target.value))}
                style={{
                  width: 50, background: isDark ? '#222' : '#f4f4f4', border: 'none', borderRadius: 6,
                  padding: '4px 8px', fontSize: 13, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
                  fontFamily: 'inherit', outline: 'none', textAlign: 'center',
                }} />
              <span style={{ fontSize: 12, color: 'var(--app-muted)' }}>ч</span>
              <input type="number" min={0} max={59} value={advanceMinutes}
                onChange={e => setAdvanceMinutes(Number(e.target.value))}
                style={{
                  width: 50, background: isDark ? '#222' : '#f4f4f4', border: 'none', borderRadius: 6,
                  padding: '4px 8px', fontSize: 13, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
                  fontFamily: 'inherit', outline: 'none', textAlign: 'center',
                }} />
              <span style={{ fontSize: 12, color: 'var(--app-muted)' }}>мин</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={add} style={{
            background: isDark ? '#fff' : 'var(--app-ink)', color: isDark ? '#000' : '#fff',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Icon name="Clock" size={12} />
                <span style={{ fontSize: 12, color: 'var(--app-muted)' }}>{r.time}</span>
                {r.advanceType === 'day' && (
                  <span style={{ fontSize: 11, color: 'var(--app-blue)' }}>• за сутки</span>
                )}
                {r.advanceType === 'hours' && (
                  <span style={{ fontSize: 11, color: 'var(--app-blue)' }}>• за {r.advanceHours} ч</span>
                )}
                {r.advanceType === 'custom' && (
                  <span style={{ fontSize: 11, color: 'var(--app-blue)' }}>• за {r.advanceHours}ч {r.advanceMinutes}мин</span>
                )}
              </div>
            </div>
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
  notes: Note[];
  setNotes: (v: Note[] | ((p: Note[]) => Note[])) => void;
  isDark: boolean;
  showToast: (s: string) => void;
}) {
  const [active, setActive] = useState<Note | null>(null);
  const [text, setText] = useState('');
  const bg = isDark ? '#1a1a1a' : '#fff';

  const openNew = () => {
    const n: Note = { id: uid(), text: '', updatedAt: new Date().toISOString() };
    setNotes((p: Note[]) => [n, ...p]);
    setActive(n); setText('');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button onClick={save} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--app-blue)', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
          }}>← Назад</button>
          <span style={{ fontSize: 12, color: 'var(--app-muted)', marginLeft: 'auto' }}>
            {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Начните писать..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none',
            fontSize: 15, lineHeight: 1.6, color: isDark ? '#f0f0f0' : 'var(--app-ink)',
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
        border: `1px dashed ${isDark ? '#333' : 'var(--app-line)'}`,
        borderRadius: 14, padding: '12px',
        color: 'var(--app-muted)', fontSize: 14, fontFamily: 'inherit',
        marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer', animation: 'fade-in .3s ease-out',
      }}>
        <Icon name="Plus" size={16} /> Новая заметка
      </button>

      {notes.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--app-muted)', padding: '40px 0', fontSize: 14 }}>Нет заметок</div>
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
  settings: AppSettings;
  setSettings: (v: AppSettings | ((p: AppSettings) => AppSettings)) => void;
  isDark: boolean;
  showToast: (s: string) => void;
}) {
  const bg = isDark ? '#1a1a1a' : '#fff';
  const update = (patch: Partial<AppSettings>) => setSettings((p: AppSettings) => ({ ...p, ...patch }));

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
      <div style={{ background: bg, borderRadius: 14, border: `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}`, padding: '14px 16px' }}>
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
      <div style={{ background: bg, borderRadius: 14, border: `1px solid ${isDark ? '#2a2a2a' : 'var(--app-line)'}`, padding: '14px 16px' }}>
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