import LoadingPage from '@components/LoadingPage';
import NavbarAdmin from '@components/NavbarAdmin';
import NavbarMain from '@components/NavbarMain';
import useAuthStore from '@store/authStore';
import { ChevronLeft, Menu } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';


export const RootLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, userData, checkAuthStatus } = useAuthStore();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isLoginPage = useMemo(() =>
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/loginadmin' ||
    location.pathname === '/registeradmin' ||
    location.pathname === '/registerusers' ||
    location.pathname === '/forgot-password-admin' ||
    location.pathname === '*' ||
    location.pathname === '/forgot-password',
    [location.pathname]
  );

  const shouldHideNavbar = useMemo(() =>
    isLoginPage || location.pathname === '/order-confirmation',
    [isLoginPage, location.pathname]
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsMobileNavOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;
    const initializeAuth = async () => {
      try {
        await checkAuthStatus();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    initializeAuth();
    return () => { mounted = false; };
  }, [checkAuthStatus]);

  useEffect(() => {
    if (!isLoading) {
      const isValid = checkAuthStatus();
      if (!isValid) {
        if (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin')) {
          navigate('/loginadmin');
        } else if (!isLoginPage) {
          navigate('/');
        }
      }
    }
  }, [isLoading, location.pathname, checkAuthStatus, navigate, isLoginPage]);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (shouldHideNavbar) {
    return (
      <div className="login-page">
        <Outlet />
      </div>
    );
  }

  return (
    <main>
      <Suspense fallback={ <LoadingPage /> }>
        { isAuthenticated && ['admin', 'manager', 'staff'].includes(userData?.role) ? (
          <AdminLayout />
        ) : (
          <>
            { location.pathname !== '*' && (
              <div className={ `navbar-container ${isMobileNavOpen ? 'open' : ''}` }>
                <NavbarMain />
              </div>
            ) }
            <div className={ `content-container ${isMobile && !isMobileNavOpen ? 'full-width' : ''}` }>
              <Outlet />
            </div>
          </>
        ) }
      </Suspense>
    </main>
  );
};

export const AdminLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, userData } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    if (!isAuthenticated || !userData || !['admin', 'manager', 'staff'].includes(userData.role)) {
      navigate('/loginadmin');
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [navigate, isAuthenticated, userData]);

  if (location.pathname === '/loginadmin' || location.pathname === '/registeradmin') {
    return <Outlet />;
  }

  return (
    <div className="admin-layout">
      { isMobile && (
        <button className="mobile-menu-button" onClick={ () => setMobileOpen(!mobileOpen) }>
          <Menu size={ 20 } />
        </button>
      ) }
      { !isMobile && (
        <button
          className={ `navbaradmin-toggle ${isCollapsed ? 'collapsed' : ''}` }
          onClick={ () => setIsCollapsed(!isCollapsed) }
        >
          <ChevronLeft size={ 18 } />
        </button>
      ) }
      <Suspense fallback={ <div>Loading Sidebar...</div> }>
        <NavbarAdmin
          isCollapsed={ isCollapsed }
          setIsCollapsed={ setIsCollapsed }
          mobileOpen={ mobileOpen }
          setMobileOpen={ setMobileOpen }
          isMobile={ isMobile }
        />
      </Suspense>
      { mobileOpen && isMobile && (
        <div className="navbaradmin-overlay" onClick={ () => setMobileOpen(false) } />
      ) }
      <div
        className="admin-content"
        style={ {
          paddingLeft: isMobile ? '0' : isCollapsed ? '80px' : '250px',
          marginLeft: isMobile && mobileOpen ? '250px' : '0',
          transition: 'all 0.3s ease',
        } }
      >
        <Outlet />
      </div>
    </div>
  );
};
