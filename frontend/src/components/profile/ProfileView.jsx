import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Building2,
  Award,
  IdCard,
  Shield,
  ShieldCheck,
  Lock,
  Pencil,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Calendar,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { getProfile, updateProfile, changePassword } from "../../api/profileApi";

const valueOrFallback = (value, fallbackText = "Not provided") => {
  if (value === null || value === undefined) return fallbackText;
  const str = String(value).trim();
  return str === "" ? fallbackText : str;
};

const getInitials = (name = "") => {
  const parts = String(name || "User").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const isStrongPassword = (pwd = "") => {
  return (
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /\d/.test(pwd) &&
    /[^A-Za-z0-9]/.test(pwd)
  );
};

const ProfileView = ({ role: expectedRole }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    designation: "",
    employee_id: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Change Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Load profile from backend
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const data = await getProfile();
      setProfile(data);
      setEditFormData({
        full_name: data.full_name || data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        designation: data.designation || "",
        employee_id: data.employee_id || data.employeeId || "",
      });

      // Update localStorage cached name and email so topbar reflects changes
      if (data.full_name) {
        localStorage.setItem("name", data.full_name);
        localStorage.setItem("facultyName", data.full_name);
        localStorage.setItem("staffName", data.full_name);
      }
      if (data.email) {
        localStorage.setItem("email", data.email);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setLoadError(err.message || "Failed to load profile information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Handle voice or chatbot navigation auto-triggers
  useEffect(() => {
    if (location.state?.openPasswordModal) {
      setIsPasswordModalOpen(true);
    }
    if (location.state?.openEdit) {
      setIsEditing(true);
    }
  }, [location.state]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    setEditError("");
    setEditSuccess("");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");

    if (!editFormData.full_name.trim()) {
      setEditError(t("profile.nameRequired"));
      return;
    }

    if (!editFormData.email.trim()) {
      setEditError(t("profile.invalidEmail"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.email.trim())) {
      setEditError(t("profile.invalidEmail"));
      return;
    }

    try {
      setEditLoading(true);
      const res = await updateProfile({
        full_name: editFormData.full_name.trim(),
        email: editFormData.email.trim().toLowerCase(),
        phone: editFormData.phone.trim() || null,
        designation: editFormData.designation.trim() || null,
        employee_id: editFormData.employee_id.trim() || null,
      });

      setProfile(res.data);
      setEditSuccess(t("profile.profileUpdated"));

      // Update local storage user details
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        storedUser.name = res.data.full_name;
        storedUser.full_name = res.data.full_name;
        storedUser.email = res.data.email;
        localStorage.setItem("user", JSON.stringify(storedUser));
        localStorage.setItem("name", res.data.full_name);
        localStorage.setItem("facultyName", res.data.full_name);
        localStorage.setItem("staffName", res.data.full_name);
        localStorage.setItem("email", res.data.email);
      } catch (err) {
        console.error("Failed to sync updated user in storage:", err);
      }

      setTimeout(() => {
        setIsEditing(false);
        setEditSuccess("");
      }, 1500);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setEditError(err.message || t("common.error"));
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setEditFormData({
        full_name: profile.full_name || profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        designation: profile.designation || "",
        employee_id: profile.employee_id || profile.employeeId || "",
      });
    }
    setEditError("");
    setEditSuccess("");
    setIsEditing(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError(t("profile.currentPassword") + " is required.");
      return;
    }

    if (!newPassword) {
      setPasswordError(t("profile.newPassword") + " is required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t("profile.passwordsDoNotMatch"));
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setPasswordError(t("profile.passwordRequirements"));
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordSuccess(res.message || t("profile.passwordChanged"));

      // On successful password change, clear tokens and redirect to login
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        localStorage.removeItem("user");
        localStorage.removeItem("staffId");
        localStorage.removeItem("facultyName");
        localStorage.removeItem("staffName");
        localStorage.removeItem("name");
        localStorage.removeItem("temporaryPasswordWarning");
        navigate("/", { replace: true });
      }, 2000);
    } catch (err) {
      console.error("Failed to change password:", err);
      setPasswordError(err.message || t("common.error"));
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    if (passwordLoading) return;
    setIsPasswordModalOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const formatCreationDate = (dateVal) => {
    if (!dateVal) return t("profile.notProvided");
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      const locale = i18n.language.startsWith("ta")
        ? "ta-IN"
        : i18n.language.startsWith("hi")
        ? "hi-IN"
        : "en-IN";
      return d.toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      return String(dateVal);
    }
  };

  const isRoleAdmin =
    (profile?.role || expectedRole || "").toLowerCase() === "admin";

  const roleBadgeLabel = isRoleAdmin
    ? t("topbar.administrator")
    : t("topbar.faculty");

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
          {t("profile.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("profile.subtitle")}
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-700 mb-3" />
          <p className="text-sm font-medium text-slate-600">
            {t("profile.loading")}
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" />
          <p className="text-sm font-medium text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={fetchProfileData}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-800 cursor-pointer"
          >
            <RefreshCw size={16} />
            {t("common.loading")}
          </button>
        </div>
      )}

      {!loading && profile && (
        <>
          {/* 1. Profile Avatar & Summary Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar circle */}
              <div className="relative shrink-0">
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-800 text-white font-bold text-2xl sm:text-3xl shadow-md ring-4 ring-blue-50">
                  {getInitials(profile.full_name)}
                </div>
              </div>

              {/* Identity Info */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 break-words">
                    {profile.full_name}
                  </h2>
                  <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {t("profile.active")}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-600 break-all mt-1">
                  {profile.email}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3.5">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 border border-blue-100">
                    <Shield size={13} className="text-blue-600" />
                    {roleBadgeLabel}
                  </span>

                  {profile.department && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                      <Building2 size={13} className="text-slate-500" />
                      {profile.department}
                    </span>
                  )}

                  {profile.designation && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                      <Award size={13} className="text-slate-500" />
                      {profile.designation}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Personal Information Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <User className="text-blue-700" size={20} />
                  {t("profile.personalInformation")}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t("profile.personalInfoDesc")}
                </p>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setEditError("");
                    setEditSuccess("");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Pencil size={15} />
                  {t("profile.editProfile")}
                </button>
              )}
            </div>

            {/* Notification messages */}
            {editSuccess && (
              <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                <span>{editSuccess}</span>
              </div>
            )}

            {editError && (
              <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle size={18} className="shrink-0 text-red-600" />
                <span>{editError}</span>
              </div>
            )}

            {/* View Mode */}
            {!isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <User size={14} className="text-slate-400" />
                    {t("profile.fullName")}
                  </span>
                  <p className="mt-1 font-semibold text-slate-800 break-words">
                    {valueOrFallback(profile.full_name, t("profile.notProvided"))}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Mail size={14} className="text-slate-400" />
                    {t("profile.email")}
                  </span>
                  <p className="mt-1 font-semibold text-slate-800 break-all">
                    {valueOrFallback(profile.email, t("profile.notProvided"))}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Phone size={14} className="text-slate-400" />
                    {t("profile.phone")}
                  </span>
                  <p className="mt-1 font-semibold text-slate-800">
                    {valueOrFallback(profile.phone, t("profile.notProvided"))}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Building2 size={14} className="text-slate-400" />
                    {t("profile.department")}
                  </span>
                  <p className="mt-1 font-semibold text-slate-800 break-words">
                    {valueOrFallback(profile.department, t("profile.notProvided"))}
                  </p>
                </div>

                {(!isRoleAdmin || profile.designation) && (
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                      <Award size={14} className="text-slate-400" />
                      {t("profile.designation")}
                    </span>
                    <p className="mt-1 font-semibold text-slate-800 break-words">
                      {valueOrFallback(profile.designation, t("profile.notProvided"))}
                    </p>
                  </div>
                )}

                {(!isRoleAdmin || profile.employee_id) && (
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                      <IdCard size={14} className="text-slate-400" />
                      {t("profile.employeeId")}
                    </span>
                    <p className="mt-1 font-semibold text-slate-800 break-words">
                      {valueOrFallback(
                        profile.employee_id || profile.employeeId,
                        t("profile.notProvided")
                      )}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Edit Form Mode */
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t("profile.fullName")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={editFormData.full_name}
                      onChange={handleEditChange}
                      required
                      placeholder={t("profile.fullName")}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t("profile.email")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditChange}
                      required
                      placeholder={t("profile.email")}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t("profile.phone")}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditChange}
                      placeholder={t("profile.phone")}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>

                  {/* Department (Read-only for security) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t("profile.department")}
                    </label>
                    <input
                      type="text"
                      value={profile.department || ""}
                      disabled
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Designation (Editable for faculty) */}
                  {!isRoleAdmin && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t("profile.designation")}
                      </label>
                      <input
                        type="text"
                        name="designation"
                        value={editFormData.designation}
                        onChange={handleEditChange}
                        placeholder={t("profile.designation")}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                      />
                    </div>
                  )}

                  {/* Employee ID (Editable for faculty) */}
                  {!isRoleAdmin && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t("profile.employeeId")}
                      </label>
                      <input
                        type="text"
                        name="employee_id"
                        value={editFormData.employee_id}
                        onChange={handleEditChange}
                        placeholder={t("profile.employeeId")}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                      />
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={editLoading}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                  >
                    {t("profile.cancel")}
                  </button>

                  <button
                    type="submit"
                    disabled={editLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 px-5 py-2 text-sm font-semibold text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    {editLoading ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        {t("profile.saving")}
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        {t("profile.saveChanges")}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 3. Security Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {t("profile.security")}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t("profile.keepAccountSecure")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(true);
                  setPasswordError("");
                  setPasswordSuccess("");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 hover:bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Lock size={15} className="text-slate-500" />
                {t("profile.changePassword")}
              </button>
            </div>
          </div>

          {/* 4. Account Information Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Building2 className="text-slate-500" size={18} />
              {t("profile.accountInformation")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <span className="text-xs font-medium text-slate-500">
                  {t("profile.role")}
                </span>
                <p className="mt-1 font-semibold text-slate-800">
                  {roleBadgeLabel}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <span className="text-xs font-medium text-slate-500">
                  {t("profile.accountStatus")}
                </span>
                <p className="mt-1 font-semibold text-emerald-700 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {t("profile.active")}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  {t("profile.accountCreated")}
                </span>
                <p className="mt-1 font-semibold text-slate-800">
                  {formatCreationDate(profile.created_at)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================================================== */}
      {/* 5. Change Password Modal */}
      {/* ================================================== */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md my-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                  <Lock size={18} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                  {t("profile.changePassword")}
                </h3>
              </div>
              <button
                type="button"
                onClick={closePasswordModal}
                disabled={passwordLoading}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Success message */}
            {passwordSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {/* Error message */}
            {passwordError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle size={18} className="shrink-0 text-red-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("profile.currentPassword")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordError("");
                    }}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 pr-10 pl-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("profile.newPassword")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError("");
                    }}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 pr-10 pl-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                  {t("profile.passwordRequirements")}
                </p>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("profile.confirmNewPassword")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError("");
                    }}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 pr-10 pl-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={passwordLoading}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                >
                  {t("profile.cancel")}
                </button>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 px-5 py-2 text-sm font-semibold text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      {t("profile.updating")}
                    </>
                  ) : (
                    <>
                      <Lock size={15} />
                      {t("profile.updatePassword")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
