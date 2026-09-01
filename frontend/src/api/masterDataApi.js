const API_URL = 'http://localhost:5000/api';

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Request failed.');
  return data;
};

export const getAdminDepartments = () => request('/departments/admin', { headers: headers() });
export const createDepartment = (name) => request('/departments', { method: 'POST', headers: headers(), body: JSON.stringify({ name }) });
export const updateDepartment = (id, name, isActive) => request(`/departments/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ name, isActive }) });
export const deleteDepartment = (id) => request(`/departments/${id}`, { method: 'DELETE', headers: headers() });

export const getVenueTypes = () => request('/venue-types');
export const getAdminVenueTypes = () => request('/venue-types/admin', { headers: headers() });
export const createVenueType = (name) => request('/venue-types', { method: 'POST', headers: headers(), body: JSON.stringify({ name }) });
export const updateVenueType = (id, name, isActive) => request(`/venue-types/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ name, isActive }) });
export const deleteVenueType = (id) => request(`/venue-types/${id}`, { method: 'DELETE', headers: headers() });

export const getVenueFacilities = () => request('/venue-facilities');
export const getAdminVenueFacilities = () => request('/admin/venue-facilities', { headers: headers() });
export const createVenueFacility = (name) => request('/admin/venue-facilities', { method: 'POST', headers: headers(), body: JSON.stringify({ name }) });
export const updateVenueFacility = (id, name, isActive) => request(`/admin/venue-facilities/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ name, isActive }) });
export const deleteVenueFacility = (id) => request(`/admin/venue-facilities/${id}`, { method: 'DELETE', headers: headers() });
