import { useCallback, useEffect, useRef, useState } from 'react';
import { api, downloadFile } from '../api.js';
import { formatBytes, formatDateTime } from '../format.js';

export default function Files() {
  const [path, setPath] = useState('');
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [folderName, setFolderName] = useState('');
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/files?path=${encodeURIComponent(path)}`);
      setEntries(res.entries);
      setError('');
    } catch (e) {
      setError(e.message);
      setEntries([]);
    }
  }, [path]);

  useEffect(() => { load(); }, [load]);

  async function upload(fileList) {
    const files = [...fileList];
    if (files.length === 0) return;
    const form = new FormData();
    form.append('path', path);
    files.forEach((f) => form.append('file', f));
    setBusy(true);
    try {
      await api.post('/files/upload', form);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function makeFolder(e) {
    e.preventDefault();
    if (!folderName.trim()) return;
    try {
      await api.post('/files/folder', { path, name: folderName.trim() });
      setFolderName('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(entry) {
    const what = entry.directory ? `folder "${entry.name}" and everything in it` : `"${entry.name}"`;
    if (!window.confirm(`Delete ${what}?`)) return;
    try {
      await api.del(`/files?path=${encodeURIComponent(entry.path)}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function download(entry) {
    try { await downloadFile(entry.path, entry.name); } catch (e) { setError(e.message); }
  }

  const crumbs = path ? path.split('/') : [];

  return (
    <>
      <header className="page-head">
        <h1>Files</h1>
        <div className="head-actions">
          <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
          <button className="btn primary" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </header>

      <nav className="crumbs" aria-label="Folder path">
        <button className="crumb" onClick={() => setPath('')}>Vault</button>
        {crumbs.map((c, i) => (
          <span key={i}>
            <span className="muted"> / </span>
            <button className="crumb" onClick={() => setPath(crumbs.slice(0, i + 1).join('/'))}>{c}</button>
          </span>
        ))}
      </nav>

      <form className="add-row compact" onSubmit={makeFolder}>
        <input value={folderName} onChange={(e) => setFolderName(e.target.value)}
               placeholder="New folder name" aria-label="New folder name" />
        <button className="btn" disabled={!folderName.trim()}>Create folder</button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      <div className={`card dropzone ${dragging ? 'dragging' : ''}`}
           onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
           onDragLeave={() => setDragging(false)}
           onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}>
        {entries.length === 0 && !error ? (
          <p className="empty">This folder is empty. Drop files here or use Upload.</p>
        ) : (
          <table className="files">
            <thead>
              <tr><th>Name</th><th className="num">Size</th><th>Modified</th><th /></tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.path}>
                  <td>
                    {e.directory ? (
                      <button className="link-btn" onClick={() => setPath(e.path)}>📁 {e.name}</button>
                    ) : (
                      <button className="link-btn" onClick={() => download(e)}>📄 {e.name}</button>
                    )}
                  </td>
                  <td className="num muted">{e.directory ? '–' : formatBytes(e.size)}</td>
                  <td className="muted">{formatDateTime(e.modified)}</td>
                  <td className="actions">
                    {!e.directory && <button className="btn ghost small" onClick={() => download(e)}>Download</button>}
                    <button className="icon-btn" onClick={() => remove(e)} aria-label={`Delete ${e.name}`}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
