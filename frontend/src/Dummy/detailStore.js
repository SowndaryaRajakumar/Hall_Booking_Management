import { create } from "zustand";

const useHallStore = create((set) => ({
  halls: [
    {
      id: "1",
      name: "Conference Hall",
      location: "Block A",
      capacity: 100,
      projector: true,
      ac: true,
      image: "https://via.placeholder.com/150",
    },
    {
      id: "2",
      name: "Seminar Room",
      location: "Block B",
      capacity: 80,
      projector: false,
      ac: true,
      image: "https://via.placeholder.com/150",
    },
  ],
  addHall: (newHall) => set((state) => ({ halls: [...state.halls, newHall] })),
  updateHall: (updatedHall) =>
    set((state) => ({
      halls: state.halls.map((hall) => (hall.id === updatedHall.id ? updatedHall : hall)),
    })),
  removeHall: (id) =>
    set((state) => ({ halls: state.halls.filter((hall) => hall.id !== id) })),
}));

export default useHallStore;
