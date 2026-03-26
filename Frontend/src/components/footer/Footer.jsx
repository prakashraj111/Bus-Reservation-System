import "./footer.css";
import { FaMapMarkerAlt } from "react-icons/fa";
import logo from "../../assets/logo.png";
import React from 'react';
function Footer() {
  return (
    <>
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <img src={logo} alt="GBus logo" />
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam
              placeat corporis, rerum laborum optio laboriosam perferendis sit
              culpa doloribus, tempora aliquam repellendus reprehenderit, ullam
              alias.
            </p>
          </div>

          <div className="footer-col">
            <h5>About Us</h5>
            <a href="#about">About Us</a>
            <a href="#contact">Contact Us</a>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms and Conditions</a>
          </div>

          <div className="footer-col">
            <h5>Services</h5>
            <a href="#safety">Safety Guarantee</a>
            <a href="#support">FAQ &amp; Support</a>
            <a href="#luxury">Luxury Buses</a>
            <a href="#facilities">Enough Facilities</a>
          </div>

          <div className="footer-col">
            <h5>Get In Touch</h5>
            {[...Array(3)].map((_, index) => (
              <div key={index} className="contact-row">
                <FaMapMarkerAlt />
                <div>
                  <p>For Support &amp; Reservations</p>
                  <p>123, Main Street, Anytown, USA</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}

export default Footer;
