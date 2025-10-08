import {
  Coffee as CoffeeIcon,
  Feedback as FeedbackIcon,
  Home as HomeIcon,
  Inventory as InventoryIcon,
  Logout as LogoutIcon,
  MenuBook as MenuIcon,
  Person as PersonIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  ShoppingBag as ShoppingBagIcon,
  Menu as MenuIconMobile,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import useAuthStore from '@store/authStore';
import '@style/NavbarAdmin.css';
import { NavLink, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

// Define role-based permissions for navigation
const rolePermissions = {
  admin: [
    'dashboard',
    'products',
    'inventory',
    'orders',
    'order-history',
    'reports',
    'users',
    'feedback',
    'settings',
  ],
  manager: [
    'dashboard',
    'products',
    'inventory',
    'orders',
    'order-history',
    'reports',
    'users',
    'feedback',
    'settings',
  ],
  staff: ['dashboard', 'orders', 'order-history', 'settings'],
};

function NavbarAdmin({ isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen, isMobile }) {
  const navigate = useNavigate();
  const { logoutAdmin, userData } = useAuthStore();
  const userRole = userData?.role || 'staff';

  const handleLogout = () => {
    Swal.fire({
      title: 'Logout Confirmation',
      text: 'Are you sure you want to logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const logoutResult = await logoutAdmin();
        if (logoutResult.success) {
          navigate('/loginadmin');
        }
      }
    });
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleOverlayClick = () => {
    if (isMobile && mobileOpen) {
      setMobileOpen(false);
    }
  };

  const hasAccess = (section) => rolePermissions[userRole].includes(section);

  return (
    <>
      <nav
        className={`navbaradmin ${isCollapsed && !mobileOpen ? 'navbaradmin-collapsed' : ''} ${
          isMobile && mobileOpen ? 'navbaradmin-mobile-open' : ''
        }`}
        role="navigation"
        aria-label="Admin Navigation"
      >
        <div className="navbaradmin-brand">
          <div className="icon">
            <CoffeeIcon fontSize="small" />
          </div>
          <h2 className={isCollapsed && !mobileOpen ? 'hidden' : ''}>Isla Del Cafe</h2>
        </div>

        {!isMobile && (
          <button
            className={`navbaradmin-toggle ${isCollapsed ? 'collapsed' : ''}`}
            onClick={toggleSidebar}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <ChevronLeftIcon />
          </button>
        )}

        <div className="navbaradmin-menu">
          <ul>
            {/* Main Navigation */}
            <li className="nav-section-label">Main Navigation</li>
            {hasAccess('dashboard') && (
              <li data-tooltip="Dashboard">
                <NavLink
                  to="/dashboard"
                  className="navbaradmin-item"
                  onClick={() => isMobile && setMobileOpen(false)}
                  aria-label="Dashboard"
                >
                  <HomeIcon fontSize="small" />
                  <span className={`nav-label ${isCollapsed && !mobileOpen ? 'hidden' : ''}`}>
                    Dashboard
                  </span>
                </NavLink>
              </li>
            )}

            {/* Product & Inventory Management */}
            {(hasAccess('products') || hasAccess('inventory')) && (
              <li className="nav-section-label">Product & Inventory Management</li>
            )}
            {hasAccess('products') && (
              <li data-tooltip="Products">
                <NavLink
                  to="/products"
                  className="navbaradmin-item"
                  onClick={() => isMobile && setMobileOpen(false)}
                  aria-label="Products"
                >
                  <MenuIcon fontSize="small" />
                  <span className={`nav-label ${isCollapsed && !mobileOpen ? 'hidden' : ''}`}>
                    Products
                  </span>
                </NavLink>
              </li>
            )}
            {hasAccess('inventory') && (
              <li data-tooltip="Inventory">
                <NavLink
                  to="/inventory"
                  className="navbaradmin-item"
                  onClick={() => isMobile && setMobileOpen(false)}
                  aria-label="Inventory"
                >
                  <InventoryIcon fontSize="small" />
                  <span className={`nav-label ${isCollapsed && !mobileOpen ? 'hidden' : ''}`}>
                    Inventory
                  </span>
                </NavLink>
              </li>
            )}

            {/* Order Management */}
            {(hasAccess('orders') || hasAccess('order-history')) && (
              <li className="nav-section-label">Order Management</li>
            )}
            {hasAccess('orders') && (
              <li data-tooltip="Orders">
                <NavLink
                  to="/orders"
                  className="navbaradmin-item"
                  onClick={() => isMobile && setMobileOpen(false)}
                  aria-label="Orders"
                >
                  <ShoppingBagIcon fontSize="small" />
                  <span className={`nav-label ${isCollapsed && !mobileOpen ? 'hidden' : ''}`}>
                    Orders
                  </span>
                </NavLink>
              </li>
            )}
            {hasAccess('order-history') && (
              <li data-tooltip="Order History">
                <NavLink
                  to="/order-history"
                  className="navbaradmin-item"
                  onClick={() => isMobile && setMobileOpen(false)}
                  aria-label="Order History"
                >
                  <ShoppingBagIcon fontSize="small" />
                  <span className={`nav-label ${isCollapsed && !mobileOpen ? 'hidden' : ''}`}>
                    Order History
                  </span>
                </NavLink>
              </li>
            )}

            {/* Reports & Analytics */}
            {hasAccess('reports') && (
              <>
                <li className="nav-section-label">Reports</li>
                <li data-tooltip="Sales Reports">
                  <NavLink
                    to="/reports"
                    className="navbaradmin-item"
                    onClick={() => isMobile && setMobileOpen(false)}
                    aria-label="Sales Reports"
                  >
                    <ReportsIcon fontSize="small" />
                    <span className={`nav-label ${isCollapsed && !mobileOpen ? 'hidden' : ''}`}>
                      Sales Reports
                    </span>
                  </NavLink>
                </li>
              </>
            )}

            {/* User Management */}
            {(hasAccess('users') || hasAccess('feedback')) && (
              <li className="nav-section-label">User Management</li>
            )}
            {hasAccess('users') && (
              <li data-tooltip="Users">
                <NavLink
                  to="/users"
                  className="navbaradmin-item"
                  onClick={() => isMobile && setMobileOpen(false)}
                  aria-label="Users"
                >
                  <PersonIcon fontSize="small" />
                  <span className={`nav-label ${isCollapsed && !mobileOpen ? 'hidden' : ''}`}>
                    Users
                  </span>
                </NavLink>
              </li>
            )}
            {hasAccess('feedback') && (
              <li data-tooltip="Feedback">
                <NavLink
                  to="/feedback"
                  className="navbaradmin-item"
                  onClick={() => isMobile && setMobileOpen(false)}
                  aria-label="Feedback"
                >
                  <FeedbackIcon fontSize="small" />
                  <span className={`nav-label ${isCollapsed && !mobileOpen ? 'hidden' : ''}`}>
                    Feedback
                  </span>
                </NavLink>
              </li>
            )}

            {/* System Settings */}
            {hasAccess('settings') && (
              <>
                <li className="nav-section-label">System</li>
                <li data-tooltip="Settings">
                  <NavLink
                    to="/settings"
                    className="navbaradmin-item"
                    onClick={() => isMobile && setMobileOpen(false)}
                    aria-label="Settings"
                  >
                    <SettingsIcon fontSize="small" />
                    <span className={`nav-label ${isCollapsed && !mobileOpen ? 'hidden' : ''}`}>
                      Settings
                    </span>
                  </NavLink>
                </li>
              </>
            )}

            {/* Logout */}
            <li data-tooltip="Logout">
              <button
                onClick={handleLogout}
                className="navbaradmin-item logoutBtn"
                aria-label="Logout"
              >
                <LogoutIcon fontSize="small" />
                <span className={`nav-label ${isCollapsed && !mobileOpen ? 'hidden' : ''}`}>
                  Logout
                </span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {isMobile && (
        <>
          <button
            className={`mobile-menu-button ${mobileOpen ? 'hidden' : ''}`}
            onClick={() => setMobileOpen(true)}
            aria-label="Open Mobile Menu"
          >
            <MenuIconMobile />
          </button>
          <div
            className={`navbaradmin-overlay ${mobileOpen ? 'navbaradmin-mobile-open' : ''}`}
            onClick={handleOverlayClick}
            aria-hidden="true"
          ></div>
        </>
      )}
    </>
  );
}

export default NavbarAdmin;
