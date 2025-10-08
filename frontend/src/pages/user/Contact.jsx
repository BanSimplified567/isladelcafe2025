import { NavLink } from "react-router-dom";

import Footer from '@components/Footer';
import '@style/ContactUs.css';
import axios from 'axios';
import { useState } from 'react';
import Swal from 'sweetalert2';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.name.trim()) errors.push('Name is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (!formData.message.trim()) errors.push('Message is required');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.push('Please enter a valid email address');
    }

    // Validate field lengths
    if (formData.name.length > 100) errors.push('Name must be less than 100 characters');
    if (formData.email.length > 100) errors.push('Email must be less than 100 characters');
    if (formData.subject && formData.subject.length > 150) {
      errors.push('Subject must be less than 150 characters');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        html: validationErrors.join('<br>'),
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(
        '/api/Feedback/Feedback.php?action=add',
        {
          name: formData.name.trim(),
          email: formData.email.trim(),
          subject: formData.subject.trim() || null, // Send null if subject is empty
          message: formData.message.trim(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Thank You!',
          text: 'Your feedback has been submitted successfully.',
          confirmButtonColor: '#4f46e5',
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
        }).then(() => {
          setFormData({
            name: '',
            email: '',
            subject: '',
            message: '',
          });
        });
      } else {
        throw new Error(response.data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      let errorMessage = error.message;

      // Handle axios error response
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }

      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: errorMessage || 'An error occurred while submitting your feedback',
        confirmButtonColor: '#4f46e5',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-us-container">
      {/* Hero Section */ }
      <section className="contact-us-hero">
        <h1 className=''>Contact Us</h1>
        <p>We'd love to hear from you!</p>
      </section>

      {/* Feedback Form and Map Section */ }
      <section className="contact-us-form-map">
        <div className="contact-us-columns">
          {/* Form Column */ }
          <div className="contact-us-form-column">
            <div className="contact-us-form-container">
              <h2 className="contact-us-section-title">CONTACT US</h2>
              <form className="contact-us-form" onSubmit={ handleSubmit }>
                <div className="contact-us-form-group">
                  <label htmlFor="name" className="contact-us-form-label">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={ formData.name }
                    onChange={ handleChange }
                    className="contact-us-form-input"
                    placeholder="Enter your name..."
                    required
                    maxLength="100"
                  />
                </div>

                <div className="contact-us-form-row">
                  <div className="contact-us-form-group">
                    <label htmlFor="email" className="contact-us-form-label">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={ formData.email }
                      onChange={ handleChange }
                      className="contact-us-form-input"
                      placeholder="example@gmail.com"
                      required
                      maxLength="100"
                    />
                  </div>

                  <div className="contact-us-form-group">
                    <label htmlFor="subject" className="contact-us-form-label">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={ formData.subject }
                      onChange={ handleChange }
                      className="contact-us-form-input"
                      placeholder="Subject (optional)"
                      maxLength="150"
                    />
                  </div>
                </div>

                <div className="contact-us-form-group">
                  <label htmlFor="message" className="contact-us-form-label">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={ formData.message }
                    onChange={ handleChange }
                    rows="6"
                    className="contact-us-form-textarea"
                    placeholder="Write your message here..."
                    required
                  ></textarea>
                </div>

                <div className="contact-us-form-group">
                  <button
                    type="submit"
                    className="contact-us-form-button"
                    disabled={ isSubmitting }
                    aria-label="Submit feedback"
                  >
                    { isSubmitting ? (
                      <>
                        <span className="spinner"></span> Submitting...
                      </>
                    ) : (
                      'Submit'
                    ) }
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Map Column */ }
          <div className="contact-us-map-column">
            <div className="contact-us-map-container">
              <h2 className="contact-us-section-title">Our Location</h2>
              <div className="contact-us-map">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d505.37837942113816!2d123.63783568100023!3d10.104821517378808!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a97d004045a0fb%3A0x197b5dc4e6b0dba7!2sIsla%20del%20Caf%C3%A9%20-%20Carcar!5e0!3m2!1sen!2sph!4v1745654781736!5m2!1sen!2sph"
                  width="100%"
                  height="100%"
                  style={ { border: 0 } }
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Isla del Café location"
                  aria-label="Google Maps location of Isla del Café"
                />
              </div>
              <div className="contact-us-directions">
                <h2>Isla Del Cafe</h2>
                <p>Cogon, Poblacion 1, Carcar City</p>
                <div className="contact-us-info-details">
                  <p>
                    <span className="contact-us-info-icon">📞</span> 09751883932
                  </p>
                  <p>
                    <span className="contact-us-info-icon">✉️</span>
                    isladelcafecarcar@gmail.com
                  </p>
                </div>
                <button
                  className="contact-us-directions-button"
                  onClick={ () => {
                    window.open(
                      'https://www.google.com/maps/dir//Isla+del+Caf%C3%A8+-+Carcar,+Carcar+City,+Cebu,+Philippines',
                      '_blank'
                    );
                  } }
                  aria-label="Get directions to Isla del Café"
                >
                  Get Directions
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media Section */ }
      <section className="contact-us-social">
        <div className="contact-us-social-content">
          <h2 className="contact-us-section-title centered">Connect With Us</h2>
          <p className="contact-us-social-text">
            Follow us on social media for updates, promotions, and coffee inspiration!
          </p>
          <div className="contact-us-social-icons">
            <NavLink
              to="/facebook"
              className="contact-us-social-icon"
              aria-label="Facebook"
            >
              <div className="contact-us-social-circle">📱</div>
              <span>Facebook</span>
            </NavLink>

            <NavLink
              to="/instagram"
              className="contact-us-social-icon"
              aria-label="Instagram"
            >
              <div className="contact-us-social-circle">📸</div>
              <span>Instagram</span>
            </NavLink>

            <NavLink
              to="/twitter"
              className="contact-us-social-icon"
              aria-label="Twitter"
            >
              <div className="contact-us-social-circle">🐦</div>
              <span>Twitter</span>
            </NavLink>

            <NavLink
              to="/youtube"
              className="contact-us-social-icon"
              aria-label="YouTube"
            >
              <div className="contact-us-social-circle">▶️</div>
              <span>YouTube</span>
            </NavLink>
          </div>
        </div>
      </section>


      {/* FAQ Section */ }
      {/* FAQ Section */ }
      <section className="contact-us-faq">
        <div className="contact-us-faq-content">
          <h2 className="contact-us-section-title centered">Frequently Asked Questions</h2>
          <div className="contact-us-faq-grid">
            <div className="contact-us-faq-item">
              <h3 className="contact-us-faq-question">
                How does the web-based ordering system work?
              </h3>
              <p className="contact-us-faq-answer">
  Our online platform allows you to browse our coffee menu and place orders.
  You can choose to pick up your order at our Carcar location, or manually send payment through GCash.
  Simply provide the reference number, and we will deliver your order within Carcar City.
</p>

            </div>
            <div className="contact-us-faq-item">
              <h3 className="contact-us-faq-question">What are my payment options?</h3>
              <p className="contact-us-faq-answer">
                We currently accept cash payments only. For pickup orders, pay when you
                collect your items. For delivery orders, pay cash upon receipt of your
                order.
              </p>
            </div>
            <div className="contact-us-faq-item">
              <h3 className="contact-us-faq-question">What areas do you deliver to?</h3>
              <p className="contact-us-faq-answer">
                We currently offer delivery only within Carcar City. For pickup orders,
                please collect at our Cogon, Poblacion 1 location.
              </p>
            </div>
            <div className="contact-us-faq-item">
              <h3 className="contact-us-faq-question">How can I track my order?</h3>
              <p className="contact-us-faq-answer">
                For delivery orders: Our delivery staff will contact you via the phone
                number you provided when your order is ready and on its way.
                <br />
                <br />
                For pickup orders: We will call or SMS you when your order is ready for
                collection at our store.
              </p>
            </div>
            <div className="contact-us-faq-item">
              <h3 className="contact-us-faq-question">What are your operating hours?</h3>
              <p className="contact-us-faq-answer">
                Coffee pickup is available daily from 11:00 AM to 11:00 PM. Delivery is also available during the same hours.
                Orders placed close to closing time may still be processed, but please allow a few extra minutes for preparation.
              </p>
            </div>
            <div className="contact-us-faq-item">
              <h3 className="contact-us-faq-question">Can I modify or cancel my order?</h3>
              <p className="contact-us-faq-answer">
                Yes! You can modify or cancel your coffee order up to 15 minutes before your scheduled pickup or delivery time.
                For urgent requests, feel free to contact us directly at 09751883932.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Contact;
