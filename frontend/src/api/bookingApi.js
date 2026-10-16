const BASE_URL = "http://localhost:5000/api/admin-bookings";

const buildHeaders = (withJson = true) => {
  const token = localStorage.getItem("token");
  const headers = {};

  if (withJson) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.message || data.error || "Request failed");
    err.status = response.status;
    err.data = data;
    err.conflict = data.conflict;
    err.alternatives = data.alternatives;
    err.conflictDetails = data.conflictDetails;
    throw err;
  }

  return data;
};

export const createBooking = async (payload) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
};

export const checkBookingAvailability = async (payload) => {
  const response = await fetch(`${BASE_URL}/availability`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
};

export const getHallPeriodAvailability = async (hallId, date) => {
  const query = new URLSearchParams({ date });
  const response = await fetch(`${BASE_URL}/availability/${hallId}?${query.toString()}`, {
    headers: buildHeaders(false),
  });

  return parseResponse(response);
};

export const getFacultyBookings = async ({ email, page = 1, limit = 10, status = "", search = "" } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (email) params.set("email", email);
  if (status) params.set("status", status);
  if (search) params.set("search", search);

  const response = await fetch(`${BASE_URL}/my${params.toString() ? `?${params.toString()}` : ""}`, {
    headers: buildHeaders(false),
  });

  return parseResponse(response);
};

export const getAllBookings = async ({ status = "", page = 1, limit = 10, search = "" } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  const response = await fetch(`${BASE_URL}/bookings?${params.toString()}`, {
    headers: buildHeaders(false),
  });

  return parseResponse(response);
};

export const updateBookingStatus = async (id, status) => {
  const response = await fetch(`${BASE_URL}/${id}/status`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify({ status }),
  });

  return parseResponse(response);
};

export const cancelBooking = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}/cancel`, {
    method: "PATCH",
    headers: buildHeaders(),
  });

  return parseResponse(response);
};

export const createRecurringBookingApi = async (payload) => {
  const response = await fetch(`${BASE_URL}/recurring`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
};

export const getBookingAuditLogs = async (bookingId) => {
  const response = await fetch(`${BASE_URL}/${bookingId}/audit`, {
    headers: buildHeaders(false),
  });

  return parseResponse(response);
};

export const getAllAuditLogs = async ({ limit = 100, offset = 0 } = {}) => {
  const params = new URLSearchParams({ limit, offset });
  const response = await fetch(`${BASE_URL}/audit-logs?${params.toString()}`, {
    headers: buildHeaders(false),
  });

  return parseResponse(response);
};

export { getRecommendedVenues } from "./hallApi";

