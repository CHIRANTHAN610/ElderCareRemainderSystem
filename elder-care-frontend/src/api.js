const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

async function requestJson(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Request failed with status ${res.status}`);
  }

  return res.json();
}

async function requestText(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Request failed with status ${res.status}`);
  }
  return res.text();
}

// Elders API (/api/elders)
export const eldersApi = {
  getAll: () => requestJson('/api/elders'),
  getById: (id) => requestJson(`/api/elders/${id}`),
  create: (elder) =>
    requestJson('/api/elders', {
      method: 'POST',
      body: JSON.stringify(elder),
    }),
  delete: (id) =>
    requestText(`/api/elders/${id}`, {
      method: 'DELETE',
    }),
};

// Appointments API (/api/appointments)
export const appointmentsApi = {
  getAll: () => requestJson('/api/appointments'),
  getById: (id) => requestJson(`/api/appointments/${id}`),
  create: (appointment) =>
    requestJson('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment),
    }),
  update: (id, appointment) =>
    requestJson(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appointment),
    }),
  delete: (id) =>
    requestText(`/api/appointments/${id}`, {
      method: 'DELETE',
    }),
};

// Medicines API (/api/medicines)
export const medicinesApi = {
  getAll: () => requestJson('/api/medicines'),
  getById: (id) => requestJson(`/api/medicines/${id}`),
  create: (medicine) =>
    requestJson('/api/medicines', {
      method: 'POST',
      body: JSON.stringify(medicine),
    }),
  delete: (id) =>
    requestText(`/api/medicines/${id}`, {
      method: 'DELETE',
    }),
};
