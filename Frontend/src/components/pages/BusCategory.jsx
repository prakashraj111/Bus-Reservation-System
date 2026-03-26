import React from "react";
import bus1 from "../../assets/bus1.png";
import bus10 from "../../assets/bus10.png";
import bus3 from "../../assets/bus3.png";
import "../css/busCategory.css";
import { Link } from "react-router-dom";

function BusCategory() {
  const buses = [bus1, bus10, bus3];

  return (
    <section className="bus-category">
      <div className="bus-category-header">
        <h2>Category</h2>
        <Link to="/category">View all </Link>
      </div>

      <div className="bus-category-grid">
        {buses.map((busImage, index) => (
          <article key={index} className="bus-category-card">
            <img
              src={busImage}
              alt={`Bus category ${index + 1}`}
              className="bus-category-image"
            />
          </article>
        ))}
      </div>
    </section>
  );
}

export default BusCategory;
