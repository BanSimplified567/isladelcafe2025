import Blog1 from '@assets/Blog1.jpg';
import Blog2 from '@assets/Blog2.png';
import Blog3 from '@assets/Blog3.jpg';
import IslaDelCafeAboutShop from '@assets/IslaDelCafeAboutShop.jpg';
import IslaDelCafeAteGail from '@assets/IslaDelCafeAteGail.jpg';
import IslaDelCafeBestSeller from '@assets/IslaDelCafeBestSeller.jpg';
import IslaDelCafeBg1 from '@assets/IslaDelCafeBg1.jpg';
import IslaDelCafeBg2 from '@assets/IslaDelCafeBg2.jpg';
import IslaDelCafeBg3 from '@assets/IslaDelCafeBg3.jpg';
import IslaDelCafeCoffee from '@assets/IslaDelCafeCoffee.jpg';
import IslaDelCafePeople from '@assets/IslaDelCafePeople.jpg';
import IslaDelCafeReviewFive from '@assets/IslaDelCafeReviewFive.jpg';
import IslaDelCafeReviewFour from '@assets/IslaDelCafeReviewFour.jpg';
import IslaDelCafeReviewOne from '@assets/IslaDelCafeReviewOne.jpg';
import IslaDelCafeReviewSix from '@assets/IslaDelCafeReviewSix.jpg';
import IslaDelCafeReviewThree from '@assets/IslaDelCafeReviewThree.jpg';
import IslaDelCafeReviewTwo from '@assets/IslaDelCafeReviewTwo.jpg';
import IslaDelCafeShop from '@assets/IslaDelCafeShop.jpg';
import IslaDelCafeOwner from '@assets/OwnerIslaDelCafe.jpg';
import Footer from '@components/Footer';
import useProductStore from '@store/useProductStore';
import '@style/AboutUs.css';
import { ChevronLeft, ChevronRight, Gift, Headset, Tag, Truck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import '../../index.css';

function Index() {
  const navigate = useNavigate();
  const [isCentered, setIsCentered] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const { products, pagination, fetchProducts, error } = useProductStore();

  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    number: '',
    message: '',
  });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [indexHeader, setIndexHeader] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);

  const itemsPerPage = 8;
  const API_BASE = 'http://localhost:8000/backend/public/index.php';

  useEffect(() => {
    const updateCardsPerView = () => {
      if (window.innerWidth < 768) {
        setCardsPerView(1);
      } else if (window.innerWidth < 1024) {
        setCardsPerView(2);
      } else {
        setCardsPerView(3);
      }
    };

    window.addEventListener('resize', updateCardsPerView);
    updateCardsPerView();

    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);
  useEffect(() => {
    fetchProducts(currentPage + 1, pagination.limit);
  }, [currentPage, fetchProducts, pagination.limit]);

  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error,
        confirmButtonColor: '#4f46e5',
      });
    }
  }, [error]);

  const slides = [
    {
      background: IslaDelCafeShop,
      title: 'ISLA DEL CAFE',
      description: 'Welcome to your tropical coffee escape in the Heritage City of the South.',
    },
    {
      background: IslaDelCafeBg1,
      title: 'PREMIUM COFFEE',
      description: 'Experience the finest locally sourced coffee beans.',
    },
    {
      background: IslaDelCafeBg2,
      title: 'COZY ATMOSPHERE',
      description: 'The perfect place to relax and enjoy your favorite brew.',
    },
    {
      background: IslaDelCafeBg3,
      title: 'TRY OUR BESTSELLERS',
      description: "Discover why our Java Chips are everyone's favorite!",
    },
  ];
  const totalHeaderPage = slides.length;

  const testimonials = [
    {
      name: 'Nikko',
      text: 'Bought 4x the taste is okay for its price if you can wait for 20min minimum',
      image: IslaDelCafeReviewOne,
      rating: 5,
    },
    {
      name: 'Vince Mar',
      text: 'The atmosphere here is unmatched. Perfect place to work remotely or just enjoy a quiet moment with excellent coffee and service.',
      image: IslaDelCafeReviewTwo,
      rating: 5,
    },
    {
      name: 'Kenzo Yap',
      text: 'I visit weekly for their specialty drinks. The staff is always friendly and remembers my order. Truly a gem in our community!',
      image: IslaDelCafeReviewThree,
      rating: 5,
    },
    {
      name: 'Fermosa Colección',
      text: 'I visit weekly for their specialty drinks. The staff is always friendly and remembers my order. Truly a gem in our community!',
      image: IslaDelCafeReviewFour,
      rating: 5,
    },
    {
      name: 'Kim Donelle',
      text: 'Woww 🍵 Drinks available in espresso based, milk based, juice and matcha series 🙌🏻',
      image: IslaDelCafeAboutShop,
      rating: 5,
    },
    {
      name: 'Kabeatisreal photography',
      text: `Need a break? Head to IslaDelCafe and discover why their best-sellers are everyone's favorite!`,
      image: IslaDelCafeReviewFive,
      rating: 5,
    },
    {
      name: 'Jefferson Tolorio',
      text: `I found my perfect blend of serenity in a cup at isladelcafe.carcar`,
      image: IslaDelCafeReviewSix,
      rating: 5,
    },
  ];

  const slideIntervalRef = useRef(null);

  const startTimer = () => {
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current);
    }
    slideIntervalRef.current = setInterval(() => {
      setIndexHeader((prev) => (prev < totalHeaderPage - 1 ? prev + 1 : 0));
    }, 15000);
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(slideIntervalRef.current);
  }, []);

  const resetTimer = () => {
    startTimer();
  };

  const nextSlide = () => {
    setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
  };

  const prevSlide = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
  };

  const maxSlides = Math.max(0, Math.ceil(testimonials.length / cardsPerView) - 1);

  const handlePrevTestimonial = () => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  };

  const handleNextTestimonial = () => {
    setCurrentSlide((prev) => Math.min(maxSlides, prev + 1));
  };

  const getTransformValue = () => {
    return -(currentSlide * (100 / cardsPerView));
  };

  // Fetch products from the backend
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(
          `${API_BASE}?action=get-products&limit=${itemsPerPage}&page=${currentPage + 1}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          }
        );
        const data = await response.json();
        if (data.success) {
          setTotalPages(data.pagination?.total_pages || 1);
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: data.message || 'Failed to fetch products',
            confirmButtonColor: '#4f46e5',
          });
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to fetch products. Please try again later.',
          confirmButtonColor: '#4f46e5',
        });
      }
    };

    fetchProducts();
  }, [currentPage]);

  const toggleImageCenter = () => setIsCentered(!isCentered);
  const formatPrice = (price) => `₱${parseFloat(price).toFixed(2)}`;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { name, email, message } = formData;
      if (!name || !email || !message) {
        Swal.fire({
          icon: 'warning',
          title: 'Missing Fields',
          text: 'Name, email, and message are required.',
          confirmButtonColor: '#4f46e5',
        });
        return;
      }

      const response = await fetch(
        `${API_BASE}?action=add-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ name, email, message }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setFormData({ name: '', email: '', number: '', message: '' });
        Swal.fire({
          icon: 'success',
          title: 'Submitted!',
          text: 'Your message has been sent successfully.',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to send message',
        confirmButtonColor: '#4f46e5',
      });
    }
  };

  return (
    <div className="index-container">
      {/* Header Section */ }
      <section
        className="index-section-header"
        style={ { backgroundImage: `url(${slides[indexHeader].background})` } }
      >
        <div className="header-overlay"></div>
        <div className="header-content">
          <div className="index-section-title">
            <h1>
              { slides[indexHeader].title.split(' ').map((word, i) =>
                word === 'ISLA' || word === 'DEL' || word === 'CAFE' ? (
                  <span key={ i } className="highlight-word">
                    { word }{ ' ' }
                  </span>
                ) : (
                  <span key={ i }>{ word } </span>
                )
              ) }
            </h1>
            <p className="header-description">{ slides[indexHeader].description }</p>
            <div className="header-buttons">
              <button className="btn-primary" onClick={ () => navigate('/menu') }>
                ORDER NOW
              </button>
              <button className="btn-outline">
                <NavLink to="/about">ABOUT US</NavLink>
              </button>
            </div>
          </div>
        </div>
        <div className="carousel-indicators">
          { slides.map((_, index) => (
            <button
              key={ index }
              className={ `indicator ${index === indexHeader ? 'active' : ''}` }
              onClick={ () => {
                setIndexHeader(index);
                resetTimer();
              } }
              aria-label={ `Go to slide ${index + 1}` }
            />
          )) }
        </div>
      </section>

      {/* About Us Section */ }
      <article className="index-container-aboutus" id="aboutus">
        <div className="index-section-aboutus">
          <p>~ ABOUT US</p>
          <h1>
            Discover The Taste Of Real <span>Coffee With Friends.</span>
          </h1>
          <p>
            Isla Del Cafe is a unique coffeehouse that offers a warm and welcoming atmosphere,
            where you can unwind and enjoy a cup of coffee in the heart of Carcar City. Our
            coffee is carefully roasted and brewed to perfection, resulting in a rich and
            flavorful experience that will leave you craving for more.
          </p>
          <button onClick={ () => navigate('/about') }>Read More</button>
        </div>
        <div className="index-section-images">
          <div className="image-grid">
            { [IslaDelCafeOwner, IslaDelCafePeople, IslaDelCafeCoffee, IslaDelCafeShop].map(
              (src, index) => (
                <div key={ index } className="index-grid-item">
                  <img
                    src={ src }
                    alt={ `Isla Del Cafe Image ${index + 1}` }
                    onError={ (e) => {
                      e.target.onerror = null;
                      e.target.src = '/assets/Isladelcafe.jpg';
                    } }
                  />
                </div>
              )
            ) }
          </div>
        </div>
      </article>

      {/* Features Section */ }
      <article className="index-features-container">
        <div className="index-features-grid">
          <div className="index-feature-card">
            <div className="index-feature-icon">
              <Truck className="icon" />
            </div>
            <h3 className="index-feature-title">Local Delivery</h3>
            <p className="index-feature-desc">
              Fast and reliable delivery service within Carcar City.
            </p>
          </div>
          <div className="index-feature-card">
            <div className="index-feature-icon">
              <Gift className="icon" />
            </div>
            <h3 className="index-feature-title">Customer Rewards</h3>
            <p className="index-feature-desc">
              Earn points and exclusive perks with every purchase.
            </p>
          </div>
          <div className="index-feature-card">
            <div className="index-feature-icon">
              <Tag className="icon" />
            </div>
            <h3 className="index-feature-title">Promos & Discounts</h3>
            <p className="index-feature-desc">
              Enjoy special deals on selected items every week.
            </p>
          </div>
          <div className="index-feature-card">
            <div className="index-feature-icon">
              <Headset className="icon" />
            </div>
            <h3 className="index-feature-title">Online Support</h3>
            <p className="index-feature-desc">
              Need help? Reach us anytime through our online service.
            </p>
          </div>
        </div>
      </article>

      {/* Bestseller Section */ }
      <article className="index-container-bestseller">
        <div className="bestseller-content-wrapper">
          <img
            src={ IslaDelCafeBestSeller }
            alt="Java Chips - Isla Del Cafe Best Seller"
            className={ `bestseller-image ${isCentered ? 'centered-image' : ''}` }
            onClick={ toggleImageCenter }
          />
          <section className="index-bestseller-article">
            <div className="bestseller-text-content">
              <h1>JAVA CHIPS</h1>
              <p className="bestseller-description">
                A deliciously indulgent blend of rich coffee, chocolate chips, and creamy
                milk, all served over ice.
              </p>
              <div className="index-bestseller-features">
                <span>RICH ESPRESSO</span>
                <span>CREAMY MILK</span>
                <span>CHOCOLATE CHIPS</span>
              </div>
            </div>
          </section>
        </div>
      </article>

      {/* Menu Section */ }
      <div className="index-menu-container">
        <h1 className="index-menu-title">The Grind Coffee Menu</h1>
        <div className="index-menu-grid">
          { products.map((product) => (
            <div key={ product.product_id } className="index-menu-item">
              <div className="index-menu-image-wrapper">
                <img
                  src={ product.image }
                  alt={ product.name }
                  className="index-menu-image"
                  onError={ (e) => {
                    e.target.onerror = null;
                    e.target.src = '/assets/Isladelcafe.jpg';
                  } }
                  loading="lazy"
                />
              </div>
              <div className="index-menu-content">
                <h3 className="index-menu-product-name">{ product.name }</h3>
                <div className="index-menu-product-details">
                  <div className="index-menu-price-container">
                    <span className="index-menu-price">
                      { formatPrice(product.small_price) }
                    </span>
                  </div>
                  <span className="index-menu-category">{ product.type }</span>
                </div>
              </div>
            </div>
          )) }
        </div>

        {/* Pagination Controls */ }
        <div className="index-menu-controls">
          <div className="index-menu-pagination">
            { Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={ index }
                onClick={ () => setCurrentPage(index) }
                className={ `index-menu-dot ${currentPage === index ? 'index-menu-dot-active' : ''}` }
                aria-label={ `Go to page ${index + 1}` }
              />
            )) }
          </div>
          <div className="index-menu-slide-info">
            Page { currentPage + 1 } of { totalPages || 1 }
          </div>
          <div className="index-menu-navigation">
            <button
              onClick={ prevSlide }
              className="index-menu-button index-menu-button-prev"
              disabled={ currentPage === 0 }
              aria-label="Previous page"
            >
              <ChevronLeft className="button-icon" />
              PREVIOUS
            </button>
            <button
              onClick={ nextSlide }
              className="index-menu-button index-menu-button-next"
              disabled={ currentPage >= totalPages - 1 }
              aria-label="Next page"
            >
              NEXT
              <ChevronRight className="button-icon" />
            </button>
          </div>
        </div>
      </div>

      {/* About Section */ }
      <div className="index-about-isladelcafe">
        <section className="index-about-header">
          <img src={ IslaDelCafeAteGail } alt="IslaDelCafeAteGail" />
          <span className="index-about-span">
            <h1>Our Shop</h1>
            <h3>Our Dream Gallery</h3>
            <p>
              Boost your productivity and build your mood with a short break in the most
              comfortable place.
            </p>
          </span>
        </section>

        {/* Customer Testimonials */ }
        <div className="index-customer-container">
          <section className="index-customer-header">
            <h1>What</h1>
            <p>Our Customers Say</p>
          </section>
          <div className="index-customer-carousel-wrapper">
            <button
              className="carousel-button prev"
              onClick={ handlePrevTestimonial }
              disabled={ currentSlide === 0 }
              aria-label="Previous testimonials"
            >
              <ChevronLeft />
            </button>
            <div className="index-customer-carousel-container">
              <div
                className="index-customer-carousel"
                style={ { transform: `translateX(${getTransformValue()}%)` } }
              >
                { testimonials.map((testimonial, index) => (
                  <div
                    key={ index }
                    className="index-customer-card"
                    style={ { flex: `0 0 ${100 / cardsPerView}%` } }
                  >
                    <div className="index-customer-card-inner">
                      <img
                        src={ testimonial.image }
                        alt={ testimonial.name }
                        className="index-customer-card-image"
                        loading="lazy"
                      />
                      <div className="index-customer-card-content">
                        <h3 className="index-customer-card-name">{ testimonial.name }</h3>
                        <p className="index-customer-card-text">"{ testimonial.text }"</p>
                        <div className="index-customer-card-rating">
                          { [...Array(5)].map((_, i) => (
                            <span
                              key={ i }
                              className={ `star ${i < testimonial.rating ? 'filled' : ''}` }
                            >
                              ★
                            </span>
                          )) }
                        </div>
                      </div>
                    </div>
                  </div>
                )) }
              </div>
            </div>
            <button
              className="carousel-button next"
              onClick={ handleNextTestimonial }
              disabled={ currentSlide >= maxSlides }
              aria-label="Next testimonials"
            >
              <ChevronRight />
            </button>
          </div>
        </div>

        {/* Blog Section */ }
        <section className="aboutus-container-blog">
          <div className="aboutus-blog-header">
            <h2 className="about-us-section-title">Our Blog</h2>
            <div className="text-divider">
              <div className="divider-line"></div>
              <div className="coffee-icon">✧</div>
              <div className="divider-line"></div>
            </div>
            <p className="about-us-text">
              Stay updated with the latest news, coffee tips, and community events on our
              blog. Discover more about our journey and the world of coffee.
            </p>
          </div>
          <div className="aboutus-blog-cards">
            <div className="aboutus-blog-card">
              <div className="blog-image-container">
                <img src={ Blog1 } alt="Grand Opening" />
              </div>
              <div className="aboutus-blog-card-content">
                <div className="blog-card-header">
                  <span className="blog-category">Blog 1</span>
                  <span className="blog-date">February 20, 2025</span>
                </div>
                <h3 className="aboutus-blog-card-title">Grand Opening</h3>
                <p className="aboutus-blog-card-text">
                  1st of February and it’s time to celebrate new beginnings! Our doors will
                  be finally open soon!🤎 Come celebrate our grand opening and be part of
                  something special. We can’t wait to share this exciting journey with
                  you!🌴💫
                </p>
              </div>
            </div>
            <div className="aboutus-blog-card">
              <div className="blog-image-container">
                <img src={ Blog2 } alt="Carcar City Grand Opening" />
              </div>
              <div className="aboutus-blog-card-content">
                <div className="blog-card-header">
                  <span className="blog-category">Blog 2</span>
                  <span className="blog-date">February 11, 2025</span>
                </div>
                <h3 className="aboutus-blog-card-title">Carcar City are you ready?</h3>
                <p className="aboutus-blog-card-text">
                  Carcar City are you ready?☕🎉🌴 Finally, our doors will officially open
                  tomorrow and we’re ready to serve you your favorite cup of coffee. Come
                  celebrate our GRAND OPENING as we will be giving 100 free cups for the
                  first 100 customers! All you need to do is follow the mechanics below.
                  Kitakits!🤗
                </p>
              </div>
            </div>
            <div className="aboutus-blog-card">
              <div className="blog-image-container">
                <img src={ Blog3 } alt="Hello April" />
              </div>
              <div className="aboutus-blog-card-content">
                <div className="blog-card-header">
                  <span className="blog-category">Blog 3</span>
                  <span className="blog-date">April 1, 2025</span>
                </div>
                <h3 className="aboutus-blog-card-title">Hello April</h3>
                <p className="aboutus-blog-card-text">
                  April Fools' reminder: Don’t mess with people's lives and feelings.
                  🤎🤗🌴 Let’s make this month brew-tiful together!
                </p>
              </div>
            </div>
          </div>
          <div className="blog-view-all">
            <NavLink to="/about" className="view-all-button">
              View All Articles
            </NavLink>
          </div>
        </section>

        {/* Contact Us Section */ }
        <section className="index-contactUs-container">
          <div className="index-contactUs-location">
            <div className="index-contactUs-location-header">Our Location</div>
            <div className="index-contactUs-location-content">
              <div className="index-contactUs-location-map">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3927.9292655632853!2d123.63531687450946!3d10.104875971222398!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a97d004045a0fb%3A0x197b5dc4e6b0dba7!2sIsla%20del%20Caf%C3%A8%20-%20Carcar!5e0!3m2!1sen!2sph!4v1742131194650!5m2!1sen!2sph"
                  width="100%"
                  height="100%"
                  style={ { border: 0 } }
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Isla del Cafè location"
                ></iframe>
              </div>
              <h3 className="index-contactUs-location-title">Carcar City</h3>
              <p className="index-contactUs-location-address">
                Isla del Cafè - Carcar
                <br />
                Carcar City, Cebu
                <br />
                Philippines
              </p>
            </div>
          </div>
          <div className="index-contactUs-form">
            <div className="index-contactUs-form-header">Contact Us</div>
            <div className="index-contactUs-form-content">
              <form onSubmit={ handleSubmit } className="index-contactUs-form-fields">
                <div className="index-contactUs-form-group">
                  <label htmlFor="name" className="index-contactUs-form-label">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={ formData.name }
                    onChange={ handleInputChange }
                    className="index-contactUs-form-input"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div className="index-contactUs-form-group">
                  <label htmlFor="email" className="index-contactUs-form-label">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={ formData.email }
                    onChange={ handleInputChange }
                    className="index-contactUs-form-input"
                    placeholder="example@email.com"
                    required
                  />
                </div>
                <div className="index-contactUs-form-group">
                  <label htmlFor="number" className="index-contactUs-form-label">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="number"
                    name="number"
                    value={ formData.number }
                    onChange={ handleInputChange }
                    className="index-contactUs-form-input"
                    placeholder="+63 123 456 7890"
                  />
                </div>
                <div className="index-contactUs-form-group">
                  <label htmlFor="message" className="index-contactUs-form-label">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="4"
                    value={ formData.message }
                    onChange={ handleInputChange }
                    className="index-contactUs-form-textarea"
                    placeholder="Write your message here..."
                    required
                  ></textarea>
                </div>
                <div className="index-contactUs-form-group">
                  <button type="submit" className="index-contactUs-form-button">
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    </div>
  );
}

export default Index;
