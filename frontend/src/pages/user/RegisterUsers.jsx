import useAuthStore from "@store/authStore";
import "@style/Register.css";
import { Coffee } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const RegisterUsers = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    username: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const { registerUser, registerWithGoogle, error, success, loading } = useAuthStore();

  

  // Display store error/success messages
  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: error,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Try Again',
      });
    } else if (success) {
      Swal.fire({
        icon: "success",
        title: "Welcome!",
        text: success,
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        navigate("/index");
      });
    }
  }, [error, success, navigate]);

  // Validate form inputs
  const validateForm = () => {
    const errors = {};
    if (!formData.fullname.trim()) errors.fullname = "Full name is required";
    else if (formData.fullname.length < 2) errors.fullname = "Full name must be at least 2 characters";
    if (!formData.email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Invalid email format";
    if (!formData.username.trim()) errors.username = "Username is required";
    else if (formData.username.length < 3) errors.username = "Username must be at least 3 characters";
    if (!formData.password) errors.password = "Password is required";
    else if (formData.password.length < 12 || !/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      errors.password = "Password must be at least 12 characters with uppercase, lowercase, and numbers";
    }
    return errors;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFormErrors({ ...formErrors, [name]: "" });
  };

  // Handle form-based registration
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const response = await registerUser(formData);
      if (response.success) {
        window.dispatchEvent(new Event('userLogin'));
      }
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  // Handle Google Sign-Up
  const handleGoogleSignUp = async () => {
    try {
      const response = await registerWithGoogle();
      if (response.success) {
        window.dispatchEvent(new Event('userLogin'));
      }
    } catch (error) {
      console.error("Google Sign-Up error:", error);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-content">
          <div className="register-left">
            <Coffee className="register-logo" aria-hidden="true" />
            <h1 className="register-title">Welcome to IslaDel Café ☕</h1>
            <p className="register-subtitle">Create your account to start ordering</p>
          </div>

          <div className="register-right">
            <form className="register-form" onSubmit={ handleFormSubmit }>
              <div className="register-form-group">
                <label htmlFor="fullname" className="register-label">Full Name</label>
                <input
                  id="fullname"
                  name="fullname"
                  type="text"
                  className={ `register-input ${formErrors.fullname ? 'error' : ''}` }
                  placeholder="Enter your full name"
                  value={ formData.fullname }
                  onChange={ handleInputChange }
                  disabled={ loading }
                />
                { formErrors.fullname && <span className="register-error">{ formErrors.fullname }</span> }
              </div>

              <div className="register-form-group">
                <label htmlFor="email" className="register-label">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={ `register-input ${formErrors.email ? 'error' : ''}` }
                  placeholder="Enter your email"
                  value={ formData.email }
                  onChange={ handleInputChange }
                  disabled={ loading }
                />
                { formErrors.email && <span className="register-error">{ formErrors.email }</span> }
              </div>

              <div className="register-form-group">
                <label htmlFor="username" className="register-label">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className={ `register-input ${formErrors.username ? 'error' : ''}` }
                  placeholder="Enter your username"
                  value={ formData.username }
                  onChange={ handleInputChange }
                  disabled={ loading }
                />
                { formErrors.username && <span className="register-error">{ formErrors.username }</span> }
              </div>

              <div className="register-form-group">
                <label htmlFor="password" className="register-label">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className={ `register-input ${formErrors.password ? 'error' : ''}` }
                  placeholder="Enter your password"
                  value={ formData.password }
                  onChange={ handleInputChange }
                  disabled={ loading }
                />
                { formErrors.password && <span className="register-error">{ formErrors.password }</span> }
              </div>

              <button type="submit" disabled={ loading } className="register-button">
                { loading ? "Creating Account..." : "Sign Up" }
              </button>
            </form>

            <div className="divider">
              <span>OR</span>
            </div>

            <button
              className="google-button"
              onClick={ handleGoogleSignUp }
              aria-label="Sign up with Google"
              disabled={ loading }
            >
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google Logo"
                className="google-icon"
              />
              Continue with Google
            </button>

            <p className="register-footer">
              Already have an account?{ " " }
              <NavLink to="/" className="register-link">
                Sign in
              </NavLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterUsers;
