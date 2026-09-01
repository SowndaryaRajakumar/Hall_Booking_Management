const BASE_URL = "http://localhost:5000/api/reports";

const buildHeaders = () => {
  const token = localStorage.getItem("token");
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to fetch reports");
  }
  return data;
};

export const getReportsData = async ({ page = 1, limit = 10 } = {}) => {
  const params = new URLSearchParams({ page, limit });
  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    method: "GET",
    headers: buildHeaders(),
  });
  const data = await parseResponse(response);
  return data.data;
};
