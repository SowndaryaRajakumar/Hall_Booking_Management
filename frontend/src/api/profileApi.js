const BASE_URL = "http://localhost:5000/api/profile";

const getHeaders = (token) => {
  const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  };
};

/**
 * Fetch current authenticated user's profile
 */
export const getProfile = async (token) => {
  const response = await fetch(BASE_URL, {
    method: "GET",
    headers: getHeaders(token),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch profile");
  }

  if (!data.data) {
    throw new Error("Profile response did not contain user data");
  }

  return data.data;
};

/**
 * Update current authenticated user's editable profile information
 */
export const updateProfile = async (profileData, token) => {
  const response = await fetch(BASE_URL, {
    method: "PUT",
    headers: getHeaders(token),
    body: JSON.stringify(profileData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update profile");
  }

  return data;
};

/**
 * Change current authenticated user's password
 * Requires currentPassword, newPassword, confirmPassword
 */
export const changePassword = async ({ currentPassword, newPassword, confirmPassword }, token) => {
  const response = await fetch(`${BASE_URL}/password`, {
    method: "PUT",
    headers: getHeaders(token),
    body: JSON.stringify({
      currentPassword,
      newPassword,
      confirmPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update password");
  }

  return data;
};
