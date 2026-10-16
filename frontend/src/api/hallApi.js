const BASE_URL = "http://localhost:5000/api/halls";

// Get All Venues
export const getAllHalls = async ({ page = 1, limit = 10, search = "", status = "" } = {}) => {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({ page, limit });
  if (search) params.set("search", search);
  if (status && status !== "all") params.set("status", status);

  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || "Failed to fetch venues");
  }

  return data;
};

// Add Venue
export const addHall = async (formData) => {
  const token = localStorage.getItem("token");

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to add venue");
  }

  return data;
};

// Update Venue
export const updateHall = async (id, formData) => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update venue");
  }

  return data;
};

// Delete Venue
export const deleteHall = async (id) => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to delete venue");
  }

  return data;
};

// Smart Venue Recommendation
export const getRecommendedVenues = async ({ date, period, venueType = "", facilities = [] }) => {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({
    date,
    period,
  });
  if (venueType && venueType !== "all") {
    params.set("venueType", venueType);
  }
  if (Array.isArray(facilities) && facilities.length > 0) {
    params.set("facilities", facilities.join(","));
  } else if (typeof facilities === "string" && facilities.trim()) {
    params.set("facilities", facilities.trim());
  }

  const response = await fetch(`http://localhost:5000/api/venues/recommend?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to find recommended venues");
  }

  return data;
};
