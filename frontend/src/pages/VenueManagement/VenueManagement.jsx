import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Building2,
  Users,
} from "lucide-react";

import AdminLayout from "../../layouts/AdminLayout";
import { deleteHall, getAllHalls } from "../../api/hallApi";

import AddVenueModal from "./AddVenueModal";
import EditVenueModal from "./EditVenueModal";
import Pagination from "../../components/Pagination";
import MasterDataManager from "./MasterDataManager";
import { createDepartment, createVenueType, deleteDepartment, deleteVenueType, getAdminDepartments, getAdminVenueTypes, updateDepartment, updateVenueType, createVenueFacility, deleteVenueFacility, getAdminVenueFacilities, updateVenueFacility } from "../../api/masterDataApi";

const VenueManagement = () => {

  const [venues, setVenues] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [showAddModal, setShowAddModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedVenue, setSelectedVenue] = useState(null);
  const [masterDataView, setMasterDataView] = useState("");

  const normalizeVenue = (venue) => ({
    ...venue,
    hallId: venue.hallId ?? venue.HallID ?? venue.id,
    hallName: venue.hallName ?? venue.HallName ?? venue.name ?? "",
    department: venue.department ?? venue.DeptName ?? "",
    deptId: venue.deptId ?? venue.DeptID ?? "",
    location: venue.location ?? venue.Location ?? "",
    capacity: venue.capacity ?? venue.Capacity ?? "",
    numberOfSystems: venue.numberOfSystems ?? venue.NumberOfSystems ?? 0,
    venueType: venue.venueType ?? venue.VenueType ?? "",
    hasProjector: Boolean(venue.hasProjector ?? venue.HasProjector),
    hasSmartBoard: Boolean(venue.hasSmartBoard ?? venue.HasSmartBoard),
    hasWiFi: Boolean(venue.hasWiFi ?? venue.HasWiFi),
    hasSpeaker: Boolean(venue.hasSpeaker ?? venue.HasSpeaker),
    hasPodium: Boolean(venue.hasPodium ?? venue.HasPodium),
    hasWhiteBoard: Boolean(venue.hasWhiteBoard ?? venue.HasWhiteBoard),
    hasCCTV: Boolean(venue.hasCCTV ?? venue.HasCCTV),
    hasAC: Boolean(venue.hasAC ?? venue.HasAC),
    microphoneType: venue.microphoneType ?? venue.MicrophoneType ?? "None",
    additionalFeatures: venue.additionalFeatures ?? venue.AdditionalFeatures ?? "",
    image: venue.image ?? venue.ImageURL ?? null,
    activeStatus: Boolean(venue.activeStatus ?? venue.ActiveStatus ?? true),
  });

  const loadVenues = useCallback(async () => {
    try {
      const response = await getAllHalls({ page: currentPage, limit: 10, search, status: statusFilter });
      const normalizedVenues = (response.data || []).map(normalizeVenue);
      setVenues(normalizedVenues);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error(error);
    }
  }, [currentPage, search, statusFilter]);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const filteredVenues = venues;

  const handleDeleteVenue = async (venue) => {
    const confirmed = window.confirm("Are you sure you want to delete this venue permanently?");

    if (!confirmed) return;

    try {
      const response = await deleteHall(venue.hallId);

      if (response?.success) {
        alert("Venue deleted successfully.");
        await loadVenues();
      } else {
        alert(response?.message || "Failed to delete venue.");
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to delete venue.");
    }
  };

  return (
    <AdminLayout>

      <div className="venue-management ui-page p-4 sm:p-6">

        {/* Header */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <h1 className="text-3xl font-bold">
            Venue Management
          </h1>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-800 sm:w-auto"
          >
            <Plus size={18} />

            Add Venue
          </button>

        </div>

        <div className="mb-6 grid gap-2 sm:flex sm:flex-wrap">
          <button type="button" onClick={() => setMasterDataView(masterDataView === "departments" ? "" : "departments")} className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50">Manage Departments</button>
          <button type="button" onClick={() => setMasterDataView(masterDataView === "venueTypes" ? "" : "venueTypes")} className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50">Manage Venue Types</button>
          <button type="button" onClick={() => setMasterDataView(masterDataView === "facilities" ? "" : "facilities")} className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50">Manage Facilities</button>
        </div>
        {masterDataView === "departments" && <MasterDataManager title="Departments" loadItems={getAdminDepartments} createItem={createDepartment} updateItem={updateDepartment} deleteItem={deleteDepartment} getId={(item) => item.DeptID} getName={(item) => item.DeptName} isActive={(item) => Boolean(item.IsActive)} />}
        {masterDataView === "venueTypes" && <MasterDataManager title="Venue Types" loadItems={getAdminVenueTypes} createItem={createVenueType} updateItem={updateVenueType} deleteItem={deleteVenueType} getId={(item) => item.id} getName={(item) => item.name} isActive={(item) => Boolean(item.IsActive)} />}
        {masterDataView === "facilities" && <MasterDataManager title="Venue Facilities" loadItems={getAdminVenueFacilities} createItem={createVenueFacility} updateItem={updateVenueFacility} deleteItem={deleteVenueFacility} getId={(item) => item.id} getName={(item) => item.name} isActive={(item) => Boolean(item.IsActive)} />}

        {/* Search */}

        <div className="venue-search-wrapper mb-6">

          <Search
            size={18}
            className="venue-search-icon"
          />

          <input
            type="text"
            placeholder="Search venue..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="venue-search-input"
          />

        </div>

        {/* Status Filter */}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">

          <label className="self-start text-sm font-medium text-gray-700 sm:self-center">
            Filter by Status:
          </label>

          <div className="flex flex-wrap gap-2">

            <button
              onClick={() => { setStatusFilter("active"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                statusFilter === "active"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Active
            </button>

            <button
              onClick={() => { setStatusFilter("inactive"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                statusFilter === "inactive"
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Inactive
            </button>

            <button
              onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                statusFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All
            </button>

          </div>

        </div>

        {/* Table */}

        <div className="ui-card venue-table-scroll overflow-x-auto" role="region" aria-label="Venue list" tabIndex="0">

          <table className="responsive-table venue-table w-full text-left text-sm">

            <thead className="bg-slate-50 text-slate-600">

              <tr>

                <th className="px-4 py-3 font-semibold">Venue</th>

                <th className="px-4 py-3 font-semibold">Department</th>

                <th className="px-4 py-3 font-semibold">Type</th>

                <th className="px-4 py-3 font-semibold">Capacity</th>

                <th className="px-4 py-3 font-semibold">Location</th>

                <th className="px-4 py-3 font-semibold">Facilities</th>

                <th className="px-4 py-3 font-semibold">Status</th>

                <th className="px-4 py-3 text-center font-semibold">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredVenues.map((venue) => (

                <tr
                  key={venue.hallId}
                  className="border-t border-slate-100 transition-colors hover:bg-blue-50/50"
                >

                  <td className="px-4 py-4 font-semibold text-slate-800">

                    <div className="flex items-center gap-2">

                      <Building2
                        size={18}
                        className="text-blue-600"
                      />

                      {venue.hallName}

                    </div>

                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    {venue.department}
                  </td>

                  <td className="px-4 py-4">

                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">

                      {venue.venueType}

                    </span>

                  </td>

                  <td className="px-4 py-4">

                    <div className="flex items-center gap-2">

                      <Users size={16} />

                      {venue.capacity}

                    </div>

                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    {venue.location}
                  </td>

                  <td className="max-w-xs px-4 py-4">

                    <div className="flex flex-wrap gap-1.5">

                      {(venue.facilities || []).map((facility) => <span key={facility} className="ui-chip">{facility}</span>)}

                    </div>

                  </td>

                  <td className="px-4 py-4">

                    {venue.activeStatus ? (

                      <span className="ui-status bg-green-100 text-green-700">

                        Active

                      </span>

                    ) : (

                      <span className="ui-status bg-red-100 text-red-700">

                        Inactive

                      </span>

                    )}

                  </td>

                  <td className="px-4 py-4">

                    <div className="flex justify-center gap-4">

                      <button
                        onClick={() => {
                          setSelectedVenue(venue);
                          setShowEditModal(true);
                        }}
                        className="ui-icon-button text-blue-600 hover:bg-blue-100"
                        aria-label={`Edit ${venue.hallName}`}
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDeleteVenue(venue)}
                        className="ui-icon-button text-red-600 hover:bg-red-100"
                        aria-label={`Delete ${venue.hallName}`}
                      >
                        <Trash2 size={18} />
                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setCurrentPage} />

        </div>

      </div>

      <AddVenueModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadVenues}
      />

      {showEditModal && selectedVenue && (
        <EditVenueModal
          isOpen={showEditModal}
          venue={selectedVenue}
          onClose={() => setShowEditModal(false)}
          onSuccess={loadVenues}
        />
      )}

    </AdminLayout>
  );
};

export default VenueManagement;
