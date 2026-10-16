const BASE_URL = "http://localhost:5000/api/notifications";

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
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
};

/**
 * Fetch paginated notifications with optional read/unread filter.
 */
export const getNotifications = async ({ page = 1, limit = 20, status = "" } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (status) {
    params.set("status", status);
  }

  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers: buildHeaders(false),
  });

  return parseResponse(response);
};

/**
 * Get count of unread notifications.
 */
export const getUnreadCount = async () => {
  const response = await fetch(`${BASE_URL}/unread-count`, {
    headers: buildHeaders(false),
  });

  return parseResponse(response);
};

/**
 * Mark a single notification as read.
 */
export const markNotificationAsRead = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}/read`, {
    method: "PUT",
    headers: buildHeaders(),
  });

  return parseResponse(response);
};

/**
 * Mark all notifications as read for current user.
 */
export const markAllNotificationsAsRead = async () => {
  const response = await fetch(`${BASE_URL}/read-all`, {
    method: "PUT",
    headers: buildHeaders(),
  });

  return parseResponse(response);
};

/**
 * Delete a notification by ID.
 */
export const deleteNotification = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: buildHeaders(false),
  });

  return parseResponse(response);
};
