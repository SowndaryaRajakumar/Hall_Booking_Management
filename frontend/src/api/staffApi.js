const BASE_URL = "http://localhost:5000/api/staff";

// Get all staff
export const getAllStaff = async (token, { page = 1, limit = 10, search = "" } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set("search", search);
  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch staff");
  }

  return data;
};

// Add new staff
export const addStaff = async (staffData, token) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(staffData),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to add faculty");
  return data;
};

// Update staff (Admin Faculty Management)
export const updateStaff = async (id, staffData, token) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(staffData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update faculty");
  }

  return data;
};

// Delete staff
export const deleteStaff = async (id, token) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return response.json();
};

// Get current authenticated staff/user profile
export const getProfile = async (token) => {
  const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");

  try {
    const response = await fetch("http://localhost:5000/api/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data) return data.data;
    }
  } catch (err) {
    // Fallback to /api/staff/profile if /api/profile was unreachable
  }

  const response = await fetch(`${BASE_URL}/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch profile");
  }

  if (!data.data) {
    throw new Error("Profile response did not contain faculty data");
  }

  return data.data;
};
