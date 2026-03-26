import React from "react";
import { FaRegCopy } from "react-icons/fa";
import saveIcon from "../../assets/save.png";
import "../css/offerCard.css";

function OfferCard() {
  const offers = [1, 2];

  return (
    <section className="offer-section">
      <h2>Special Offers</h2>

      <div className="offer-grid">
        {offers.map((offer) => (
          <article key={offer} className="offer-card">
            <div className="offer-icon-wrap">
              <img src={saveIcon} alt="" className="offer-icon" />
            </div>

            <div className="offer-content">
              <h3>
                Get upto 40% off on bus
                <br />
                booking
              </h3>

              <div className="offer-code-row">
                <span className="offer-code">GTECH08</span>
                <button
                  type="button"
                  className="offer-copy-btn"
                  aria-label="Copy coupon code"
                >
                  <FaRegCopy />
                </button>
              </div>

              <p>Valid till: 31st March</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default OfferCard;
