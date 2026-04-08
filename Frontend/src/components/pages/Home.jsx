import React from "react";
import "../css/home.css";
import heroBg from "../../assets/bg1.jpg";
import heroBus from "../../assets/bus3.png";
import OfferCard from "./OfferCard";

function Home() {
  return (
 
    <main className="home-page" id="home">
      <section
        className="home-hero"
        style={{ backgroundImage: `url(${heroBg})` }}
        aria-label="Bus ticket booking hero section"
      >
        <div className="home-hero-overlay" />
        <div className="home-hero-inner">
          <div className="home-content">
            <h1>
              Reserve Your
              <br />
              Bus <span>Tickets</span>
              <br />
              Now
            </h1>
            <p>
              Find and book your bus tickets with just a few clicks. We offer a
              wide range of bus routes and schedules to suit your needs.
            </p>
            <button type="button" className="home-cta">
              Reserve Seat Now
            </button>
          </div>

          <div className="home-bus-wrap" aria-hidden="true">
            <img src={heroBus} alt="" className="home-bus" />
          </div>
        </div>
      </section>

    {/* <section className="home-search-shell">
        <div className="home-search-card">
          <label className="home-field">
            <span>From</span>
            <input type="text" placeholder="Select a location" />
          </label>

          <label className="home-field">
            <span>To</span>
            <input type="text" placeholder="Select a location" />
          </label>

          <label className="home-field">
            <span>Choose Date</span>
            <input type="date" />
          </label>

          <div className="home-action">
            <button type="button">Find Bus</button>
          </div>
        </div>
      </section> */}
      {/* <BusCategory /> */}
      <OfferCard />
    </main>
  );
}

export default Home;
