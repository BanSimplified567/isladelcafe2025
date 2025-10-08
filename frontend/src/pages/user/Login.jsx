import IslaDelCafe from '@assets/IslaDelCafeBackground.jpg';
import GoogleIcon from '@mui/icons-material/Google';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import useAuthStore from "@store/authStore";
import '@style/Login.css';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const { loginUser, loginWithGoogle, error, success, loading } = useAuthStore();
  const navigate = useNavigate();

  // Load remembered credentials
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberedPassword = localStorage.getItem('rememberedPassword');
    if (rememberedEmail && rememberedPassword) {
      setEmail(rememberedEmail);
      setPassword(rememberedPassword);
      setRememberMe(true);
    }
  }, []);

  // Display store error/success messages
  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: error,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Try Again',
      });
    } else if (success) {
      Swal.fire({
        icon: 'success',
        title: 'Login Successful',
        text: success,
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        navigate('/index');
      });
    }
  }, [error, success, navigate]);

  // Validate input
  const validateForm = useCallback(() => {
    const errors = {};
    if (!email) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email format';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password = 'Password must be at least 12 characters with uppercase, lowercase, and numbers';
    }
    return errors;
  }, [email, password]);

  // Handle email/password login
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      const response = await loginUser(email, password, rememberMe);
      if (response.success) {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedPassword', password);
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
        }
        window.dispatchEvent(new Event('userLogin'));
      }
  } catch (error) {
    console.error('Login error:', error);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      const response = await loginWithGoogle();
      if (response.success) {
        window.dispatchEvent(new Event('userLogin'));
      }
    } catch (error) {
      console.error('Google login error:', error);
    }
  };



  return (
    <div className="loginAdminContainer">
      <div className="loginImageContainer">
        <img className="loginIsladelCafe" src={ IslaDelCafe } alt="IslaDelCafe" />
      </div>

      <div className="loginAdminCard">
        <div className="loginAdminHeader">
          <h1 className="loginAdminTitle">Isla del Cafe</h1>
          <p className="loginAdminSubtitle">Sign in to your account</p>
        </div>

        <form className="loginAdminForm" onSubmit={ handleSubmit }>
          <div className="loginAdminFormGroup">
            <label htmlFor="email" className="loginAdminLabel">Email</label>
            <input
              id="email"
              type="email"
              required
              className={ `loginAdminInput ${formErrors.email ? 'error' : ''}` }
              placeholder="Enter your email"
              value={ email }
              onChange={ (e) => setEmail(e.target.value) }
              disabled={ loading }
            />
            { formErrors.email && <span className="loginAdminError">{ formErrors.email }</span> }
          </div>

          <div className="loginAdminFormGroup">
            <label htmlFor="password" className="loginAdminLabel">Password</label>
            <div className="loginAdminPasswordWrapper">
              <input
                id="password"
                type={ showPassword ? 'text' : 'password' }
                required
                className={ `loginAdminInput ${formErrors.password ? 'error' : ''}` }
                placeholder="Enter your password"
                value={ password }
                onChange={ (e) => setPassword(e.target.value) }
                disabled={ loading }
              />
              <button
                type="button"
                className="loginAdminPasswordToggle"
                onClick={ togglePasswordVisibility }
                aria-label={ showPassword ? 'Hide password' : 'Show password' }
                disabled={ loading }
              >
                { showPassword ? <VisibilityOff /> : <Visibility /> }
              </button>
            </div>
            { formErrors.password && <span className="loginAdminError">{ formErrors.password }</span> }
          </div>

          <div className="loginAdminOptions">
            <div className="loginAdminRemember">
              <input
                id="remember-me"
                type="checkbox"
                className="loginAdminCheckbox"
                checked={ rememberMe }
                onChange={ (e) => setRememberMe(e.target.checked) }
                disabled={ loading }
              />
              <label htmlFor="remember-me" className="loginAdminCheckboxLabel">Remember me</label>
            </div>
            <div className="loginAdminForgot">
              <button
                type="button"
                onClick={ () => navigate('/forgot-password') }
                className="loginAdminLink"
                disabled={ loading }
              >
                Forgot your password?
              </button>
            </div>
          </div>

          <button type="submit" disabled={ loading } className="loginAdminButton">
            { loading ? (
              <div className="loginAdminButtonLoading">
                <div className="loginAdminSpinner"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign In'
            ) }
          </button>
        </form>

        <div className="loginGoogleContainer">
          <p className="orText">or</p>
          <button
            type="button"
            onClick={ handleGoogleLogin }
            className="loginGoogleButton"
            disabled={ loading }
          >
            <GoogleIcon style={ { marginRight: '8px' } } />
            Sign in with Google
          </button>
        </div>

        <div className="loginAdminFooter">
          <button
            type="button"
            onClick={ () => navigate('/registerusers') }
            className="loginAdminLink"
            disabled={ loading }
          >
            Don't have an account? Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
