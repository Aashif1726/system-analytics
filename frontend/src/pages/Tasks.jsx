import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatDate } from '../format.js';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

function isOverdue(task) {
  if (task.done || !task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.dueDate}T00:00:00`) < today;
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('open');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  async function load() {
    try {
      setTasks(await api.get('/tasks'));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.post('/tasks', { title: title.trim(), priority, dueDate: dueDate || null });
      setTitle('');
      setDueDate('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(id) {
    try { await api.patch(`/tasks/${id}/toggle`); await load(); } catch (e) { setError(e.message); }
  }

  async function remove(id) {
    try { await api.del(`/tasks/${id}`); await load(); } catch (e) { setError(e.message); }
  }

  const visible = useMemo(() => tasks.filter((t) =>
    filter === 'all' ? true : filter === 'done' ? t.done : !t.done), [tasks, filter]);
  const openCount = tasks.filter((t) => !t.done).length;

  return (
    <>
      <header className="page-head">
        <h1>Tasks</h1>
        <span className="muted">{openCount} open</span>
      </header>

      <form className="card add-row" onSubmit={add}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?"
               aria-label="Task title" maxLength={300} />
        <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
          {PRIORITIES.map((p) => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Due date" />
        <button className="btn primary" disabled={!title.trim()}>Add</button>
      </form>

      <div className="tabs" role="tablist">
        {['open', 'done', 'all'].map((f) => (
          <button key={f} role="tab" aria-selected={filter === f}
                  className={filter === f ? 'tab active' : 'tab'} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <ul className="list">
        {visible.map((t) => (
          <li key={t.id} className={`card row ${t.done ? 'is-done' : ''}`}>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)}
                   aria-label={`Mark "${t.title}" ${t.done ? 'not done' : 'done'}`} />
            <span className="grow title">{t.title}</span>
            <span className={`badge ${t.priority.toLowerCase()}`}>{t.priority.toLowerCase()}</span>
            {t.dueDate && (
              <span className={isOverdue(t) ? 'due overdue' : 'due'}>
                {isOverdue(t) ? 'Overdue · ' : ''}{formatDate(`${t.dueDate}T00:00:00`)}
              </span>
            )}
            <button className="icon-btn" onClick={() => remove(t.id)} aria-label={`Delete "${t.title}"`}>✕</button>
          </li>
        ))}
      </ul>
      {loaded && visible.length === 0 && !error && (
        <p className="empty">{filter === 'done' ? 'Nothing completed yet.' : 'All clear. Add a task above.'}</p>
      )}
    </>
  );
}
