import React from "react";
import { FaSearch } from "react-icons/fa";
import bus2 from "../../assets/bus2.png";
import bus1 from "../../assets/bus1.png";
import bus10 from "../../assets/bus10.png";
import bus3 from "../../assets/bus3.png";
import bus4 from "../../assets/bus4.png";
import bus5 from "../../assets/bus5.png";
import "../css/viewBusCategory.css";

function ViewBusCategory() {
  const buses = [
    { id: 1, name: "Tourist Bus", passengers: "60 Passengers", image: bus2 },
    { id: 2, name: "Tourist Bus", passengers: "60 Passengers", image: bus1 },
    { id: 3, name: "Tourist Bus", passengers: "60 Passengers", image: bus10 },
    { id: 4, name: "Tourist Bus", passengers: "60 Passengers", image: bus3 },
    { id: 5, name: "Tourist Bus", passengers: "60 Passengers", image: bus4 },
    { id: 6, name: "Tourist Bus", passengers: "60 Passengers", image: bus5 },
  ];

  return (
    <section className="view-bus-category">
      <div className="view-bus-filter-bar">
        <div className="view-bus-search-wrap">
          <input type="text" placeholder="Search Bus" />
          <button type="button" aria-label="Search bus">
            <FaSearch />
          </button>
        </div>

        <select defaultValue="">
          <option value="" disabled>
            Choose Bus Type
          </option>
          <option value="tourist">Tourist Bus</option>
          <option value="mini">Mini Bus</option>
          <option value="luxury">Luxury Bus</option>
        </select>
      </div>

      <div className="view-bus-grid">
        {buses.map((bus) => (
          <article key={bus.id} className="view-bus-card">
            <img src={bus.image} alt={bus.name} className="view-bus-card-image" />
            <div className="view-bus-card-footer">
              <h3>{bus.name}</h3>
              <p>{bus.passengers}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ViewBusCategory;
