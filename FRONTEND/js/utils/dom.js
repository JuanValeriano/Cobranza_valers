/**
 * @param {string} selector 
 * @param {Element|Document} context 
 * @returns {Element|null}
 */
export const $ = (selector, context = document) => context.querySelector(selector);

/**
 * @param {string} selector 
 * @param {Element|Document} context 
 * @returns {NodeList}
 */
export const $$ = (selector, context = document) => context.querySelectorAll(selector);

/**
 * @param {string} elementId 
 */
export function toggleForm(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.classList.toggle('open');
}

/**
 * @param {string} str 
 * @returns {string}
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
