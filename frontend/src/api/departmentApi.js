const BASE_URL = "http://localhost:5000/api/departments";

export const getDepartments = async ({ page = 1, limit = 100, search = "" } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set("search", search);
  const response = await fetch(`${BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch departments");
  }

  const data = await response.json();
  return data.data || data;
};
