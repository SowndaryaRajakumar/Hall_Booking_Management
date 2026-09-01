import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Building2 } from "lucide-react";

const LoginForm = () => {
  const navigate = useNavigate();

  const [isResetPassword, setIsResetPassword] = useState(false);
  const [staffId, setStaffId] = useState(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // ================= LOGIN =================

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      console.log("Login Response:", data);

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Save Token
      localStorage.setItem("token", data.token);

      // Save User Details
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("user", JSON.stringify(data.user));

      setStaffId(data.user.id);

      // Temporary-password users can access the portal and change it through
      // the verified Profile flow; do not use the legacy direct-reset route.
      if (data.user.isFirstLogin) {
        localStorage.setItem("temporaryPasswordWarning", "true");
      }

      // Navigate
      if (data.user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/faculty/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // ================= RESET PASSWORD =================

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            staffId,
            newPassword: formData.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      if (data.role) {
        localStorage.setItem("role", data.role);
      }

      if (data.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/faculty/dashboard");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white/90 p-8 rounded-lg shadow-xl w-full max-w-md">
      <div className="flex justify-center mb-8">
        <Building2 className="h-12 w-12 text-blue-600" />
      </div>

      <h2 className="text-2xl font-bold text-center mb-8">
        {isResetPassword ? "Reset Password" : "Staff"}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form
        onSubmit={isResetPassword ? handlePasswordReset : handleLogin}
        className="space-y-6"
      >
        {!isResetPassword ? (
          <>
            <InputField
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              icon={
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              }
            />

            <InputField
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              icon={
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              }
            />
          </>
        ) : (
          <>
            <InputField
              label="New Password"
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="New Password"
              icon={
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              }
            />

            <InputField
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
              icon={
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              }
            />
          </>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
        >
          {isResetPassword ? "Reset Password" : "Login"}
        </button>
      </form>
    </div>
  );
};

const InputField = ({
  label,
  type,
  name,
  value,
  onChange,
  placeholder,
  icon,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>

    <div className="relative">
      {icon}

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        className="pl-10 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>
);

export default LoginForm;
