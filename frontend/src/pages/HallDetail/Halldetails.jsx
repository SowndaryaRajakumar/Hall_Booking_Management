import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import useHallStore from "../../Dummy/detailStore";
import "./HallDetails.css";

const HallDetails = () => {
  const { id } = useParams();
  const { halls, removeHall } = useHallStore();
  const navigate = useNavigate();

  const hall = halls.find((h) => h.id.toString() === id);

  if (!hall) {
    return <h2 className="not-found">Hall not found</h2>;
  }

  const handleRemove = () => {
    if (window.confirm("Are you sure you want to remove this hall?")) {
      removeHall(hall.id);
      navigate("/hall-review");
    }
  };

  const handleUpdate = () => {
    navigate(`/update-hall/${hall.id}`);
  };

  return (
    <div className="hall-details-container">
      <div className="hall-card-details">
        <img src={hall.image} alt={hall.name} className="hall-details-image" />
        <div className="hall-info">
          <h2>{hall.name}</h2>
          <p><strong>Location:</strong> {hall.location}</p>
          <p><strong>Capacity:</strong> {hall.capacity} seats</p>
          <p><strong>Projector Available:</strong> {hall.projector ? "Yes" : "No"}</p>
          <p><strong>AC Available:</strong> {hall.ac ? "Yes" : "No"}</p>

          <div className="hall-actions">
            <button className="update-btn" onClick={handleUpdate}>Update</button>
            <button className="remove-btn" onClick={handleRemove}>Remove</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HallDetails;
