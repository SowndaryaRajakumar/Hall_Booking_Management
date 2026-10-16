const BASE_URL = 'http://localhost:5000/api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getAcademicCalendar = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/academic-calendar/calendar?${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch academic calendar');
  return data;
};

export const getAcademicAllocations = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/academic-allocations?${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch academic allocations');
  return data;
};

export const getAcademicAllocationById = async (id) => {
  const res = await fetch(`${BASE_URL}/academic-allocations/${id}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch allocation details');
  return data.data;
};

export const createAcademicAllocation = async (payload) => {
  const res = await fetch(`${BASE_URL}/academic-allocations`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || 'Failed to create academic allocation');
    error.conflict = data.conflict;
    error.status = res.status;
    throw error;
  }
  return data;
};

export const updateAcademicAllocation = async (id, payload) => {
  const res = await fetch(`${BASE_URL}/academic-allocations/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || 'Failed to update academic allocation');
    error.conflict = data.conflict;
    error.status = res.status;
    throw error;
  }
  return data;
};

export const updateAcademicAllocationStatus = async (id, status, reason = '') => {
  const res = await fetch(`${BASE_URL}/academic-allocations/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status, reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update allocation status');
  return data;
};

export const deleteAcademicAllocation = async (id) => {
  const res = await fetch(`${BASE_URL}/academic-allocations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete allocation');
  return data;
};

export const updateOccurrenceRemark = async (allocationId, date, payload) => {
  const res = await fetch(`${BASE_URL}/academic-allocations/${allocationId}/occurrences/${date}/remark`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update occurrence remark');
  return data;
};

export const getFacultyVenueHistory = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/academic-allocations/venue-history?${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch venue usage history');
  return data;
};

