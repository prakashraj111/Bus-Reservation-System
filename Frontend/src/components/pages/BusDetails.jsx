import React from "react";
import "../css/busDetails.css";
import { Link } from "react-router-dom";

function BusDetails({
  image,
  title,
  description,
  busOperator,
  seats,
  type,
  busNo,
  busId,
  bus,
  onDelete
}) {
return (
    <div className="bus-container">

        <div className="bus-left">
            <div className="bus-image">
                <img src={image} alt="bus" />
            </div>

            <div className="bus-extra">{busOperator}</div>

            <div className="bus-buttons">
                <Link to="/edit-post" state={{ busId, bus }}>
                    <button>Edit</button>
                </Link>
                <button type="button" onClick={onDelete}>Delete</button>
                <Link to="/bus-route" state={{ busId }}>
                    <button>View Route</button>
                </Link>
            </div>
        </div>


        <div className="bus-right">
            <div className="bus-title">{title}</div>

            <div className="bus-description">{description}</div>

            <div className="bus-seats">Total seats : {seats}</div>

            <div className="bus-info-row">
                <div className="bus-type">Type : {type}</div>
                <div className="bus-number">Bus No : {busNo}</div>
            </div>
        </div>

    </div>
);
}

export default BusDetails;
