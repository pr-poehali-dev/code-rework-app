import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { Task, Priority, PRIORITY_LABELS, PRIORITY_COLORS, DAYS_RU, MONTHS_RU, uid } from '@/components/types';

/* ──────────────────────── TASKS ──────────────────────── */
export function TasksView({ tasks, setTasks, isDark, showToast }: {
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
export function CalendarView({ tasks, calDate, setCalDate, isDark, startMonday }: {
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
