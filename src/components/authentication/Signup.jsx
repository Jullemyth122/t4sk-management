import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useReduxAuth } from '../../context/ReduxAuthContext';
import gsap from 'gsap';
import '../../scss/signup.scss';
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
    username,email,password,
    setUsername,setEmail,setPassword,
    errorMessage, setErrorMessage,
    successMessage, setSuccessMessage
  } = useReduxAuth()
  
  // ----- Declare ALL hooks up front (important) -----
  const [loading, setLoading] = useState(Boolean(simulateLoading));
  const [emailForReset, setEmailForReset] = useState("");
  const containerRef = useRef(null);
  const [activeView, setActiveView] = useState("SignUp");

  // simulate loading (demo)
  useEffect(() => {
    if (!simulateLoading) return;
    const t = setTimeout(() => setLoading(false), 2750);
    return () => clearTimeout(t);
  }, [simulateLoading]);

  // layout: set panels positions AFTER real DOM mounts (runs when loading changes)
  useLayoutEffect(() => {
    // if still loading, don't try to position the panels yet
    if (loading) return;

    const node = containerRef.current;
    if (!node) return;

    let items = node.querySelectorAll(".label-inputs");

    // If they're not present yet, try once on next frame
    if (!items || items.length === 0) {
      const raf = requestAnimationFrame(() => {
        items = node.querySelectorAll(".label-inputs");
        items.forEach((item, idx) => gsap.set(item, { xPercent: idx * 100 }));
      });
      return () => cancelAnimationFrame(raf);
    }

    // generic: position panels side-by-side (0, 100, 200, ...)
    items.forEach((item, idx) => gsap.set(item, { xPercent: idx * 100 }));

    return () => {
      // cleanup: reset transforms
      items.forEach((item) => gsap.set(item, { xPercent: 0 }));
    };
  }, [loading]); // re-run when loading flips to false

  // use toggleView to animate to the requested view
  const toggleView = (view) => {
    let activeIndex = view === "SignIn" ? 1 : view === "Forget" ? 2 : 0;
    const node = containerRef.current;
    if (!node) {
      setActiveView(view); // still set the state even if node missing
      return;
    }
    const items = node.querySelectorAll(".label-inputs");
    items.forEach((item, index) => {
      gsap.to(item, { xPercent: (index - activeIndex) * 100, duration: 0.45, ease: "power2.out" });
    });
    setActiveView(view);
  };

  // autopurge messages
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

  // handlers
  const handleRegister = async (e) => {
    e.preventDefault();

    // Clear previous messages
    setErrorMessage("");
    setSuccessMessage("");

    // === CLIENT-SIDE VALIDATION ===
    if (!username.trim()) {
      setErrorMessage("Username is required");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Email is required");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage("Please accept the Terms of Service and Privacy Policy");
      return;
    }

    await handleSignup(e, acceptedTerms);
  };

  const handleLoggingIn = async (e) => { await handleLogin(e); };
  const handleLogginGoogle = async (e) => { await handleGoogleLogin(e); };
  const handleLogginFacebook = async (e) => { navigate('/dashboard'); };

  // ---------- render skeleton while loading, but AFTER hooks are declared ----------
  if (loading) return <SignupSkeleton/>;

  return (
    <div className='signup-comp flex items-center justify-center relative'>
      <div className="signup-in-comp flex items-center justify-center relative">
        <div className="sign-out-comp flex items-center justify-evenly">
          <div className="int_comp relative">
            <h1 className=' text-4xl xl:text-6xl my-10'> Welcome </h1>
            <h1 className=' text-4xl xl:text-6xl my-10'> To </h1>
            <h1 className=' text-4xl xl:text-6xl my-10'> T <span className='highlight'> 4 </span>  S K </h1>
            <h1 className=' text-4xl xl:text-6xl my-10'> W e b s i t e </h1>
            <div className="line"></div>
            <h1 className='sct-l'> We create a platform that will help manage <br/> your time and task &gt;&gt; work &gt;&gt; company. </h1>
            <p className='sct-l'> 
                © 2024 T 4 S K Site. All rights reserved.
            </p>
          </div>
          <div className="line"></div>
          <div className="si_comp">
            <div className='form-sign-up'>
              <div className="form-header">
                <h1 className='signUpButton activehigh' onClick={e => toggleView("SignUp")}> Sign up </h1>
                { 
                  activeView === "SignIn" ? 
                  <svg width="25" height="29" viewBox="0 0 25 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.89812 0.532227L0.140625 2.33223L12.3656 14.5572L0.140625 26.7822L1.89812 28.5822L15.0231 15.4572L15.9206 14.5572L15.0231 13.6572L1.89812 0.532227ZM10.6481 0.532227L8.88937 2.33223L21.1181 14.5572L8.89062 26.7822L10.6481 28.5822L23.7731 15.4572L24.6706 14.5572L23.7731 13.6572L10.6481 0.532227Z" fill="#4D89E2"/>
                  </svg>
                  :
                  <svg width="22" height="25" viewBox="0 0 22 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.7454 23.7368C12.5582 23.9246 12.304 24.0302 12.0388 24.0306C11.7737 24.031 11.5192 23.926 11.3314 23.7388L0.363434 12.8088C0.260634 12.7066 0.179055 12.5851 0.123387 12.4512C0.06772 12.3173 0.0390625 12.1738 0.0390625 12.0288C0.0390625 11.8839 0.06772 11.7403 0.123387 11.6065C0.179055 11.4726 0.260634 11.3511 0.363434 11.2488L11.3314 0.320831C11.4238 0.22546 11.5343 0.149443 11.6563 0.0972138C11.7784 0.0449846 11.9097 0.01759 12.0425 0.0166278C12.1752 0.0156657 12.3069 0.0411554 12.4297 0.09161C12.5525 0.142065 12.664 0.216473 12.7578 0.310495C12.8516 0.404517 12.9257 0.51627 12.9758 0.639232C13.0259 0.762194 13.051 0.893903 13.0496 1.02668C13.0483 1.15945 13.0205 1.29063 12.968 1.41255C12.9154 1.53448 12.8391 1.64472 12.7434 1.73683L2.41543 12.0288L12.7434 22.3228C12.9312 22.5101 13.0368 22.7643 13.0372 23.0294C13.0376 23.2946 12.9326 23.549 12.7454 23.7368ZM20.7454 23.7368C20.6527 23.8301 20.5424 23.9041 20.421 23.9547C20.2996 24.0053 20.1694 24.0314 20.0378 24.0316C19.9063 24.0318 19.776 24.006 19.6545 23.9558C19.5329 23.9056 19.4225 23.8318 19.3294 23.7388L8.36143 12.8088C8.25863 12.7066 8.17705 12.5851 8.12139 12.4512C8.06572 12.3173 8.03706 12.1738 8.03706 12.0288C8.03706 11.8839 8.06572 11.7403 8.12139 11.6065C8.17705 11.4726 8.25863 11.3511 8.36143 11.2488L19.3294 0.320831C19.4218 0.22546 19.5323 0.149443 19.6543 0.0972138C19.7764 0.0449846 19.9077 0.01759 20.0404 0.0166278C20.1732 0.0156657 20.3049 0.0411554 20.4277 0.09161C20.5505 0.142065 20.662 0.216473 20.7558 0.310495C20.8496 0.404517 20.9237 0.51627 20.9738 0.639232C21.0239 0.762194 21.049 0.893903 21.0476 1.02668C21.0463 1.15945 21.0185 1.29063 20.966 1.41255C20.9134 1.53448 20.8371 1.64472 20.7414 1.73683L10.4134 12.0288L20.7414 22.3228C20.9292 22.5101 21.0348 22.7643 21.0352 23.0294C21.0356 23.2946 20.9326 23.549 20.7454 23.7368Z" fill="#4D89E2"/>
                  </svg>                                   
                }
                <h1 className='signInButton' onClick={e => toggleView("SignIn")}> Sign in </h1>
                { 
                  activeView === "Forget" ? 
                  <svg width="25" height="29" viewBox="0 0 25 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.89812 0.532227L0.140625 2.33223L12.3656 14.5572L0.140625 26.7822L1.89812 28.5822L15.0231 15.4572L15.9206 14.5572L15.0231 13.6572L1.89812 0.532227ZM10.6481 0.532227L8.88937 2.33223L21.1181 14.5572L8.89062 26.7822L10.6481 28.5822L23.7731 15.4572L24.6706 14.5572L23.7731 13.6572L10.6481 0.532227Z" fill="#4D89E2"/>
                  </svg>
                  :
                  <svg width="22" height="25" viewBox="0 0 22 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.7454 23.7368C12.5582 23.9246 12.304 24.0302 12.0388 24.0306C11.7737 24.031 11.5192 23.926 11.3314 23.7388L0.363434 12.8088C0.260634 12.7066 0.179055 12.5851 0.123387 12.4512C0.06772 12.3173 0.0390625 12.1738 0.0390625 12.0288C0.0390625 11.8839 0.06772 11.7403 0.123387 11.6065C0.179055 11.4726 0.260634 11.3511 0.363434 11.2488L11.3314 0.320831C11.4238 0.22546 11.5343 0.149443 11.6563 0.0972138C11.7784 0.0449846 11.9097 0.01759 12.0425 0.0166278C12.1752 0.0156657 12.3069 0.0411554 12.4297 0.09161C12.5525 0.142065 12.664 0.216473 12.7578 0.310495C12.8516 0.404517 12.9257 0.51627 12.9758 0.639232C13.0259 0.762194 13.051 0.893903 13.0496 1.02668C13.0483 1.15945 13.0205 1.29063 12.968 1.41255C12.9154 1.53448 12.8391 1.64472 12.7434 1.73683L2.41543 12.0288L12.7434 22.3228C12.9312 22.5101 13.0368 22.7643 13.0372 23.0294C13.0376 23.2946 12.9326 23.549 12.7454 23.7368ZM20.7454 23.7368C20.6527 23.8301 20.5424 23.9041 20.421 23.9547C20.2996 24.0053 20.1694 24.0314 20.0378 24.0316C19.9063 24.0318 19.776 24.006 19.6545 23.9558C19.5329 23.9056 19.4225 23.8318 19.3294 23.7388L8.36143 12.8088C8.25863 12.7066 8.17705 12.5851 8.12139 12.4512C8.06572 12.3173 8.03706 12.1738 8.03706 12.0288C8.03706 11.8839 8.06572 11.7403 8.12139 11.6065C8.17705 11.4726 8.25863 11.3511 8.36143 11.2488L19.3294 0.320831C19.4218 0.22546 19.5323 0.149443 19.6543 0.0972138C19.7764 0.0449846 19.9077 0.01759 20.0404 0.0166278C20.1732 0.0156657 20.3049 0.0411554 20.4277 0.09161C20.5505 0.142065 20.662 0.216473 20.7558 0.310495C20.8496 0.404517 20.9237 0.51627 20.9738 0.639232C21.0239 0.762194 21.049 0.893903 21.0476 1.02668C21.0463 1.15945 21.0185 1.29063 20.966 1.41255C20.9134 1.53448 20.8371 1.64472 20.7414 1.73683L10.4134 12.0288L20.7414 22.3228C20.9292 22.5101 21.0348 22.7643 21.0352 23.0294C21.0356 23.2946 20.9326 23.549 20.7454 23.7368Z" fill="#4D89E2"/>
                  </svg>                             
                  
                }
                <h1 className='forgetButton' onClick={e => toggleView("Forget")}> ResetPassword </h1>
              </div>
              {(errorMessage || successMessage) && (
                <div className={`message-banner ${errorMessage ? 'error' : 'success'}`}>
                  {errorMessage || successMessage}
                </div>
              )}
              <div className="slider" ref={containerRef}>
                <form className="label-inputs" onSubmit={handleRegister}>
                  <div className="label-input">
                    <label> Username </label>
                    <input
                    type="text"
                    placeholder="ex. John Doe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="label-input">
                    <label> Email </label>
                    <input
                    type="email"
                    placeholder="ex. johndoe@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="label-input">
                    <label> Password </label>
                    <input
                    type="password"
                    placeholder="ex. john***"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {/* === TERMS & PRIVACY CHECKBOX === */}
                  <div className="terms-consent">
                    <label className="flex items-start gap-3 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 accent-amber-500"
                      />
                      <span>
                        I agree to the {" "}
                        <Link
                          to="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-500 hover:underline"
                        >
                          Terms of Service {" "}
                        </Link>
                        and
                        {" "}
                        <Link
                          to="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-500 hover:underline"
                        >
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                  </div>
                  {/* Create Account Button */}
                  <div className="result-input">
                    <button
                      type="submit"
                      className="button-sign create-button"
                    // disabled={!acceptedTerms || !username.trim() || !email.trim() || password.length < 6}
                    >
                      <h5>Create Account</h5>
                    </button>
                  </div>
                </form>
                <form className="label-inputs" onSubmit={handleLoggingIn}>
                  <div className="label-input">
                    <label> Email </label>
                    <input
                    type="email"
                    placeholder="ex. johndoe@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="label-input">
                    <label> Password </label>
                    <input
                    type="password"
                    placeholder="ex. john***"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <h2 className='separate  w-full text-center'> OR </h2>

                  <div className="connect flex items-center justify-evenly">
                    <button className="button-sign google" onClick={handleLogginGoogle}>
                        <h5 className='flex items-center justify-evenly gap-3'> 
                          Sign in with
                          <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12.1926 1.15099C8.69557 2.36415 5.67973 4.66676 3.58806 7.72061C1.49639 10.7745 0.439155 14.4186 0.571638 18.1177C0.704121 21.8168 2.01934 25.376 4.32412 28.2724C6.62889 31.1687 9.80173 33.2497 13.3766 34.2096C16.2748 34.9574 19.3113 34.9903 22.225 34.3053C24.8646 33.7124 27.3049 32.4442 29.3071 30.6248C31.3909 28.6734 32.9034 26.191 33.6821 23.4444C34.5284 20.4575 34.679 17.3164 34.1223 14.2623H17.8473V21.0135H27.2727C27.0843 22.0903 26.6806 23.1179 26.0858 24.0351C25.491 24.9522 24.7173 25.7399 23.811 26.351C22.66 27.1123 21.3626 27.6246 20.002 27.8549C18.6374 28.1086 17.2377 28.1086 15.8731 27.8549C14.49 27.5689 13.1816 26.9981 12.0313 26.1787C10.1833 24.8706 8.79564 23.0121 8.06644 20.8686C7.32492 18.6849 7.32492 16.3175 8.06644 14.1338C8.5855 12.6031 9.44357 11.2095 10.5766 10.0569C11.8732 8.71358 13.5148 7.7534 15.3212 7.28167C17.1276 6.80993 19.029 6.84486 20.8168 7.38263C22.2135 7.81136 23.4906 8.56043 24.5465 9.57013C25.6093 8.51284 26.6702 7.45281 27.7293 6.39005C28.2762 5.81857 28.8723 5.27443 29.411 4.68927C27.7992 3.1894 25.9074 2.02232 23.8438 1.2549C20.0859 -0.109583 15.9742 -0.146253 12.1926 1.15099Z" fill="white"/>
                              <path d="M12.1918 1.15134C15.9731 -0.146782 20.0848 -0.111078 23.843 1.25252C25.9069 2.02515 27.7979 3.19785 29.4074 4.7033C28.8605 5.28845 28.2836 5.83533 27.7258 6.40408C26.6648 7.46319 25.6048 8.51866 24.5457 9.57048C23.4898 8.56078 22.2126 7.81171 20.816 7.38298C19.0288 6.84333 17.1274 6.80638 15.3205 7.27619C13.5136 7.74599 11.8711 8.7044 10.573 10.0463C9.44001 11.1989 8.58195 12.5926 8.06289 14.1232L2.39453 9.73455C4.42346 5.71108 7.93642 2.63344 12.1918 1.15134Z" fill="#E33629"/>
                              <path d="M0.891789 14.082C1.19646 12.5721 1.70227 11.1098 2.3957 9.73438L8.06405 14.134C7.32253 16.3177 7.32253 18.6851 8.06405 20.8688C6.17551 22.3271 4.28606 23.7927 2.3957 25.2656C0.659779 21.8102 0.130355 17.8732 0.891789 14.082Z" fill="#F8BD00"/>
                              <path d="M17.8469 14.2598H34.1219C34.6786 17.3139 34.528 20.455 33.6817 23.4418C32.903 26.1884 31.3905 28.6709 29.3067 30.6223C27.4774 29.1949 25.6399 27.7785 23.8106 26.3512C24.7175 25.7394 25.4916 24.9509 26.0864 24.0328C26.6813 23.1147 27.0846 22.0859 27.2723 21.0082H17.8469C17.8442 18.7605 17.8469 16.5102 17.8469 14.2598Z" fill="#587DBD"/>
                              <path d="M2.39258 25.266C4.28294 23.8077 6.1724 22.3421 8.06094 20.8691C8.79158 23.0134 10.1812 24.872 12.0312 26.1793C13.1852 26.9949 14.4964 27.5611 15.8813 27.8418C17.2459 28.0955 18.6455 28.0955 20.0102 27.8418C21.3708 27.6115 22.6682 27.0992 23.8191 26.3379C25.6484 27.7652 27.4859 29.1816 29.3152 30.609C27.3134 32.4293 24.873 33.6985 22.2332 34.2922C19.3195 34.9772 16.283 34.9443 13.3848 34.1965C11.0925 33.5845 8.95146 32.5055 7.0957 31.0273C5.1315 29.4679 3.52722 27.5027 2.39258 25.266Z" fill="#319F43"/>
                          </svg>
                        </h5>
                    </button>
                    <button className="button-sign fbook" onClick={handleLogginFacebook}>
                      <h5 className='flex items-center justify-evenly gap-3'> 
                        Sign in with
                        <svg width="33" height="33" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M30.8961 0.320312H2.10586C1.11973 0.320312 0.320312 1.11973 0.320312 2.10586V30.8961C0.320312 31.8822 1.11973 32.6816 2.10586 32.6816H30.8961C31.8822 32.6816 32.6816 31.8822 32.6816 30.8961V2.10586C32.6816 1.11973 31.8822 0.320312 30.8961 0.320312Z" fill="#3D5A98"/>
                        <path d="M22.6473 32.6797V20.1481H26.8527L27.4816 15.2645H22.6473V12.1473C22.6473 10.7337 23.041 9.76842 25.0672 9.76842H27.6539V5.39342C26.4013 5.26312 25.1425 5.20105 23.8832 5.20749C20.159 5.20749 17.5941 7.47702 17.5941 11.6633V15.2645H13.3887V20.1481H17.5941V32.6797H22.6473Z" fill="white"/>
                        </svg>
                      </h5>
                    </button>
                  </div>

                  <div className="result-input flex items-center justify-evenly">
                    <button className="button-sign create-button">
                      <h5> Login Account </h5>
                    </button>
                    <div className="info-sign">
                      <h5> Ask help? </h5>
                    </div>
                  </div>

                  {errorMessage && <p className="error-message">{errorMessage}</p>}
                  {successMessage && <p className="success-message">{successMessage}</p>} {/* Display success message */}

                </form>
                <form action="" className='label-inputs' onSubmit={e => handleResetPassword(emailForReset,e)}>
                  <div className="label-input">
                    <label> Email </label>
                      <input
                      type="email"
                      placeholder="ex. johndoe@gmail.com"
                      value={emailForReset}
                      onChange={(e) => setEmailForReset(e.target.value)}
                    />
                  </div>
                  <div className="result-input grid items-center justify-evenly">
                      <button className="button-sign create-button">
                          <h5> Forget Password </h5>
                      </button>
                      {errorMessage && <p className="error-message">{errorMessage}</p>}
                      {successMessage && <p className="success-message">{successMessage}</p>} {/* Display success message */}

                  </div>
                </form>
              </div>
            </div> 
            <p className='copyright'> 
                © 2024 T 4 S K Site. All rights reserved.
            </p>
          </div>

          <div className="circle"></div>
          <div className="box"></div>
          <div className="box_dev"></div>
        </div>  


        <div className="box_dev"></div>
        <div className="box"></div>
        <div className="circle"></div>
      </div>
    </div>
  )
}

export default Signup