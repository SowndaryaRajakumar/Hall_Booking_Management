const BASE_URL = 'http://localhost:5000/api/auth';

const postAuthenticated = async (path, body = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const sendPasswordOtp = () => postAuthenticated('/change-password/send-otp');
export const verifyPasswordOtp = (otp) => postAuthenticated('/change-password/verify-otp', { otp });
export const updatePassword = (newPassword, passwordChangeToken) => postAuthenticated('/change-password', { newPassword, passwordChangeToken });
