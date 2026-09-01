const BASE_URL = "http://localhost:5000/api/dashboard";

const buildHeaders = () => {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      "Request failed"
    );
  }

  return data;
};

export const getFacultyDashboard = async () => {
  const response = await fetch(
    `${BASE_URL}/faculty`,
    {
      method: "GET",
      headers: buildHeaders(),
    }
  );

  const data = await parseResponse(response);

  return data.data;
};