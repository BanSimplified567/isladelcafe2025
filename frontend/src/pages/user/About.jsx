import IslaDelCafeAteGail from '@assets/IslaDelCafeAteGailAbout.jpg';
import IslaDelCafeBg3 from '@assets/IslaDelCafeBg3.jpg';
import IslaDelCafeKuyaKenn from '@assets/IslaDelCafeKuyaKenn.jpg';

import Footer from '@components/Footer';
import { useNavigate } from 'react-router-dom';

import Blog1 from '@assets/Blog1.jpg';
import Blog2 from '@assets/Blog2.png';
import Blog3 from '@assets/Blog3.jpg';
import Blog4 from '@assets/Blog4.jpg';
import '@style/AboutUs.css'; // Create this CSS file

function AboutUs() {
  const navigate = useNavigate();

  return (
    <div className="about-us-container">
      {/* Hero Section */ }
      <section className="about-us-hero">
        <div className="about-us-hero-content">
          <h1 className="about-us-title">
            ABOUT <span>ISLA DEL CAFE</span>
          </h1>
          <div className="elegant-divider">
            <div className="divider-line"></div>
            <div className="coffee-icon">☕</div>
            <div className="divider-line"></div>
          </div>
          <p className="about-us-subtitle">
            Your tropical coffee escape in the Heritage City of the South.
          </p>
        </div>
      </section>

      {/* Our Story Section */ }
      <section className="about-us-story">
        <div className="about-us-story-content">
          <div className="about-us-story-text">
            <h2 className="about-us-section-title">Our Story</h2>
            <div className="text-divider">
              <div className="divider-line"></div>
              <div className="coffee-icon">✻</div>
              <div className="divider-line"></div>
            </div>
            <p className="about-us-text">
              Founded in 2025, Isla Del Cafe began as a dream to create a tropical coffee
              sanctuary in the heart of Carcar City. Our name, meaning "Coffee Island,"
              reflects our vision to be an oasis of exceptional coffee and warm hospitality.
            </p>
            <p className="about-us-text">
              What started as a small kiosk has grown into a beloved local destination where
              coffee lovers gather to enjoy handcrafted beverages and delicious snacks in a
              relaxing atmosphere that celebrates our Filipino heritage.
            </p>
          </div>
          <div className="about-us-story-image">
            <div className="image-frame">
              <img src={ IslaDelCafeBg3 } alt="Isla Del Cafe Shop" />
            </div>
          </div>
          <div className="about-us-mission-text">
            <h2 className="about-us-section-title">Our Mission</h2>
            <div className="text-divider">
              <div className="divider-line"></div>
              <div className="coffee-icon">❈</div>
              <div className="divider-line"></div>
            </div>
            <p className="about-us-text">
              At Isla Del Cafe, our mission is to serve exceptional coffee experiences that
              bring people together. We are committed to:
            </p>
            <ul className="about-us-list">
              <li>
                <span className="list-icon">⌑</span>
                Sourcing the highest quality coffee beans from sustainable producers
              </li>
              <li>
                <span className="list-icon">⌑</span>
                Creating a warm, welcoming space for our community
              </li>
              <li>
                <span className="list-icon">⌑</span>
                Supporting local suppliers and celebrating Filipino culture
              </li>
              <li>
                <span className="list-icon">⌑</span>
                Providing outstanding service that makes every customer feel at home
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Meet The Team Section */ }
      <section className="about-us-team">
        <div className="section-header">
          <h2 className="about-us-section-title">Meet Our Team</h2>
          <div className="text-divider">
            <div className="divider-line"></div>
            <div className="coffee-icon">✧</div>
            <div className="divider-line"></div>
          </div>
        </div>

        <div className="about-us-team-grid">
          <div className="about-us-team-member">
            <div className="team-image-frame">
              <img src={ IslaDelCafeAteGail } alt="Miss Gail Labasan - Owner" />
            </div>
            <div className="team-member-details">
              <h3 className="about-us-team-name">Miss Gail Labasan</h3>
              <p className="about-us-team-role">Founder & Owner</p>
              <div className="team-divider"></div>
              <p className="about-us-team-bio">
                With a passion for coffee and hospitality, Gail Labasan created Isla Del
                Cafe to share her love for quality beverages and Filipino culture with the
                community of Carcar City.
              </p>
            </div>
          </div>

          <div className="about-us-team-member">
            <div className="team-image-frame">
              <img src={ IslaDelCafeKuyaKenn } alt="Isla Del Cafe Team" />
            </div>
            <div className="team-member-details">
              <h3 className="about-us-team-name">Our Baristas</h3>
              <p className="about-us-team-role">Coffee Specialists</p>
              <div className="team-divider"></div>
              <p className="about-us-team-bio">
                Our skilled team of baristas is dedicated to crafting the perfect cup every
                time. Each member brings their unique talents and passion to create an
                exceptional coffee experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLogs Section */ }
      <section className="aboutus-container-blog">
        <div className="aboutus-blog-header">
          <h2 className="about-us-section-title">Our Blog</h2>
          <div className="text-divider">
            <div className="divider-line"></div>
            <div className="coffee-icon">✧</div>
            <div className="divider-line"></div>
          </div>
          <p className="about-us-text">
            Stay updated with the latest news, coffee tips, and community events on our blog.
            Discover more about our journey and the world of coffee.
          </p>
        </div>

        <div className="aboutus-blog-cards">
          <div className="aboutus-blog-card">
            <div className="blog-image-container">
              <img src={ Blog1 } alt="Coffee bean origins" />
            </div>
            <div className="aboutus-blog-card-content">
              <div className="blog-card-header">
                <span className="blog-category">Blog 1</span>
                <span className="blog-date">February 20, 2025</span>
              </div>
              <h3 className="aboutus-blog-card-title">Grand Opening</h3>
              <p className="aboutus-blog-card-text">
                1st of February and it’s time to celebrate new beginnings! Our doors will be
                finally open soon!🤎 Come celebrate our grand opening and be part of
                something special. We can’t wait to share this exciting journey with
                you!🌴💫
              </p>
            </div>
          </div>
          <div className="aboutus-blog-card">
            <div className="blog-image-container">
              <img src={ Blog2 } alt="Coffee brewing techniques" />
            </div>
            <div className="aboutus-blog-card-content">
              <div className="blog-card-header">
                <span className="blog-category">Blog 2</span>
                <span className="blog-date">February 11, 2025</span>
              </div>
              <h3 className="aboutus-blog-card-title">Carcar City are you ready?</h3>
              <p className="aboutus-blog-card-text">
                Carcar City are you ready?☕🎉🌴Finally, our doors will officially open
                tomorrow and we’re ready to serve you your favorite cup of coffee. Come
                celebrate our GRAND OPENING as we will be giving 100 free cups for the first
                100 customers! All you need to do is follow the mechanics below. Kitakits!🤗
              </p>
            </div>
          </div>

          <div className="aboutus-blog-card">
            <div className="blog-image-container">
              <img src={ Blog3 } alt="Coffee shop interior" />
            </div>
            <div className="aboutus-blog-card-content">
              <div className="blog-card-header">
                <span className="blog-category">Blog 3</span>
                <span className="blog-date">April 1, 2025</span>
              </div>
              <h3 className="aboutus-blog-card-title">Hello April</h3>
              <p className="aboutus-blog-card-text">
                April Fools' reminder: Don’t mess with people's lives and feelings. 🤎🤗🌴
                Let’s make this month brew-tiful together!
              </p>
            </div>
          </div>
          <div className="aboutus-blog-card">
            <div className="blog-image-container">
              <img src={ Blog4 } alt="Coffee shop interior" />
            </div>
            <div className="aboutus-blog-card-content">
              <div className="blog-card-header">
                <span className="blog-category">Blog 4 </span>
                <span className="blog-date">May 20, 2025</span>
              </div>
              <h3 className="aboutus-blog-card-title">First 2 people Get free Drinks!</h3>
              <p className="aboutus-blog-card-text">
                Hot weather, cool giveaway! To mark our 3rd month, the first 3 fan-tastic
                folks to show up with a fan get 2 free iced drinks. Let’s keep things
                chill—literally.🌴💚
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */ }
      <section className="about-us-values">
        <div className="section-header">
          <h2 className="about-us-section-title">Our Values</h2>
          <div className="text-divider">
            <div className="divider-line"></div>
            <div className="coffee-icon">✻</div>
            <div className="divider-line"></div>
          </div>
        </div>

        <div className="about-us-values-grid">
          <div className="about-us-value-card">
            <div className="value-icon-container">
              <span className="about-us-value-icon">☕</span>
            </div>
            <h3 className="about-us-value-title">Quality</h3>
            <div className="value-divider"></div>
            <p className="about-us-value-text">
              We never compromise on the quality of our ingredients or our products.
            </p>
          </div>

          <div className="about-us-value-card">
            <div className="value-icon-container">
              <span className="about-us-value-icon">🌿</span>
            </div>
            <h3 className="about-us-value-title">Sustainability</h3>
            <div className="value-divider"></div>
            <p className="about-us-value-text">
              We're committed to environmentally friendly practices and supporting
              sustainable coffee farming.
            </p>
          </div>

          <div className="about-us-value-card">
            <div className="value-icon-container">
              <span className="about-us-value-icon">🏝️</span>
            </div>
            <h3 className="about-us-value-title">Community</h3>
            <div className="value-divider"></div>
            <p className="about-us-value-text">
              We celebrate and support our local community and culture in everything we do.
            </p>
          </div>

          <div className="about-us-value-card">
            <div className="value-icon-container">
              <span className="about-us-value-icon">😊</span>
            </div>
            <h3 className="about-us-value-title">Hospitality</h3>
            <div className="value-divider"></div>
            <p className="about-us-value-text">
              We treat every customer like family and provide a warm, welcoming experience.
            </p>
          </div>
        </div>
      </section>

      {/* Visit Us CTA Section */ }
      <section className="about-us-cta">
        <div className="about-us-cta-content">
          <h2 className="about-us-cta-title">Come Visit Us</h2>
          <div className="text-divider">
            <div className="divider-line"></div>
            <div className="coffee-icon">✧</div>
            <div className="divider-line"></div>
          </div>
          <p className="about-us-cta-text">
            Experience the warm hospitality and exceptional coffee at Isla Del Cafe. We're
            open daily from 11:00 AM to 11:00 PM.
          </p>
          <div className="about-us-cta-buttons">
            <button className="about-us-cta-button primary" onClick={ () => navigate('/menu') }>
              View Our Menu
            </button>
            <button
              className="about-us-cta-button secondary"
              onClick={ () => {
                const contactSection = document.querySelector('.index-contactUs-container');
                if (contactSection) {
                  contactSection.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate('/contact');
                }
              } }
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default AboutUs;
