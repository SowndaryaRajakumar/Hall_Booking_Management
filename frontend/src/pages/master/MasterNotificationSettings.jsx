import React, { useState, useEffect } from "react";
import {
  Bell,
  MessageSquare,
  Mail,
  Smartphone,
  Save,
  CheckCircle,
  AlertCircle,
  Building,
  GraduationCap,
  CalendarCheck,
  Shield,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  getMasterNotificationSettings,
  updateMasterNotificationSettings,
} from "../../api/masterAdminApi";

const ToggleSwitch = ({ label, description, icon: Icon, checked, onChange, disabled = false, badge }) => (
  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 transition-all shadow-sm">
    <div className="flex items-start gap-3.5 pr-4">
      {Icon && (
        <div className={`p-2.5 rounded-lg ${checked ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
          <Icon size={20} />
        </div>
      )}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">{label}</span>
          {badge && (
            <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-700 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-gray-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

const MasterNotificationSettings = () => {
  const [settings, setSettings] = useState({
    department_booking_notifications: 0,
    common_venue_notifications: 1,
    auditorium_notifications: 1,
    conference_notifications: 1,
    event_notifications: 1,
    email_enabled: 1,
    whatsapp_enabled: 1,
    in_app_enabled: 1,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getMasterNotificationSettings();
      if (data) {
        setSettings({
          department_booking_notifications: Number(data.department_booking_notifications ?? 0),
          common_venue_notifications: Number(data.common_venue_notifications ?? 1),
          auditorium_notifications: Number(data.auditorium_notifications ?? 1),
          conference_notifications: Number(data.conference_notifications ?? 1),
          event_notifications: Number(data.event_notifications ?? 1),
          email_enabled: Number(data.email_enabled ?? 1),
          whatsapp_enabled: Number(data.whatsapp_enabled ?? 1),
          in_app_enabled: Number(data.in_app_enabled ?? 1),
        });
      }
    } catch (err) {
      showToast(err.message || "Failed to load notification settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key, val) => {
    setSettings((prev) => ({
      ...prev,
      [key]: val ? 1 : 0,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMasterNotificationSettings(settings);
      showToast("Notification preferences updated successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Bell size={22} />
              </span>
              <h1 className="text-2xl font-bold text-gray-900">Notification Routing & Settings</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Configure college-wide booking alert routing, venue category subscriptions, and multi-channel delivery rules.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving Changes..." : "Save Preferences"}
          </button>
        </div>

        {/* Feedback Alert */}
        {notification && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium animate-in fade-in duration-200 ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {notification.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* WhatsApp & Delivery Info Card */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-sm">
              <MessageSquare size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-emerald-950">
                  Official WhatsApp Cloud API Integration
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-200 text-emerald-800 rounded-full">
                  Meta Graph API v19.0
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Automated WhatsApp notifications are dispatched for booking creations, approvals, rejections, and cancellations.
                When configured in <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-emerald-900">.env</code>,
                messages are sent directly to verified phone numbers. Fallback to Email and In-App is automatic.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 1: Booking Event Categories */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Building size={18} className="text-blue-600" />
                Venue & Booking Event Categories
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Control which booking events trigger notifications to Master Admin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            <ToggleSwitch
              label="Department Booking Requests"
              description="Notify Master Admin when faculty requests standard department venues (Classroom/Lab/Hall). Off by default to avoid inbox clutter."
              icon={GraduationCap}
              badge="Override"
              checked={Boolean(settings.department_booking_notifications)}
              onChange={(val) => handleToggle("department_booking_notifications", val)}
            />

            <ToggleSwitch
              label="Common Venue Requests"
              description="Notify Master Admin when common college-wide venues (Common Halls, Common Classrooms) are booked."
              icon={Building}
              checked={Boolean(settings.common_venue_notifications)}
              onChange={(val) => handleToggle("common_venue_notifications", val)}
            />

            <ToggleSwitch
              label="Auditorium Requests"
              description="Instant notification whenever college auditoriums are requested or booked."
              icon={Sparkles}
              checked={Boolean(settings.auditorium_notifications)}
              onChange={(val) => handleToggle("auditorium_notifications", val)}
            />

            <ToggleSwitch
              label="Conference Hall Requests"
              description="Notify for executive conference hall and board meeting venue bookings."
              icon={Layers}
              checked={Boolean(settings.conference_notifications)}
              onChange={(val) => handleToggle("conference_notifications", val)}
            />

            <ToggleSwitch
              label="College Event Notifications"
              description="Receive high-priority alerts for college-wide functions, seminars, symposiums, and cultural events."
              icon={CalendarCheck}
              checked={Boolean(settings.event_notifications)}
              onChange={(val) => handleToggle("event_notifications", val)}
            />
          </div>
        </div>

        {/* SECTION 2: Notification Channels */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Smartphone size={18} className="text-blue-600" />
                Delivery Channels
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Enable or disable system-wide dispatch channels for Master Admin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
            <ToggleSwitch
              label="Email Notifications"
              description="Dispatch HTML booking receipts and routing alerts via SMTP."
              icon={Mail}
              checked={Boolean(settings.email_enabled)}
              onChange={(val) => handleToggle("email_enabled", val)}
            />

            <ToggleSwitch
              label="WhatsApp Notifications"
              description="Instant WhatsApp message alerts via WhatsApp Cloud API."
              icon={MessageSquare}
              checked={Boolean(settings.whatsapp_enabled)}
              onChange={(val) => handleToggle("whatsapp_enabled", val)}
            />

            <ToggleSwitch
              label="In-App Notifications"
              description="Real-time web notifications accessible from the notification bell."
              icon={Bell}
              checked={Boolean(settings.in_app_enabled)}
              onChange={(val) => handleToggle("in_app_enabled", val)}
            />
          </div>
        </div>

        {/* Architecture Note */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
          <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-gray-800">
              Department Admin Isolation Guarantee:
            </p>
            <p>
              Department booking requests are always delivered directly to the assigned Department Admin for review,
              regardless of Master Admin override settings. Disabling Master Admin department notifications keeps your feed focused on college-wide events without disrupting departmental autonomy.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MasterNotificationSettings;
