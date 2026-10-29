export const HUGGINGFACE_URL = 'https://TU-USUARIO-valer-backend.hf.space';

export function getApiBaseUrl() {
  const customUrl = localStorage.getItem('VALER_BACKEND_URL');
  if (customUrl) return customUrl.replace(/\/+$/, '') + '/api';

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
  if (isLocal) {
    return (window.location.port === '8000')
      ? `${window.location.origin}/api`
      : 'http://127.0.0.1:8000/api';
  }

  return `${HUGGINGFACE_URL.replace(/\/+$/, '')}/api`;
}

async function request(endpoint, options = {}) {
  try {
    const isGet = !options.method || options.method.toUpperCase() === 'GET';
    const sep = endpoint.includes('?') ? '&' : '?';

    const finalEndpoint = isGet ? `${endpoint}${sep}_t=${Date.now()}` : endpoint;
    const url = `${getApiBaseUrl()}${finalEndpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      ...options.headers,
    };

    const response = await fetch(url, { cache: 'no-store', ...options, headers });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en API (${response.status}): ${errorText}`);
    }
    return await response.json();
  } catch (err) {
    console.warn(`[API] Fallo en ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  async getState() {
    return request('/state');
  },
  async getWorkers() {
    return request('/trabajadores');
  },

  async createWorker(workerData) {
    return request('/trabajadores', {
      method: 'POST',
      body: JSON.stringify(workerData)
    });
  },

  async updateWorker(id, workerData) {
    return request(`/trabajadores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workerData)
    });
  },

  async toggleWorker(id) {
    return request(`/trabajadores/${id}/toggle`, {
      method: 'PATCH'
    });
  },

  async getRates() {
    return request('/tarifas');
  },

  async createRate(rateData) {
    return request('/tarifas', {
      method: 'POST',
      body: JSON.stringify(rateData)
    });
  },

  async updateRate(id, rateData) {
    return request(`/tarifas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rateData)
    });
  },

  async toggleRate(id) {
    return request(`/tarifas/${id}/toggle`, {
      method: 'PATCH'
    });
  },
  async createRecord(recordData) {
    return request('/registros', {
      method: 'POST',
      body: JSON.stringify(recordData)
    });
  },

  async updateRecord(id, recordData) {
    return request(`/registros/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recordData)
    });
  },

  async deleteRecord(id) {
    return request(`/registros/${id}`, {
      method: 'DELETE'
    });
  },

  async closeWeek(cierreId) {
    return request(`/cierres/${cierreId}/close`, {
      method: 'POST'
    });
  },

  async reopenWeek(cierreId) {
    return request(`/cierres/${cierreId}/reopen`, {
      method: 'POST'
    });
  },

  async createNewWeek() {
    return request('/cierres/nueva-semana', {
      method: 'POST'
    });
  },

  async updatePago(cierreId, workerId, pagoData) {
    return request(`/pagos/${cierreId}/${workerId}`, {
      method: 'PUT',
      body: JSON.stringify(pagoData)
    });
  }
};

