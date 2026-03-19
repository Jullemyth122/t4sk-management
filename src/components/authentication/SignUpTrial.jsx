import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth';
import gsap from 'gsap';
import '../../scss/signup2.scss';
import SignupSkeleton from '../loaders/SignupSkeleton';

const Signup = ({ simulateLoading = false }) => {
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const {
    handleSignup,
    handleLogin,
    handleGoogleLogin,
    handleFacebookLogin,
    handleResetPassword,
    username, email, password,
    setUsername, setEmail, setPassword,
    errorMessage, setErrorMessage,
    successMessage, setSuccessMessage
  } = useAuth()

  const [loading, setLoading] = useState(Boolean(simulateLoading));
  const [emailForReset, setEmailForReset] = useState("");
  const containerRef = useRef(null);
  const [activeView, setActiveView] = useState("SignIn");

  useEffect(() => {
    if (!simulateLoading) return;
    const t = setTimeout(() => setLoading(false), 2750);
    return () => clearTimeout(t);
  }, [simulateLoading]);

  useLayoutEffect(() => {
    if (loading) return;
    const node = containerRef.current;
    if (!node) return;

    let items = node.querySelectorAll(".label-inputs");

    if (!items || items.length === 0) {
      const raf = requestAnimationFrame(() => {
        items = node.querySelectorAll(".label-inputs");
        items.forEach((item, idx) => gsap.set(item, { xPercent: idx * 100 }));
      });
      return () => cancelAnimationFrame(raf);
    }

    // SignIn is default view (index 1), so offset all panels accordingly
    items.forEach((item, idx) => gsap.set(item, { xPercent: (idx - 1) * 100 }));

    return () => {
      items.forEach((item) => gsap.set(item, { xPercent: 0 }));
    };
  }, [loading]);

  const toggleView = (view) => {
    let activeIndex = view === "SignIn" ? 1 : view === "Forget" ? 2 : 0;
    const node = containerRef.current;
    if (!node) {
      setActiveView(view);
      return;
    }
    const items = node.querySelectorAll(".label-inputs");
    items.forEach((item, index) => {
      gsap.to(item, { xPercent: (index - activeIndex) * 100, duration: 0.45, ease: "power2.out" });
    });
    setActiveView(view);
  };

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(t);
  }, [successMessage, setSuccessMessage]);

  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(""), 3000);
    return () => clearTimeout(t);
  }, [errorMessage, setErrorMessage]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (!username.trim()) { setErrorMessage("Username is required"); return; }
    if (!email.trim()) { setErrorMessage("Email is required"); return; }
    if (password.length < 6) { setErrorMessage("Password must be at least 6 characters"); return; }
    if (!acceptedTerms) { setErrorMessage("Please accept the Terms of Service and Privacy Policy"); return; }
    await handleSignup(e, acceptedTerms);
  };

  const handleLoggingIn = async (e) => { await handleLogin(e); };
  const handleLogginGoogle = async (e) => { await handleGoogleLogin(e); };
  const handleLogginFacebook = async (e) => { navigate('/dashboard'); };

  if (loading) return <SignupSkeleton />;

  return (
    <div className='signup-comp'>
      <div className='signup-in-comp'>

        {/* ── LEFT SIDE ── */}
        <div className="ld-ctn">
          <div className="ld-content">

            <div className="ld-label">TASK MANAGEMENT SYSTEM</div>

            <h1 className="ld-headline">
              <span className="line-1">T 4 S K</span>
              <span className="line-2">FUTURE of</span>
              <span className="line-3">WORK</span>
            </h1>

            <p className="ld-sub">
              Orchestrate every mission. Track every deadline.<br />
              Execute with precision.
            </p>

            <div className="task-cards">
              <div className="task-card card-1">
                <div className="task-priority high" />
                <div className="task-info">
                  <span className="task-tag">SPRINT 04</span>
                  <span className="task-name">Deploy Auth Module</span>
                </div>
                <div className="task-status">IN PROGRESS</div>
              </div>
              <div className="task-card card-2">
                <div className="task-priority med" />
                <div className="task-info">
                  <span className="task-tag">DESIGN</span>
                  <span className="task-name">Dashboard Wireframes</span>
                </div>
                <div className="task-status done">COMPLETE</div>
              </div>
              <div className="task-card card-3">
                <div className="task-priority low" />
                <div className="task-info">
                  <span className="task-tag">RESEARCH</span>
                  <span className="task-name">AI Integration Plan</span>
                </div>
                <div className="task-status">QUEUED</div>
              </div>
            </div>

            <div className="ld-stats">
              <div className="stat">
                <span className="stat-num">90<span>%</span></span>
                <span className="stat-label">On-time delivery</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-num">100<span>+</span></span>
                <span className="stat-label">Tasks completed</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-num">1.75x</span>
                <span className="stat-label">Faster execution</span>
              </div>
            </div>

          </div>

          <div className="deco-lines">
            <div className="deco-line dl-1" />
            <div className="deco-line dl-2" />
            <div className="deco-corner" />
          </div>
        </div>

        {/* ── RIGHT SIDE ── */}
        <div className="rd-ctn">
          <div className="rd-grid" />
          <div className="rd-inner" ref={containerRef}>

            <div className="rd-header">
              <div className="rd-logo">
                T<span className="logo-accent">4</span>SK
              </div>
              <p className="rd-tagline">Task Intelligence Platform</p>
            </div>

            <div className="auth-tabs">
              <button
                className={`auth-tab ${activeView === 'SignUp' ? 'active' : ''}`}
                onClick={() => toggleView('SignUp')}
              >Sign Up</button>
              <button
                className={`auth-tab ${activeView === 'SignIn' ? 'active' : ''}`}
                onClick={() => toggleView('SignIn')}
              >Sign In</button>
            </div>

            <div className="panels-wrapper">

              {/* SignUp Panel */}
              <div className="label-inputs">
                <div className="glass-card">
                  {errorMessage && <div className="auth-error">{errorMessage}</div>}
                  {successMessage && <div className="auth-success">{successMessage}</div>}

                  <div className="field-group">
                    <label>Username</label>
                    <input
                      type="text"
                      placeholder="your_handle"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="you@domain.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label>Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>

                  <label className="terms-row">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                    />
                    <span>I agree to the <Link to="/terms">Terms</Link> &amp; <Link to="/privacy">Privacy Policy</Link></span>
                  </label>

                  <button className="auth-btn primary" onClick={handleRegister}>
                    Create Account
                  </button>

                  <div className="auth-divider"><span>or continue with</span></div>

                  <div className="social-row">
                    <button className="social-btn" onClick={handleLogginGoogle}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Google
                    </button>
                    <button className="social-btn" onClick={handleLogginFacebook}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub
                    </button>
                  </div>

                  <p className="auth-switch">
                    Already have an account?{' '}
                    <button onClick={() => toggleView('SignIn')}>Sign In</button>
                  </p>
                </div>
              </div>

              {/* SignIn Panel */}
              <div className="label-inputs">
                <div className="glass-card">
                  {errorMessage && <div className="auth-error">{errorMessage}</div>}

                  <div className="field-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="you@domain.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label>Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>

                  <button className="forgot-link" onClick={() => toggleView('Forget')}>
                    Forgot password?
                  </button>

                  <button className="auth-btn primary" onClick={handleLoggingIn}>
                    Sign In
                  </button>

                  <div className="auth-divider"><span>or continue with</span></div>

                  <div className="social-row">
                    <button className="social-btn" onClick={handleLogginGoogle}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Google
                    </button>
                    <button className="social-btn" onClick={handleLogginFacebook}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub
                    </button>
                  </div>

                  <p className="auth-switch">
                    No account yet?{' '}
                    <button onClick={() => toggleView('SignUp')}>Sign Up</button>
                  </p>
                </div>
              </div>

              {/* Forget Panel */}
              <div className="label-inputs">
                <div className="glass-card">
                  <button className="back-btn" onClick={() => toggleView('SignIn')}>← Back</button>
                  <h3 className="forget-title">Reset Password</h3>
                  <p className="forget-desc">Enter your email and we'll send you a reset link.</p>

                  <div className="field-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="you@domain.com"
                      value={emailForReset}
                      onChange={e => setEmailForReset(e.target.value)}
                    />
                  </div>

                  <button
                    className="auth-btn primary"
                    onClick={() => handleResetPassword(emailForReset)}
                  >
                    Send Reset Link
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Signup