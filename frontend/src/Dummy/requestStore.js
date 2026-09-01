import { create } from "zustand";

const useRequestStore = create((set) => ({
  requests: [
    {
      hallId: "H001",
      hallName: "Conference Room A",
      staffId: "S123",
      staffName: "John Doe",
      location: "Building 1, Floor 3",
      timeSlot: "10:00 AM - 12:00 PM",
      requestedTime: "2025-02-25 09:15 AM",
      reason: "Department meeting",
      status: "Pending",
      approvedTime: null,
      rejectedTime: null,
    },
    {
      hallId: "H002",
      hallName: "Main Auditorium",
      staffId: "S456",
      staffName: "Alice Smith",
      location: "Building 2, Ground Floor",
      timeSlot: "02:00 PM - 04:00 PM",
      requestedTime: "2025-02-24 11:30 AM",
      reason: "Guest lecture",
      status: "Pending",
      approvedTime: null,
      rejectedTime: null,
    },
    {
      hallId: "H003",
      hallName: "Training Hall",
      staffId: "S789",
      staffName: "Bob Johnson",
      location: "Building 3, Floor 2",
      timeSlot: "09:00 AM - 11:00 AM",
      requestedTime: "2025-02-23 03:45 PM",
      reason: "Software training",
      status: "Approved",
      approvedTime: "2025-02-23 04:00 PM",
      rejectedTime: null,
    },
  ],

  // Approve Request with Time
  approveRequest: (hallId) =>
    set((state) => ({
      requests: state.requests.map((request) =>
        request.hallId === hallId
          ? { ...request, status: "Approved", approvedTime: new Date().toLocaleString(), rejectedTime: null }
          : request
      ),
    })),

  // Reject Request with Time
  rejectRequest: (hallId) =>
    set((state) => ({
      requests: state.requests.map((request) =>
        request.hallId === hallId
          ? { ...request, status: "Rejected", rejectedTime: new Date().toLocaleString(), approvedTime: null }
          : request
      ),
    })),
}));

export default useRequestStore;
