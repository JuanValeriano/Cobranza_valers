import { money } from '../utils/formatters.js';

/**
 * @param {HTMLElement} container 
 * @param {Array<{label: string, value: number, color: string}>} data 
 */
export function renderBarListChart(container, data) {
  if (!container) return;
  const max = Math.max(1, ...data.map(d => d.value));

  if (!data || data.length === 0 || data.every(d => d.value === 0)) {
    container.innerHTML = `<div class="empty">Sin datos registrados para este periodo</div>`;
    return;
  }

  container.innerHTML = data.map(d => `
    <div class="bar-row">
      <span>${d.label}</span>
      <span class="bar-track">
        <span class="bar-fill" style="width: ${(d.value / max * 100).toFixed(1)}%; background: ${d.color};"></span>
      </span>
      <span class="mono num">${money(d.value)}</span>
    </div>
  `).join('');
}

/**
 * @param {HTMLElement} container 
 * @param {Array<{label: string, value: number, color: string}>} data 
 */
export function renderDonutChart(container, data) {
  if (!container) return;
  const total = data.reduce((a, d) => a + d.value, 0) || 1;

  if (total <= 1 && data.every(d => d.value === 0)) {
    container.innerHTML = `<div class="empty">Sin datos registrados para este periodo</div>`;
    return;
  }

  let acc = 0;
  const r = 52, cx = 64, cy = 64, C = 2 * Math.PI * r;

  const segs = data.map(d => {
    const frac = d.value / total;
    const dash = frac * C;
    const seg = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}" stroke-width="16"
        stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-acc}"
        transform="rotate(-90 ${cx} ${cy})"/>
    `;
    acc += dash;
    return seg;
  }).join('');

  const legend = data.map(d => `
    <span>
      <span class="dot" style="background: ${d.color};"></span>
      ${d.label} · ${money(d.value)}
    </span>
  `).join('');

  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap;">
      <svg width="128" height="128" viewBox="0 0 128 128">${segs}</svg>
      <div class="chart-legend" style="margin-top: 0; flex-direction: column; gap: 8px;">${legend}</div>
    </div>
  `;
}
