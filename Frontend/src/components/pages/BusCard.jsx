import React from "react";
import "../css/BusCard.css";

function BusCard({ title, description, seats, image }) {
  return (
    <div className="bus-card">
      
      <div className="bus-image">
        <img src={image} alt="bus" />
      </div>

      <div className="bus-info">
        <div className="bus-title">{title}</div>
        <div className="bus-description">{description}</div>
      </div>

      <div className="bus-seats">
        <p>Total Seats</p>
        <h2>{seats}</h2>
      </div>

    </div>
  );
}

export default BusCard;