import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Reminder, Note, uid } from '@/components/types';

/* ──────────────────────── REMINDERS ──────────────────────── */
export function RemindersView({ reminders, setReminders, isDark, showToast }: {
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
export function NotesView({ notes, setNotes, isDark, showToast }: {
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
