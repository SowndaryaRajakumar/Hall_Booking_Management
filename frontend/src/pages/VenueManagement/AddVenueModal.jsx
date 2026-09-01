import React, { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

import { getDepartments } from "../../api/departmentApi";
import { getVenueFacilities, getVenueTypes } from "../../api/masterDataApi";
import { addHall } from "../../api/hallApi";

const AddVenueModal = ({ isOpen, onClose, onSuccess }) => {

  const [loading, setLoading] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [venueTypes, setVenueTypes] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [facilityIds, setFacilityIds] = useState([]);

  const [featureInput, setFeatureInput] = useState("");

  const [customFeatures, setCustomFeatures] = useState([]);
  const [venueImage, setVenueImage] = useState(null);
const [preview, setPreview] = useState("");

  const [formData, setFormData] = useState({
    hallName: "",
    deptId: "",
    venueType: "",
    location: "",
    capacity: "",
    numberOfSystems: 0,
    hasAC: false,
    hasProjector: false,
    hasSmartBoard: false,
    hasWiFi: false,
    hasSpeaker: false,
    hasPodium: false,
    hasWhiteBoard: false,
    hasCCTV: false,

    microphoneType: "None",

    activeStatus: true
  });

  useEffect(() => {

    if (isOpen) {

      loadMasterData();

    }

  }, [isOpen]);

  const loadMasterData = async () => {

    try {

      const [departmentData, venueTypeData, facilityData] = await Promise.all([getDepartments(), getVenueTypes(), getVenueFacilities()]);
      setDepartments(departmentData);
      setVenueTypes(venueTypeData.data || []);
      setFacilities(facilityData.data || []);

    } catch (error) {

      console.error(error);

    }

  };

  const handleChange = (e) => {

    const { name, value } = e.target;
    const parsedValue =
      name === "capacity" || name === "numberOfSystems"
        ? value === ""
          ? ""
          : Number(value)
        : value;

    setFormData((prev) => ({
      ...prev,
      [name]: parsedValue,
    }));

  };

  const handleCheckbox = (e) => {

    const { name, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));

  };

  const buildVenuePayload = () => {
    const data = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      data.append(key, value);
    });

    data.append("additionalFeatures", customFeatures.join(", ").trim());
    data.append("facilityIds", JSON.stringify(facilityIds));

    if (venueImage) {
      data.append("venueImage", venueImage);
    }

    return data;
  };

  const addFeature = () => {

    if (!featureInput.trim()) return;

    setCustomFeatures([
      ...customFeatures,
      featureInput.trim()
    ]);

    setFeatureInput("");

  };

  const removeFeature = (index) => {

    setCustomFeatures(
      customFeatures.filter((_, i) => i !== index)
    );

  };

  if (!isOpen) return null;

  return (

    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-6">

      <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-5xl overflow-x-hidden overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-6">

        {/* Header */}

        <div className="flex justify-between items-center border-b pb-4">

          <h2 className="text-2xl font-bold">

            Add New Venue

          </h2>

          <button onClick={onClose}>

            <X />

          </button>

        </div>

        {/* Basic Information */}

        <h3 className="text-lg font-semibold mt-6 mb-4">

          Basic Information

        </h3>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

          <div>

            <label className="font-medium">

              Hall Name

            </label>

            <input
              type="text"
              name="hallName"
              value={formData.hallName}
              onChange={handleChange}
              className="w-full border rounded-lg p-3 mt-2"
              placeholder="Seminar Hall - I"
            />

          </div>

          <div>

            <label className="font-medium">

              Department

            </label>

            <select
              name="deptId"
              value={formData.deptId}
              onChange={handleChange}
              className="w-full border rounded-lg p-3 mt-2"
            >

              <option value="">

                Select Department

              </option>

              {departments.map((dept) => (

                <option
                  key={dept.DeptID}
                  value={dept.DeptID}
                >

                  {dept.DeptName}

                </option>

              ))}

            </select>

          </div>

          <div>

            <label className="font-medium">

              Venue Type

            </label>

            <select
              name="venueType"
              value={formData.venueType}
              onChange={handleChange}
              className="w-full border rounded-lg p-3 mt-2"
            >

              <option value="">Select Venue Type</option>

              {venueTypes.map((type) => (
                <option key={type.id} value={type.name}>{type.name}</option>
              ))}

            </select>

          </div>

          <div>

            <label className="font-medium">

              Location

            </label>

            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full border rounded-lg p-3 mt-2"
              placeholder="Block A - Floor 2"
            />

          </div>

          <div>

            <label className="font-medium">

              Capacity

            </label>

            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              className="w-full border rounded-lg p-3 mt-2"
              placeholder="120"
            />

          </div>
          <div>

  <label className="font-medium">
    Number of Systems
  </label>

  <input
    type="number"
    name="numberOfSystems"
    value={formData.numberOfSystems}
    onChange={handleChange}
    min="0"
    className="w-full border rounded-lg p-3 mt-2"
    placeholder="0"
  />

  <p className="text-sm text-gray-500 mt-1">
    Enter 0 for classrooms, seminar halls or auditoriums.
  </p>

</div>
<div>

  <label className="font-medium">
    Venue Photo
  </label>

  <input
    type="file"
    accept="image/*"
    className="w-full border rounded-lg p-3 mt-2"
    onChange={(e) => {
      const file = e.target.files[0];

      if (file) {
        setVenueImage(file);
        setPreview(URL.createObjectURL(file));
      }
    }}
  />

  {preview && (
    <img
      src={preview}
      alt="Venue Preview"
      className="mt-3 w-40 h-28 rounded-lg border object-cover"
    />
  )}

</div>
        </div>

                {/* Facilities */}

        <h3 className="text-lg font-semibold mt-8 mb-4">
          Venue Facilities
        </h3>

        <div className="grid grid-cols-1 gap-x-4 gap-y-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {facilities.map((facility) => <label key={facility.id} className="flex min-w-0 items-start gap-2 break-words"><input className="mt-1 shrink-0" type="checkbox" checked={facilityIds.includes(facility.id)} onChange={(e) => setFacilityIds((current) => e.target.checked ? [...current, facility.id] : current.filter((id) => id !== facility.id))} /><span className="min-w-0">{facility.name}</span></label>)}
        </div>

        {/* Microphone */}

        <div className="mt-8">

          <label className="font-medium">
            Microphone Type
          </label>

          <select
            name="microphoneType"
            value={formData.microphoneType}
            onChange={handleChange}
            className="w-full border rounded-lg p-3 mt-2"
          >

            <option value="None">None</option>

            <option value="Handheld">
              Handheld
            </option>

            <option value="Collar">
              Collar
            </option>

            <option value="Both">
              Both
            </option>

          </select>

        </div>

        {/* Additional Features */}

        <div className="mt-8">

          <label className="font-medium">

            Additional Features

          </label>

          <div className="flex gap-3 mt-3">

            <input
              type="text"
              value={featureInput}
              onChange={(e) =>
                setFeatureInput(e.target.value)
              }
              placeholder="Example : Laser Pointer"
              className="flex-1 border rounded-lg p-3"
            />

            <button
              type="button"
              onClick={addFeature}
              className="bg-green-600 text-white px-5 rounded-lg flex items-center gap-2"
            >

              <Plus size={18} />

              Add

            </button>

          </div>

          {customFeatures.length > 0 && (

            <div className="mt-4 space-y-2">

              {customFeatures.map((feature, index) => (

                <div
                  key={index}
                  className="flex justify-between items-center bg-gray-100 rounded-lg px-4 py-2"
                >

                  <span>
                    {feature}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="text-red-600"
                  >

                    <Trash2 size={18} />

                  </button>

                </div>

              ))}

            </div>

          )}

        </div>

        {/* Status */}

        <div className="mt-8">

          <label className="flex items-center gap-3 font-medium">

            <input
              type="checkbox"
              name="activeStatus"
              checked={formData.activeStatus}
              onChange={handleCheckbox}
            />

            Active Venue

          </label>

        </div>
                {/* Footer */}

        <div className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-end">

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border px-5 py-2 hover:bg-gray-100 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={async () => {

              if (
                !formData.hallName ||
                !formData.deptId ||
                !formData.venueType ||
                !formData.location ||
                !formData.capacity
              ) {
                alert("Please fill all required fields.");
                return;
              }

              try {

                setLoading(true);

                const data = buildVenuePayload();
                const response = await addHall(data);
                if (response.success) {

                  alert("Venue Added Successfully");

                  setFormData({
                    hallName: "",
                    deptId: "",
                    venueType: "",
                    location: "",
                    capacity: "",
                    numberOfSystems: 0,
                    hasAC: false,
                    hasProjector: false,
                    hasSmartBoard: false,
                    hasWiFi: false,
                    hasSpeaker: false,
                    hasPodium: false,
                    hasWhiteBoard: false,
                    hasCCTV: false,

                    microphoneType: "None",

                    activeStatus: true
                  });

                  setCustomFeatures([]);
                  setFeatureInput("");
                  setVenueImage(null);
setPreview("");
                  onSuccess();

                  onClose();

                } else {

                  alert(response.message || "Failed to add venue");

                }

              } catch (error) {

                console.error(error);

                alert("Failed to add venue.");

              } finally {

                setLoading(false);

              }

            }}
            className="w-full rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 sm:w-auto"
          >

            {loading ? "Saving..." : "Save Venue"}

          </button>

        </div>

      </div>

    </div>

  );

};

export default AddVenueModal;
