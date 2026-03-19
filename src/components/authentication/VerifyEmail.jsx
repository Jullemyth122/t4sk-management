import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { sendEmailVerification } from 'firebase/auth';
import '../../scss/signup2.scss';

export default function VerifyEmail() {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [resendStatus, setResendStatus] = useState('');
  const [isResending, setIsResending] = useState(false);

  // If user came via signup, location.state.fromSignup will be true
  const fromSignup = location.state?.fromSignup;

  useEffect(() => {
    // If no user is logged in, or if their email is already verified,
    // they shouldn't be on this page. Wait a tiny bit to make sure auth state settles.
    if (!currentUser) {
      navigate('/signup', { replace: true });
    } else if (currentUser.emailVerified) {
      navigate('/choose-account', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleResend = async () => {
    if (!currentUser) return;
    setIsResending(true);
    setResendStatus('');
    try {
      await sendEmailVerification(currentUser);
      setResendStatus('Verification email sent! Check your inbox.');
    } catch (err) {
      console.error('Failed to resend:', err);
      if (err.code === 'auth/too-many-requests') {
        setResendStatus('Too many requests. Please wait a minute before trying again.');
      } else {
        setResendStatus('Failed to send. Please try again later.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleSkip = () => {
    // Manually navigate them to choose-account
    navigate('/choose-account', { replace: true });
  };

  const handleBackToLogin = async () => {
    await signOut();
    navigate('/signup', { replace: true });
  };

  if (!currentUser) return null; // Let the useEffect handle redirection

  return (
    <div className="signup-comp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="signup-in-comp" style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'center' }}>
        
        {/* We use the right-side container styles from signup2 to keep the glass card look */}
        <div className="rd-ctn" style={{ width: '100%', minHeight: '100vh', padding: '2rem' }}>
          <div className="rd-grid" />
          
          <div className="rd-inner" style={{ maxWidth: '440px' }}>
            
            <div className="rd-header">
              <div className="rd-logo">
                T<span className="logo-accent">4</span>SK
              </div>
              <p className="rd-tagline">Task Intelligence Platform</p>
            </div>

            <div className="panels-wrapper" style={{ minHeight: 'auto', marginTop: '20px' }}>
              <div className="label-inputs" style={{ position: 'relative' }}>
                <div className="glass-card" style={{ padding: '32px 24px', textAlign: 'center' }}>
                  
                  <div style={{ marginBottom: '24px' }}>
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style={{ margin: '0 auto', color: 'var(--gold)' }}>
                      <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 20 20H22V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" />
                    </svg>
                  </div>

                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-bright)', marginBottom: '12px' }}>
                    Verify your email
                  </h2>
                  
                  <p style={{ fontSize: '13px', color: 'var(--text-mid)', lineHeight: '1.6', marginBottom: '24px' }}>
                    We've sent a verification link to <strong style={{ color: 'var(--text-bright)' }}>{currentUser.email}</strong>. 
                    Please check your inbox (and spam folder) to verify your account.
                  </p>

                  {resendStatus && (
                    <div style={{
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      marginBottom: '20px',
                      backgroundColor: resendStatus.includes('sent') ? 'var(--success-bg)' : 'rgba(255, 107, 107, 0.1)',
                      color: resendStatus.includes('sent') ? 'var(--success-color)' : '#ff6b6b',
                      border: `1px solid ${resendStatus.includes('sent') ? 'var(--success-border)' : 'rgba(255, 107, 107, 0.2)'}`
                    }}>
                      {resendStatus}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                      className="auth-btn primary" 
                      onClick={handleSkip}
                      style={{ padding: '12px', borderRadius: '8px', fontWeight: '600' }}
                    >
                      Skip for now
                    </button>
                    
                    <button 
                      onClick={handleResend}
                      disabled={isResending}
                      style={{ 
                        background: 'transparent',
                        border: '1px solid var(--input-border)',
                        color: 'var(--text-bright)',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: isResending ? 'default' : 'pointer',
                        opacity: isResending ? 0.7 : 1,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      onMouseOver={(e) => { 
                        if(!isResending) {
                          e.currentTarget.style.background = 'var(--task-card-hover-bg)';
                          e.currentTarget.style.borderColor = 'var(--gold)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if(!isResending) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = 'var(--input-border)';
                        }
                      }}
                    >
                      {isResending ? <span className="spinner" style={{ width: '14px', height: '14px', borderLeftColor: 'var(--gold)' }}></span> : null}
                      {isResending ? 'Sending...' : 'Resend Email'}
                    </button>
                  </div>

                  <p className="auth-switch" style={{ marginTop: '24px' }}>
                    <button onClick={handleBackToLogin}>
                      ← Back to Sign In
                    </button>
                  </p>
                  
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '24px', opacity: 0.8 }}>
                    You can try out T4SK as a dummy account without verification.
                  </p>

                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
