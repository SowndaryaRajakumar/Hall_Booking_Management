const BASE_URL = "http://localhost:5000/api/analytics";

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

export const getVenueUtilizationAnalytics = async () => {
  const response = await fetch(`${BASE_URL}/venue-utilization`, {
    headers: buildHeaders(false),
  });

  return parseResponse(response);
};

export const getAvailabilityHeatmap = async ({ date, deptId, venueType } = {}) => {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (deptId) params.set("deptId", deptId);
  if (venueType) params.set("venueType", venueType);

  const response = await fetch(`${BASE_URL}/availability-heatmap?${params.toString()}`, {
    headers: buildHeaders(false),
  });

  return parseResponse(response);
};
