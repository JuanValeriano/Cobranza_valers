/**
 * @param {string} prefix 
 * @returns {string}
 */
export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @param {number} amount 
 * @returns {string}
 */
export function money(amount) {
  const safe = (Math.round((amount || 0) * 100) / 100);
  return `S/ ${safe.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * @returns {string}
 */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param {Date|string} date 
 * @returns {Date}
 */
export function mondayOf(date) {
  const dt = new Date(date);
  const day = dt.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  dt.setDate(dt.getDate() + diff);
  return dt;
}

/**
 * @param {string} iso 
 * @returns {string}
 */
export function fmtDate(iso) {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

/**
 * @param {string} iso 
 * @param {number} days 
 * @returns {string}
 */
export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
