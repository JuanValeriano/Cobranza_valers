import { getInitialSeedData } from './initialData.js';

const STORAGE_KEY = 'destajo_state_v1';

/**
 * @returns {object}
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("No se pudo leer localStorage, inicializando con datos por defecto.", e);
  }
  const initial = getInitialSeedData();
  saveState(initial);
  return initial;
}

/**
 * @param {object} state 
 */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("No se pudo guardar el estado en localStorage.", e);
  }
}
