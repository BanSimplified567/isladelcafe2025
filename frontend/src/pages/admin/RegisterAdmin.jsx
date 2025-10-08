import useAuthStore from '@store/authStore';
import '@style/Register.css';
import axios from 'axios';
import { EyeIcon, EyeOffIcon, MailOpen, Shield, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const RegisterAdmin = () => {
  const navigate = useNavigate();
  const { registerAdmin, loading, success, clearMessages } = useAuthStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    username: '',
    password: '',
    confirm_password: '',
    role: 'admin',
    security_questions: Array.from({ length: 5 }, (_, index) => ({
      question_id: index + 1,
      question: '',
      answer: '',
    })),
  });

  const [localError, setLocalError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const fetchSecurityQuestions = async () => {
      try {
        const response = await axios.get('/api/core.php?action=get_questions');
        if (response.data && Array.isArray(response.data)) {
          setFormData((prev) => ({
            ...prev,
            security_questions: prev.security_questions.map((q, index) => ({
              ...q,
              question:
                response.data[index]?.question || `Security Question ${index + 1}`,
            })),
          }));
        } else {
          setLocalError('No security questions available');
        }
      } catch (error) {
        console.error('Error fetching security questions:', error);
        setLocalError('Failed to load security questions');
      }
    };

    fetchSecurityQuestions();
    return () => clearMessages();
  }, [clearMessages]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSecurityAnswerChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      security_questions: prev.security_questions.map((question, i) =>
        i === index ? { ...question, answer: value } : question
      ),
    }));
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password) =>
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password);

  const validateFirstStep = () => {
    const errors = [];
    if (!formData.fullname) errors.push('Full Name');
    if (!formData.email) errors.push('Email');
    if (!validateEmail(formData.email)) errors.push('Valid Email');
    if (!formData.username) errors.push('Username');
    if (!['admin', 'staff', 'manager'].includes(formData.role))
      errors.push('Valid Role');
    if (formData.security_questions.some((q) => !q.answer))
      errors.push('All Security Answers');
    return errors.length > 0 ? `Please provide: ${errors.join(', ')}` : null;
  };

  const handleFirstStepSubmit = (e) => {
    e.preventDefault();
    const error = validateFirstStep();
    if (error) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: error,
      });
      return;
    }
    setLocalError(null);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      setLocalError('Passwords do not match');
      return;
    }
    if (!validatePassword(formData.password)) {
      setLocalError(
        'Password must be at least 8 characters long with uppercase, lowercase, and numbers'
      );
      return;
    }
    setLocalError(null);

    const registerData = {
      fullname: formData.fullname,
      email: formData.email,
      username: formData.username,
      password: formData.password,
      role: formData.role,
      ...formData.security_questions.reduce(
        (acc, q, i) => ({
          ...acc,
          [`security_id_${i + 1}`]: q.question_id,
          [`answer_${i + 1}`]: q.answer,
        }),
        {}
      ),
    };

    try {
      const response = await registerAdmin(registerData);
      if (response?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Registration Successful',
          text: 'Your account has been created!',
          timer: 1500,
          showConfirmButton: false,
        });
        setTimeout(() => navigate('/loginadmin'), 1600);
      } else {
        if (
          response?.message ===
          'Account already exists with this username or email'
        ) {
          setLocalError(null);
          Swal.fire({
            icon: 'error',
            title: 'Account Already Exists',
            text: 'An account with this username or email already exists. Please use different credentials.',
          });
        } else {
          setLocalError(
            response?.message || 'Registration failed. Please try again.'
          );
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const isFirstStepValid = () =>
    formData.fullname &&
    formData.email &&
    validateEmail(formData.email) &&
    formData.username &&
    ['admin', 'staff', 'manager'].includes(formData.role) &&
    formData.security_questions.every((q) => q.answer);

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-container-information-user">
          { step === 1 ? (
            <>
              <div className="register-left">
                <div className="register-header">
                  <UserRound className="register-logo" />
                  <h1 className="register-title">Admin Registration</h1>
                  <p className="register-subtitle">
                    Create a new admin or staff account
                  </p>
                </div>
              </div>
              <div className="register-right">
                <form
                  onSubmit={ handleFirstStepSubmit }
                  className="register-form"
                >
                  <div className="register-row">
                    <div className="register-col">
                      <div className="form-outline">
                        <div className="input-wrapper">
                          <UserRound className="input-icon" />
                          <input
                            id="fullname"
                            name="fullname"
                            placeholder=" "
                            type="text"
                            className="form-control"
                            value={ formData.fullname }
                            onChange={ handleChange }
                            aria-label="Full Name"
                          />
                          <label className="form-label" htmlFor="fullname">
                            Full Name
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="register-col">
                      <div className="form-outline">
                        <div className="input-wrapper">
                          <MailOpen className="input-icon" />
                          <input
                            id="email"
                            name="email"
                            placeholder=" "
                            type="email"
                            className="form-control"
                            value={ formData.email }
                            onChange={ handleChange }
                            aria-label="Email Address"
                          />
                          <label className="form-label" htmlFor="email">
                            Email Address
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="register-row">
                    <div className="register-col">
                      <div className="form-outline">
                        <div className="input-wrapper">
                          <UserRound className="input-icon" />
                          <input
                            id="username"
                            name="username"
                            placeholder=" "
                            type="text"
                            className="form-control"
                            value={ formData.username }
                            onChange={ handleChange }
                            aria-label="Username"
                          />
                          <label className="form-label" htmlFor="username">
                            Username
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="register-col">
                      <div className="form-outline">
                        <select
                          id="role"
                          name="role"
                          className="form-control"
                          value={ formData.role }
                          onChange={ handleChange }
                          aria-label="Select Role"
                        >
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                          <option value="manager">Manager</option>
                        </select>
                        <label className="form-label" htmlFor="role">
                          Role
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="security-questions">
                    <h3 className="security-title">Security Questions</h3>
                    { formData.security_questions.map((question, index) => (
                      <div key={ index } className="security-question-group">
                        <div className="register-row">
                          <div className="register-col">
                            <div className="form-outline">
                              <label className="form-labelquestions">
                                Question { index + 1 }
                              </label>
                              <p className="security-question-text">
                                { question.question }
                              </p>
                            </div>
                          </div>
                          <div className="register-col">
                            <div className="form-outline">
                              <input
                                id={ `security_answer_${index}` }
                                type="text"
                                className="form-control"
                                placeholder=" "
                                value={ question.answer }
                                onChange={ (e) =>
                                  handleSecurityAnswerChange(
                                    index,
                                    e.target.value
                                  )
                                }
                                aria-label={ `Answer for question ${index + 1}` }
                              />
                              <label
                                className="form-label"
                                htmlFor={ `security_answer_${index}` }
                              >
                                Answer
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )) }
                  </div>

                  { localError && (
                    <div className="error-message">{ localError }</div>
                  ) }
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={ !isFirstStepValid() }
                    aria-label="Proceed to password setup"
                  >
                    Next
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              {/* STEP 2 - PASSWORD SETUP */ }
              <div className="register-header">
                <Shield className="register-logo" />
                <h2 className="register-title">Set Your Password</h2>
                <p className="register-subtitle">Create a secure password</p>
              </div>
              <div className="selected-questions-review">
                <h3>Selected Security Questions</h3>
                <ol>
                  { formData.security_questions.map((question, index) => (
                    <li key={ index }>
                      { question.question }: { question.answer }
                    </li>
                  )) }
                </ol>
              </div>
              <form onSubmit={ handleSubmit } className="register-form">
                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="input-wrapper">
                    <Shield className="input-icon" />
                    <input
                      id="password"
                      name="password"
                      type={ showPassword ? 'text' : 'password' }
                      className="form-control"
                      placeholder="Enter your password"
                      value={ formData.password }
                      onChange={ handleChange }
                      aria-label="Password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={ () => setShowPassword(!showPassword) }
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      { showPassword ? (
                        <EyeOffIcon className="toggle-icon" />
                      ) : (
                        <EyeIcon className="toggle-icon" />
                      ) }
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="confirm_password" className="form-label">
                    Confirm Password
                  </label>
                  <div className="input-wrapper">
                    <Shield className="input-icon" />
                    <input
                      id="confirm_password"
                      name="confirm_password"
                      type={ showConfirmPassword ? 'text' : 'password' }
                      className="form-control"
                      placeholder="Confirm your password"
                      value={ formData.confirm_password }
                      onChange={ handleChange }
                      aria-label="Confirm Password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={ () =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                    >
                      { showConfirmPassword ? (
                        <EyeOffIcon className="toggle-icon" />
                      ) : (
                        <EyeIcon className="toggle-icon" />
                      ) }
                    </button>
                  </div>
                </div>
                { localError && (
                  <div className="error-message">{ localError }</div>
                ) }
                { success && (
                  <div className="success-message">{ success }</div>
                ) }
                <div className="button-group">
                  <button
                    type="button"
                    onClick={ () => {
                      setStep(1);
                      setFormData((prev) => ({
                        ...prev,
                        password: '',
                        confirm_password: '',
                      }));
                    } }
                    className="back-button"
                    aria-label="Go back to personal information"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !formData.password ||
                      !formData.confirm_password
                    }
                    className={ `submit-button ${loading ? 'disabled' : ''}` }
                    aria-label="Create Account"
                  >
                    { loading ? (
                      <svg
                        className="spinner"
                        viewBox="0 0 24 24"
                        aria-label="Loading"
                      >
                        <circle
                          className="spinner-circle"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="spinner-path"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      'Create Account'
                    ) }
                  </button>
                </div>
              </form>
            </>
          ) }
        </div>
        <div className="register-footer">
          Already have an account?{ " " }
          <NavLink to="/loginadmin" className="register-link">
            Sign in
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default RegisterAdmin;
