const BASE_URL = 'http://localhost:5000/api/venue-feedback';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getVenueFeedbackList = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}?${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch venue feedback');
  return data;
};

export const createVenueFeedback = async (payload) => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit venue feedback');
  return data;
};

export const getVenueFeedbackById = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch feedback details');
  return data.data;
};

export const updateVenueFeedbackStatus = async (id, payload) => {
  const res = await fetch(`${BASE_URL}/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update feedback status');
  return data;
};

export const updateVenueFeedback = async (id, payload) => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update feedback record');
  return data;
};

export const deleteVenueFeedback = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete feedback record');
  return data;
};

export const getVenueFeedbackHistory = async (venueId) => {
  const res = await fetch(`${BASE_URL}/venue/${venueId}/history`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch venue history');
  return data.data;
};

export const escalateVenueFeedback = async (id, payload) => {
  const res = await fetch(`${BASE_URL}/${id}/escalate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to escalate feedback');
  return data;
};

export const notifySubmitter = async (id, payload) => {
  const res = await fetch(`${BASE_URL}/${id}/notify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to notify submitter');
  return data;
};

