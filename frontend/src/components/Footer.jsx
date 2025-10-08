import '@style/Footer.css';
import { Clock, Coffee, Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { NavLink } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer aria-label="Footer">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Brand */ }
          <div className="footer-section footer-brand">
            <div className="flex items-center gap-2">
              <Coffee className="icon" aria-hidden="true" />
              <h3>Isla Del Cafe</h3>
            </div>
            <p>
              Welcome to Isla del Café - your tropical coffee escape in the Heritage City of
              the South 🌴🐚🍃
            </p>
            <div className="footer-icons">
              <NavLink
                href="https://www.facebook.com/profile.php?id=61571726873185"
                aria-label="Visit Isla Del Cafe on Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="icon" aria-hidden="true" />
              </NavLink>
              <NavLink
                href="https://www.instagram.com/isladelcafe.carcar"
                aria-label="Visit Isla Del Cafe on Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="icon" aria-hidden="true" />
              </NavLink>
            </div>
          </div>

          {/* Recent Blog */ }
          <div className="footer-section footer-blog">
            <h3>Recent Blog</h3>
            <ul>
              <li>
                <NavLink
                  to="/about"
                  aria-label="Isla Del Cafe Grand Opening CarCar City - Feb 20, 2025"
                  className={ ({ isActive }) => isActive ? "active-link" : "" }
                >
                  Isla Del Cafe Grand Opening CarCar City - Feb 20, 2025
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/about"
                  aria-label="Carcar City are you ready? - Feb 11, 2025"
                  className={ ({ isActive }) => isActive ? "active-link" : "" }
                >
                  Carcar City are you ready? - Feb 11, 2025
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/about"
                  aria-label="Hello April - April 1, 2025"
                  className={ ({ isActive }) => isActive ? "active-link" : "" }
                >
                  Hello April - April 1, 2025
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/about"
                  aria-label="First 2 people Get free Drinks! - May 20, 2025"
                  className={ ({ isActive }) => isActive ? "active-link" : "" }
                >
                  First 2 people Get free Drinks! - May 20, 2025
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Services */ }
          <div className="footer-section footer-links">
            <h3>Our Services</h3>
            <ul>
              <li>
                <NavLink to="/contact" aria-label="Learn about our specialty coffee">
                  Specialty Coffee
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact" aria-label="Explore our fresh pastries">
                  Fresh Pastries
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact" aria-label="Book private events">
                  Private Events
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact" aria-label="Discover our custom blends">
                  Custom Blends
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Contact */ }
          <div className="footer-section footer-contact">
            <h3>Have a Question?</h3>
            <ul>
              <li className="flex items-center gap-3">
                <MapPin aria-hidden="true" />
                <span>Isla Del Cafe, Cogon, Poblacion 1, Carcar City</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone aria-hidden="true" />
                <NavLink to="tel:+639751883932" aria-label="Call us at 09751883932">
                  09751883932
                </NavLink>
              </li>
              <li className="flex items-center gap-3">
                <Mail aria-hidden="true" />
                <NavLink to="mailto:isladelcafecarcar@gmail.com"
                  aria-label="Email us at isladelcafecarcar@gmail.com"
                >
                  isladelcafecarcar@gmail.com
                </NavLink>
              </li>
              <li className="flex items-start gap-3">
                <Clock aria-hidden="true" />
                <div>
                  <p>Mon-Fri: 11:00 AM - 11:00 PM</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer bottom */ }
        <div className="footer-bottom">
          <p>© { currentYear } Isla Del Cafe. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
