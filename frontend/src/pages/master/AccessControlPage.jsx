import React, { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  ShieldCheck,
  Building2,
  Users,
  Check,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  Search,
  Lock,
  Layers,
  CalendarDays,
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  getDepartmentAdmins,
  getAdminPermissions,
  updateAdminPermissions,
} from "../../api/masterAdminApi";

const CATEGORY_ICONS = {
  DASHBOARD: Layers,
  FACULTY: Users,
  VENUES: Building2,
  BOOKINGS: ShieldCheck,
  REPORTS: KeyRound,
  ADMIN: Lock,
  GENERAL: KeyRound,
  ACADEMIC: CalendarDays,
};

const AccessControlPage = () => {
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load Department Admins
  useEffect(() => {
    const loadAdmins = async () => {
      setLoadingAdmins(true);
      try {
        const res = await getDepartmentAdmins({ limit: 100 });
        const list = res.data || [];
        setAdmins(list);
        if (list.length > 0) {
          setSelectedAdminId(String(list[0].staff_id));
        }
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setLoadingAdmins(false);
      }
    };
    loadAdmins();
  }, []);

  // Load Permissions for selected admin
  const loadAdminPermissions = useCallback(async (adminId) => {
    if (!adminId) return;
    setLoadingPerms(true);
    try {
      const res = await getAdminPermissions(adminId);
      setPermissions(res.permissions || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAdminId) {
      loadAdminPermissions(selectedAdminId);
    }
  }, [selectedAdminId, loadAdminPermissions]);

  // Toggle single permission and immediately persist to DB
  const handleToggle = async (permId) => {
    const targetPerm = permissions.find((p) => p.id === permId);
    if (!targetPerm) return;

    const newEnabled = !targetPerm.enabled;
    const updated = permissions.map((p) =>
      p.id === permId ? { ...p, enabled: newEnabled, isCustomized: true } : p
    );
    setPermissions(updated);

    try {
      await updateAdminPermissions(selectedAdminId, [
        { id: permId, key: targetPerm.key, enabled: newEnabled },
      ]);
      showToast(`Feature "${targetPerm.name}" set to ${newEnabled ? "ON" : "OFF"}.`);
    } catch (err) {
      // Revert on error
      setPermissions(permissions);
      showToast(err.message || "Failed to update permission", "error");
    }
  };

  // Enable all in category
  const handleToggleAll = async (category, enable) => {
    const changes = [];
    const updated = permissions.map((p) => {
      if (category === "ALL" || p.category === category) {
        changes.push({ id: p.id, key: p.key, enabled: enable });
        return { ...p, enabled: enable, isCustomized: true };
      }
      return p;
    });

    setPermissions(updated);
    try {
      await updateAdminPermissions(selectedAdminId, changes);
      showToast(`All features ${enable ? "enabled" : "disabled"}.`);
    } catch (err) {
      setPermissions(permissions);
      showToast(err.message, "error");
    }
  };

  const selectedAdmin = admins.find((a) => String(a.staff_id) === String(selectedAdminId));

  // Filter permissions
  const filteredPerms = permissions.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Group by category
  const groupedPerms = filteredPerms.reduce((acc, p) => {
    const cat = p.category || "GENERAL";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Toast */}
        {notification && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all ${
              notification.type === "error"
                ? "bg-red-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {notification.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            {notification.message}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center font-bold">
                <KeyRound size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Access & Permission Management
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Dynamically enable or disable system features per Department Administrator. Changes apply instantly to sidebar, routes, and APIs.
            </p>
          </div>
        </div>

        {/* Admin Selector Cards / Dropdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Select Department Administrator
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {loadingAdmins ? (
              <div className="col-span-full py-4 text-center text-gray-400">Loading administrators...</div>
            ) : admins.length === 0 ? (
              <div className="col-span-full py-4 text-center text-gray-400">
                No Department Admins registered. Please add a Department Admin first.
              </div>
            ) : (
              admins.map((admin) => {
                const isSelected = String(admin.staff_id) === String(selectedAdminId);
                return (
                  <button
                    key={admin.staff_id}
                    onClick={() => setSelectedAdminId(String(admin.staff_id))}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 shadow-xs"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <ShieldCheck size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-gray-900 truncate">{admin.full_name}</div>
                      <div className="text-xs text-blue-600 font-medium truncate mt-0.5">
                        {admin.DeptName || admin.department}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">{admin.email}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Active Target Banner */}
        {selectedAdmin && (
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 mb-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                Configuring Feature Permissions
              </div>
              <h2 className="text-xl font-bold mt-1">{selectedAdmin.full_name}</h2>
              <p className="text-xs text-blue-200 mt-1">
                Assigned Department: <strong>{selectedAdmin.DeptName || selectedAdmin.department}</strong> • Status:{" "}
                <span className="capitalize">{selectedAdmin.status}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleToggleAll("ALL", true)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer border border-white/10"
              >
                Enable All Features
              </button>
              <button
                onClick={() => handleToggleAll("ALL", false)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer border border-white/10"
              >
                Disable All
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-3">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search permission or module name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm focus:outline-none text-gray-800"
          />
        </div>

        {/* Feature Categories */}
        {loadingPerms ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
            Loading permissions...
          </div>
        ) : Object.keys(groupedPerms).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
            No permissions matching your filter.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPerms).map(([category, items]) => {
              const Icon = CATEGORY_ICONS[category] || KeyRound;
              const enabledCount = items.filter((p) => p.enabled).length;

              return (
                <div key={category} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Icon size={16} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm tracking-wide">{category} MODULE</h3>
                        <span className="text-[11px] text-gray-400">
                          {enabledCount} of {items.length} enabled
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleAll(category, true)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                      >
                        Enable All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleToggleAll(category, false)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                      >
                        Disable All
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {items.map((perm) => (
                      <div
                        key={perm.id}
                        className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition"
                      >
                        <div className="pr-4 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-800">{perm.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                              {perm.key}
                            </span>
                            {perm.enabled ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                DISABLED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{perm.description}</p>
                        </div>

                        {/* Toggle Switch */}
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-bold ${
                              perm.enabled ? "text-blue-600" : "text-gray-400"
                            }`}
                          >
                            {perm.enabled ? "ON" : "OFF"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggle(perm.id)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              perm.enabled ? "bg-blue-600" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                perm.enabled ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AccessControlPage;
