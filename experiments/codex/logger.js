/* One local snapshot keeps events and the once-per-session flag together. */
(() => {
  'use strict';
  const key = 'commute-research-prototype-v1';
  let storageAvailable = true;
  function load() {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { version: 1, session: null, events: [] };
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.events)) throw new Error('Invalid snapshot');
      const s = data.session;
      if (s && (typeof s.id !== 'string' || !['goal', 'ott', 'feed', 'reflection'].includes(s.screen) ||
          typeof s.interventionUsed !== 'boolean' || typeof s.interventionOpen !== 'boolean' ||
          typeof s.completed !== 'boolean' || typeof s.started !== 'boolean' ||
          !(s.rating === null || Number.isInteger(s.rating) && s.rating >= 1 && s.rating <= 5))) data.session = null;
      return data;
    } catch (error) {
      // Invalid JSON can be replaced; inaccessible storage is reported to the researcher.
      if (!(error instanceof SyntaxError) && error.message !== 'Invalid snapshot') storageAvailable = false;
      return { version: 1, session: null, events: [] };
    }
  }
  function save(data) {
    try { localStorage.setItem(key, JSON.stringify(data)); storageAvailable = true; }
    catch { storageAvailable = false; }
  }
  function record(data, name, details = {}) {
    data.events.push({ name, timestamp: new Date().toISOString(), sessionId: data.session.id, ...details });
    save(data);
  }
  window.ResearchStore = { key, load, save, record, get available() { return storageAvailable; } };
})();
