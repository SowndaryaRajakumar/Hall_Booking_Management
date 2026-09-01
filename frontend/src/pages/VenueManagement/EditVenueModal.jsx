import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { updateHall } from "../../api/hallApi";
import { getDepartments } from "../../api/departmentApi";
import { getVenueFacilities, getVenueTypes } from "../../api/masterDataApi";

const EditVenueModal = ({
  isOpen,
  onClose,
  onSuccess,
  venue,
}) => {

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

    activeStatus: true,

  });

  useEffect(() => {

    if (!isOpen) return;

    loadMasterData();

  }, [isOpen]);

  useEffect(() => {

    if (!venue) return;

    setFormData({

      hallName: venue.hallName || venue.name || "",

      deptId: venue.deptId || "",

      venueType: venue.venueType || "",

      location: venue.location || "",

      capacity: venue.capacity || "",
      numberOfSystems: venue.numberOfSystems || 0,

      hasAC: venue.hasAC || false,

      hasProjector: venue.hasProjector || false,

      hasSmartBoard: venue.hasSmartBoard || false,

      hasWiFi: venue.hasWiFi || false,

      hasSpeaker: venue.hasSpeaker || false,

      hasPodium: venue.hasPodium || false,

      hasWhiteBoard: venue.hasWhiteBoard || false,

      hasCCTV: venue.hasCCTV || false,

      microphoneType: venue.microphoneType || "None",

      activeStatus: venue.activeStatus ?? true,

    });
    setFacilityIds(venue.facilityIds || []);

    if (venue.additionalFeatures) {

      setCustomFeatures(

        venue.additionalFeatures
          .split(",")
          .map((item) => item.trim())
      );

    } else {
      setCustomFeatures([]);
    }

    setPreview(
      venue?.image ? `http://localhost:5000${venue.image}` : ""
    );

  }, [venue]);

  const loadMasterData = async () => {

    try {

      const [departmentData, venueTypeData, facilityData] = await Promise.all([getDepartments(), getVenueTypes(), getVenueFacilities()]);
      setDepartments(departmentData);
      setVenueTypes(venueTypeData.data || []);
      setFacilities(facilityData.data || []);

    } catch (err) {

      console.error(err);

    }

  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    let parsedValue = value;

    if (name === "capacity" || name === "numberOfSystems") {
      parsedValue = value === "" ? "" : Number(value);
    }

    if (name === "activeStatus") {
      parsedValue = value === "active";
    }

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
    } else if (venue?.image) {
      data.append("imageUrl", venue.image);
    }

    return data;
  };

  const addFeature = () => {

    if (!featureInput.trim()) return;

    setCustomFeatures([
      ...customFeatures,
      featureInput,
    ]);

    setFeatureInput("");

  };

  const removeFeature = (index) => {

    setCustomFeatures(

      customFeatures.filter(
        (_, i) => i !== index
      )

    );

  };

  if (!isOpen || !venue) return null;

  return (

    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:items-center sm:p-6">

      <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-5xl overflow-x-hidden overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-8">

        <div className="flex justify-between items-center mb-6">

          <h2 className="text-2xl font-bold">
            Edit Venue
          </h2>

          <button
            onClick={onClose}
            className="text-3xl leading-none"
          >
            ×
          </button>

        </div>

        {/* Hall Name */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

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

              <option value="">Select</option>
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
              placeholder="Example : Block A - Floor 2"
              className="w-full border rounded-lg p-3 mt-2"
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
      alt="Venue"
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
            <option value="Handheld">Handheld</option>
            <option value="Collar">Collar</option>
            <option value="Both">Both</option>

          </select>

        </div>

        <div className="mt-8">

          <label className="font-medium">
            Venue Status
          </label>

          <select
            name="activeStatus"
            value={formData.activeStatus ? "active" : "inactive"}
            onChange={handleChange}
            className="w-full border rounded-lg p-3 mt-2"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
              onChange={(e) => setFeatureInput(e.target.value)}
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

                  <span>{feature}</span>

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
                const response = await updateHall(
                  venue.hallId,
                  data
                );

                if (response.success) {

                  alert("Venue Updated Successfully");

                  onSuccess();

                  onClose();

                } else {

                  alert(
                    response.message ||
                    "Failed to update venue."
                  );

                }

              } catch (error) {

                console.error(error);

                alert("Failed to update venue.");

              } finally {

                setLoading(false);

              }

            }}
            className="w-full rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 sm:w-auto"
          >

            {loading ? "Updating..." : "Update Venue"}

          </button>

        </div>

      </div>

    </div>

  );

};

export default EditVenueModal;
