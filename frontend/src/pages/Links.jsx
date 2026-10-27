import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function Links() {
  const [links, setLinks] = useState([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  async function load() {
    try {
      setLinks(await api.get('/links'));
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
    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
    try {
      await api.post('/links', { title: title.trim() || host(target), url: target, category: category.trim() });
      setTitle('');
      setUrl('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    try { await api.del(`/links/${id}`); await load(); } catch (e) { setError(e.message); }
  }

  const groups = useMemo(() => {
    const map = new Map();
    for (const l of links) {
      const key = l.category || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(l);
    }
    return [...map.entries()];
  }, [links]);

  const categories = groups.map(([name]) => name);

  return (
    <>
      <header className="page-head">
        <h1>Links</h1>
        <span className="muted">{links.length} saved</span>
      </header>

      <form className="card add-row" onSubmit={add}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" aria-label="URL" required />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" aria-label="Title" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category"
               aria-label="Category" list="link-categories" />
        <datalist id="link-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        <button className="btn primary" disabled={!url.trim()}>Save</button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      {groups.map(([name, items]) => (
        <section key={name}>
          <h2 className="section-title">{name}</h2>
          <div className="grid links">
            {items.map((l) => (
              <div key={l.id} className="card link-card">
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  <span className="link-title">{l.title}</span>
                  <span className="muted small">{host(l.url)}</span>
                </a>
                <button className="icon-btn" onClick={() => remove(l.id)} aria-label={`Delete ${l.title}`}>✕</button>
              </div>
            ))}
          </div>
        </section>
      ))}
      {loaded && links.length === 0 && !error && <p className="empty">No links yet. Save your first one above.</p>}
    </>
  );
}
