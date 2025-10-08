import useAuthStore from '@store/authStore';
import '@style/indexError.css';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const { isAuthenticated, userData } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && userData?.role !== 'customer') {
      navigate('/loginadmin');
    }
  }, [isAuthenticated, userData, navigate]);

  return (
    <div className="index-error-container">
      <div className="index-error-box">
        <h1 className="index-error-code">404</h1>
        <h2 className="index-error-title">Page Not Found</h2>
        <div className="index-error-divider"></div>

        <p className="index-error-message">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="index-error-actions">
          <Link to="/" className="index-error-button-primary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
