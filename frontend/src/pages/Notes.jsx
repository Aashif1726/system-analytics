import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { formatDateTime } from '../format.js';

function sortNotes(list) {
  return [...list].sort((a, b) =>
    Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt) - new Date(a.updatedAt));
}

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const draftRef = useRef(null);
  draftRef.current = draft;

  const load = useCallback(async () => {
    try {
      const list = await api.get(`/notes${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
      setNotes(list);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const saveNow = useCallback(async () => {
    const snapshot = draftRef.current;
    if (!dirty || !snapshot) return;
    setStatus('Saving…');
    try {
      const saved = await api.put(`/notes/${snapshot.id}`, {
        title: snapshot.title.trim() || 'Untitled',
        content: snapshot.content,
        pinned: snapshot.pinned,
      });
      // Only clear the dirty flag if nothing was typed while the request was in flight.
      if (draftRef.current === snapshot) setDirty(false);
      setStatus('Saved');
      setNotes((ns) => sortNotes(ns.map((n) => (n.id === saved.id ? saved : n))));
    } catch (e) {
      setStatus(`Save failed: ${e.message}`);
    }
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return undefined;
    const t = setTimeout(saveNow, 800);
    return () => clearTimeout(t);
  }, [dirty, draft, saveNow]);

  async function select(note) {
    await saveNow();
    setDraft({ id: note.id, title: note.title, content: note.content ?? '', pinned: note.pinned });
    setDirty(false);
    setStatus('');
  }

  async function create() {
    await saveNow();
    try {
      const n = await api.post('/notes', { title: 'Untitled', content: '' });
      setQ('');
      setNotes((ns) => sortNotes([n, ...ns]));
      setDraft({ id: n.id, title: n.title, content: '', pinned: false });
      setDirty(false);
      setStatus('');
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove() {
    if (!draft || !window.confirm(`Delete "${draft.title || 'Untitled'}"?`)) return;
    try {
      await api.del(`/notes/${draft.id}`);
      setNotes((ns) => ns.filter((n) => n.id !== draft.id));
      setDraft(null);
      setDirty(false);
      setStatus('');
    } catch (e) {
      setError(e.message);
    }
  }

  function edit(patch) {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  }

  return (
    <>
      <header className="page-head">
        <h1>Notes</h1>
        <button className="btn primary" onClick={create}>New note</button>
      </header>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="notes-layout">
        <aside className="notes-list">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
                 placeholder="Search notes" aria-label="Search notes" />
          <ul className="list">
            {notes.map((n) => (
              <li key={n.id}>
                <button className={`note-item ${draft?.id === n.id ? 'active' : ''}`} onClick={() => select(n)}>
                  <span className="note-title">{n.pinned ? '📌 ' : ''}{n.title}</span>
                  <span className="muted small">{formatDateTime(n.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
          {notes.length === 0 && !error && <p className="empty">{q ? 'No matches.' : 'No notes yet.'}</p>}
        </aside>

        <section className="card editor">
          {!draft ? (
            <p className="empty">Select a note or create a new one.</p>
          ) : (
            <>
              <div className="editor-head">
                <input className="title-input" value={draft.title} maxLength={300}
                       onChange={(e) => edit({ title: e.target.value })} aria-label="Note title" placeholder="Title" />
                <button className="btn ghost" onClick={() => edit({ pinned: !draft.pinned })}
                        aria-pressed={draft.pinned}>{draft.pinned ? 'Unpin' : 'Pin'}</button>
                <button className="btn danger" onClick={remove}>Delete</button>
              </div>
              <textarea value={draft.content} onChange={(e) => edit({ content: e.target.value })}
                        placeholder="Start writing…" aria-label="Note content" />
              <div className="muted small status" aria-live="polite">{dirty && !status ? 'Unsaved changes' : status}</div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
