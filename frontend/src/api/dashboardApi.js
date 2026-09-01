const BASE_URL = "http://localhost:5000/api/dashboard";

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

export const getAdminDashboard = async () => {
  const response = await fetch(BASE_URL, {
    method: "GET",
    headers: buildHeaders(false),
  });
  const data = await parseResponse(response);
  return data.data;
};
