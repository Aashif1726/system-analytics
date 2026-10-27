async function request(path, method = 'GET') {
  const res = await fetch(`/api${path}`, { method });
  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || data.message || message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path) => request(path, 'POST'),
};
