import IsladelCafeLogo from '@assets/IslaDelCafeLogoText.png';
import {
  Close as CloseIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Person as PersonIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import useAuthStore from '@store/authStore';
import '@style/NavbarMain.css';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function NavbarMain() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, userData, logoutUser } = useAuthStore();

  const handleLogout = async () => {
    try {
      Swal.fire({
        title: 'Logout Confirmation',
        text: 'Are you sure you want to logout?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, logout',
      }).then(async (result) => {
        if (result.isConfirmed) {
          const logoutResult = await logoutUser();
          if (logoutResult.success) {
            navigate('/');
          }
        }
      });

    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavLinkClick = () => {
    if (menuOpen) setMenuOpen(false);
  };

  return (
    <header className={ `index-header ${isScrolled ? 'index-header-scrolled' : ''}` }>
      <NavLink to="/index" className="index-IslaDelCafe-Logo-title">
        <img src={ IsladelCafeLogo } alt="IsladelCafeLogo" />
        ISLADELCAFE
      </NavLink>

      <nav className={ `index-nav ${menuOpen ? 'index-nav-open' : 'index-nav-closed'}` }>
        <ul className="index-nav-list">
          { ['/index', '/menu', '/about', '/contact'].map((path, i) => (
            <li key={ i } className="index-nav-list-item">
              <NavLink
                to={ path }
                onClick={ handleNavLinkClick }
                className={ ({ isActive }) => (isActive ? 'active' : '') }
              >
                { path === '/index'
                  ? 'HOME'
                  : path === '/menu'
                    ? 'MENU'
                    : path === '/about'
                      ? 'ABOUT US'
                      : 'CONTACT US' }
              </NavLink>
            </li>
          )) }
        </ul>
      </nav>

      <div className="index-search-signin">
        { isAuthenticated && userData?.role === 'customer' ? (
          <div className="index-user-actions">
            <NavLink to="/cart" className="index-icon-button" title="Shopping Cart">
              <ShoppingCartIcon fontSize="small" />
            </NavLink>
            <NavLink to="/profile" className="index-icon-button" title="User Profile">
              <PersonIcon fontSize="small" />
            </NavLink>
            <button
              onClick={ handleLogout }
              className="index-icon-button"
              title="Logout"
              aria-label="Logout"
            >
              <LogoutIcon fontSize="small" />
            </button>
          </div>
        ) : (
          <NavLink to="/" className="index-icon-button index-signin-button" title="Sign In">
            SIGN IN
          </NavLink>
        ) }
      </div>

      <button
        className="index-mobile-menu-toggle"
        onClick={ () => setMenuOpen(!menuOpen) }
        aria-label={ menuOpen ? 'Close menu' : 'Open menu' }
      >
        { menuOpen ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" /> }
      </button>
    </header>
  );
}

export default NavbarMain;
