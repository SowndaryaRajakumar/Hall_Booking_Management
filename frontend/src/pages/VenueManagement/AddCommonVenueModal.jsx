import React, { useEffect, useState } from "react";
import { X, Upload, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import { getVenueFacilities, getVenueTypes } from "../../api/masterDataApi";
import { createCommonVenue } from "../../api/masterAdminApi";

const DEFAULT_COMMON_VENUE_TYPES = [
  "AUDITORIUM",
  "CONFERENCE_HALL",
  "SEMINAR_HALL",
  "COMMON_CLASSROOM",
  "OTHER_COMMON_VENUE",
];

const STANDARD_FACILITIES = [
  { key: "hasProjector", label: "Projector" },
  { key: "hasSmartBoard", label: "Smart Board" },
  { key: "hasWiFi", label: "High-Speed Wi-Fi" },
  { key: "hasSpeaker", label: "Audio / Speakers" },
  { key: "hasPodium", label: "Podium / Stage" },
  { key: "hasWhiteBoard", label: "Whiteboard" },
  { key: "hasCCTV", label: "CCTV Surveillance" },
  { key: "hasAC", label: "Air Conditioning (AC)" },
];

const AddCommonVenueModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [venueTypes, setVenueTypes] = useState(DEFAULT_COMMON_VENUE_TYPES);
  const [masterFacilities, setMasterFacilities] = useState([]);
  const [selectedFacilityIds, setSelectedFacilityIds] = useState([]);

  const [venuePhoto, setVenuePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [formData, setFormData] = useState({
    hallName: "",
    venueType: "AUDITORIUM",
    location: "",
    capacity: "",
    numberOfSystems: 0,
    hasProjector: false,
    hasSmartBoard: false,
    hasWiFi: true,
    hasSpeaker: true,
    hasPodium: true,
    hasWhiteBoard: false,
    hasCCTV: true,
    hasAC: true,
    microphoneType: "Wireless Collar & Handheld",
    remarks: "",
    activeStatus: true,
  });

  useEffect(() => {
    if (isOpen) {
      loadMasterData();
      setError("");
    }
  }, [isOpen]);

  const loadMasterData = async () => {
    try {
      const [typeRes, facRes] = await Promise.all([
        getVenueTypes().catch(() => ({ data: [] })),
        getVenueFacilities().catch(() => ({ data: [] })),
      ]);

      const fetchedTypes = Array.isArray(typeRes.data)
        ? typeRes.data.map((t) => t.name.toUpperCase().replace(/\s+/g, "_"))
        : [];
      const combinedTypes = Array.from(
        new Set([...DEFAULT_COMMON_VENUE_TYPES, ...fetchedTypes])
      );
      setVenueTypes(combinedTypes);

      if (Array.isArray(facRes.data)) {
        setMasterFacilities(facRes.data);
      }
    } catch (err) {
      console.warn("Could not load supplementary venue metadata:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "capacity" || name === "numberOfSystems"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const handleToggleFacility = (key) => {
    setFormData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleToggleMasterFacility = (id) => {
    setSelectedFacilityIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVenuePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.hallName.trim()) {
      setError("Venue Name is required.");
      return;
    }
    if (!formData.location.trim()) {
      setError("Location is required.");
      return;
    }
    if (!formData.capacity || Number(formData.capacity) <= 0) {
      setError("Please specify a valid seating capacity (greater than 0).");
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();
      payload.append("hallName", formData.hallName.trim());
      payload.append("venueType", formData.venueType);
      payload.append("location", formData.location.trim());
      payload.append("capacity", formData.capacity);
      payload.append("numberOfSystems", formData.numberOfSystems || 0);
      payload.append("additionalFeatures", formData.remarks || "");
      payload.append("description", formData.remarks || "");
      payload.append("remarks", formData.remarks || "");
      payload.append("hasProjector", formData.hasProjector ? "1" : "0");
      payload.append("hasSmartBoard", formData.hasSmartBoard ? "1" : "0");
      payload.append("hasWiFi", formData.hasWiFi ? "1" : "0");
      payload.append("hasSpeaker", formData.hasSpeaker ? "1" : "0");
      payload.append("hasPodium", formData.hasPodium ? "1" : "0");
      payload.append("hasWhiteBoard", formData.hasWhiteBoard ? "1" : "0");
      payload.append("hasCCTV", formData.hasCCTV ? "1" : "0");
      payload.append("hasAC", formData.hasAC ? "1" : "0");
      payload.append("microphoneType", formData.microphoneType || "None");
      payload.append("activeStatus", formData.activeStatus ? "1" : "0");
      payload.append("facilityIds", JSON.stringify(selectedFacilityIds));

      if (venuePhoto) {
        payload.append("venueImage", venuePhoto);
      }

      const res = await createCommonVenue(payload);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(res.message || "Failed to create common venue.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while saving the common venue.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/70 backdrop-blur-xs p-3 sm:items-center sm:p-6 animate-in fade-in">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-sm">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                  College-Wide Facility
                </span>
                <span className="text-slate-400 text-xs">ownership_type: COMMON</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Add Common Venue
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Section 1: Venue Identity */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Basic Venue Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Venue Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="hallName"
                  value={formData.hallName}
                  onChange={handleChange}
                  placeholder="e.g., Main College Auditorium"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Venue Type <span className="text-rose-500">*</span>
                </label>
                <select
                  name="venueType"
                  value={formData.venueType}
                  onChange={handleChange}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  required
                >
                  {venueTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location / Campus Block <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Central Administrative Block, Ground Floor"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Capacity (Seats) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    min="1"
                    value={formData.capacity}
                    onChange={handleChange}
                    placeholder="e.g., 500"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Number of Systems
                  </label>
                  <input
                    type="number"
                    name="numberOfSystems"
                    min="0"
                    value={formData.numberOfSystems}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Built-in Facilities & Equipment */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Facilities & Amenities
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STANDARD_FACILITIES.map(({ key, label }) => (
                <label
                  key={key}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition ${
                    formData[key]
                      ? "bg-purple-50 border-purple-300 text-purple-900 font-bold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData[key]}
                    onChange={() => handleToggleFacility(key)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs">{label}</span>
                </label>
              ))}
            </div>

            {/* Extra master facilities if defined */}
            {masterFacilities.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 block mb-2">
                  Additional Tagged Amenities:
                </span>
                <div className="flex flex-wrap gap-2">
                  {masterFacilities.map((fac) => {
                    const isSelected = selectedFacilityIds.includes(fac.id);
                    return (
                      <button
                        type="button"
                        key={fac.id}
                        onClick={() => handleToggleMasterFacility(fac.id)}
                        className={`text-xs px-3 py-1 rounded-full border transition ${
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 font-semibold"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {fac.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Microphone / Audio Specification
              </label>
              <input
                type="text"
                name="microphoneType"
                value={formData.microphoneType}
                onChange={handleChange}
                placeholder="e.g., Dual Wireless Cordless + Podium Gooseneck"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Section 3: Photo & Notes */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Media & Operational Status
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Venue Photo
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition">
                    <Upload size={15} />
                    <span>Choose Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-14 h-14 rounded-xl object-cover border border-purple-200 shadow-xs"
                    />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  JPG or PNG recommended. Maximum 5MB.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Operational Status
                </label>
                <select
                  name="activeStatus"
                  value={formData.activeStatus ? "1" : "0"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      activeStatus: e.target.value === "1",
                    }))
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-semibold"
                >
                  <option value="1">Active / Operational</option>
                  <option value="0">Under Maintenance / Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description / Remarks
              </label>
              <textarea
                name="remarks"
                rows="2"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Special instructions, projector resolution, lighting system notes..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-[11px] text-slate-500">
              * Ownership will automatically be assigned as{" "}
              <strong className="text-purple-700">COMMON (College-Wide)</strong> with Master Admin approval.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition shadow-lg shadow-purple-600/30 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? "Creating Common Venue..." : "Create Common Venue"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCommonVenueModal;
