const BASE_URL = 'http://localhost:5000/api/department-admin';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getDepartmentDashboard = async () => {
  const res = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch department dashboard');
  return data.data;
};

export const getDepartmentFaculty = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/faculty?${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch department faculty');
  return data;
};

export const addDepartmentFaculty = async (facultyData) => {
  const res = await fetch(`${BASE_URL}/faculty`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(facultyData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add faculty');
  return data;
};

export const updateDepartmentFaculty = async (id, facultyData) => {
  const res = await fetch(`${BASE_URL}/faculty/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(facultyData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update faculty');
  return data;
};

export const toggleFacultyStatus = async (id) => {
  const res = await fetch(`${BASE_URL}/faculty/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to toggle faculty status');
  return data;
};

export const deleteDepartmentFaculty = async (id) => {
  const res = await fetch(`${BASE_URL}/faculty/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete faculty');
  return data;
};

export const getDepartmentVenues = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/venues?${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch venues');
  return data;
};

export const createDepartmentVenue = async (venueData) => {
  const res = await fetch(`${BASE_URL}/venues`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(venueData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create venue');
  return data;
};

export const updateDepartmentVenue = async (id, venueData) => {
  const res = await fetch(`${BASE_URL}/venues/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(venueData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update venue');
  return data;
};

export const deleteDepartmentVenue = async (id) => {
  const res = await fetch(`${BASE_URL}/venues/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete venue');
  return data;
};

export const getDepartmentBookings = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/bookings?${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch department bookings');
  return data;
};

export const approveDepartmentBooking = async (id) => {
  const res = await fetch(`${BASE_URL}/bookings/${id}/approve`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to approve booking');
  return data;
};

export const rejectDepartmentBooking = async (id, rejectionReason) => {
  const res = await fetch(`${BASE_URL}/bookings/${id}/reject`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ rejectionReason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reject booking');
  return data;
};

export const cancelDepartmentBooking = async (id, cancellationReason) => {
  const res = await fetch(`${BASE_URL}/bookings/${id}/cancel`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ cancellationReason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to cancel booking');
  return data;
};

export const getDepartmentReports = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/reports?${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch department reports');
  return data;
};
