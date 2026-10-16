const BASE_URL = 'http://localhost:5000/api/master-admin';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getMasterDashboard = async () => {
  const res = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch master dashboard');
  return data.data;
};

export const getDepartmentAdmins = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/admins?${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch department admins');
  return data;
};

export const createDepartmentAdmin = async (adminData) => {
  const res = await fetch(`${BASE_URL}/admins`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(adminData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create department admin');
  return data;
};

export const updateDepartmentAdmin = async (id, adminData) => {
  const res = await fetch(`${BASE_URL}/admins/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(adminData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update department admin');
  return data;
};

export const toggleAdminStatus = async (id) => {
  const res = await fetch(`${BASE_URL}/admins/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to toggle admin status');
  return data;
};

export const resetAdminPassword = async (id, newPassword) => {
  const res = await fetch(`${BASE_URL}/admins/${id}/reset-password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reset password');
  return data;
};

export const getAllPermissions = async () => {
  const res = await fetch(`${BASE_URL}/permissions`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch permissions');
  return data.data;
};

export const getAdminPermissions = async (id) => {
  const res = await fetch(`${BASE_URL}/admins/${id}/permissions`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch admin permissions');
  return data;
};

export const updateAdminPermissions = async (id, permissions) => {
  const res = await fetch(`${BASE_URL}/admins/${id}/permissions`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ permissions }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update permissions');
  return data;
};

export const getMasterVenues = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/venues?${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch venues');
  return data;
};

export const createMasterVenue = async (venueData) => {
  const res = await fetch(`${BASE_URL}/venues`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(venueData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create venue');
  return data;
};

export const createCommonVenue = async (venueData) => {
  const res = await fetch(`${BASE_URL}/common-venues`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(venueData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create common venue');
  return data;
};

export const updateMasterVenue = async (id, venueData) => {
  const res = await fetch(`${BASE_URL}/venues/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(venueData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update venue');
  return data;
};

export const getVenueAccessRules = async (id) => {
  const res = await fetch(`${BASE_URL}/venues/${id}/access`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch venue access rules');
  return data;
};

export const updateVenueAccessRules = async (id, allowedDepartmentIds) => {
  const res = await fetch(`${BASE_URL}/venues/${id}/access`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ allowedDepartmentIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update venue access rules');
  return data;
};

export const getSystemAuditLogs = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/audit-logs?${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch audit logs');
  return data;
};

export const getMasterNotificationSettings = async () => {
  const res = await fetch(`${BASE_URL}/notification-settings`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch notification settings');
  return data.settings;
};

export const updateMasterNotificationSettings = async (settings) => {
  const res = await fetch(`${BASE_URL}/notification-settings`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update notification settings');
  return data;
};
