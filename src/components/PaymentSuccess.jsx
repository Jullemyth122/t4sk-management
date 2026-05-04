import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useReduxAuth } from '../context/ReduxAuthContext';
import '../scss/pricing.scss'; // Reuse pricing styles for the success page aesthetic

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useReduxAuth();
  
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const planType = searchParams.get('plan');
  const businessId = searchParams.get('biz');
  const accountType = searchParams.get('type') || 'business';
  // Optional: session_id from Stripe if you wanted to verify it via another serverless function

  useEffect(() => {
    if (!currentUser) return;
    
    if (!planType || !businessId) {
      setStatus('error');
      setErrorMsg('Missing payment parameters. Please contact support.');
      return;
    }

    const upgradePlan = async () => {
      try {
        // Secure Flow: We stored the session ID when we created the checkout
        const sessionId = sessionStorage.getItem('pending_paymongo_session_id');
        
        if (!sessionId) {
          // Fallback if they refreshed or accessed it improperly.
          // Still mockable if it's test mode but safer to error out.
          const isMockPlanLocal = searchParams.get('session_id') === 'mock_session_123';
          if (!isMockPlanLocal) {
              setStatus('error');
              setErrorMsg('No active payment session found. Did you already complete this payment?');
              return;
          }
        }

        // Call our secure backend to verify PayMongo actually received the payment
        const response = await fetch('/api/verify-paymongo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sessionId: sessionId || searchParams.get('session_id'),
                businessId,
                planType,
                accountType
            })
        });

        const data = await response.json();

        if (response.ok && data.status === 'paid') {
            // VERIFIED! The backend API (verify-paymongo.js) has now safely upgraded the database.
            // We just need to notify the user of success and clean up.

            // Client-side fallback: if the backend couldn't update Firestore 
            // (Firebase Admin SDK not configured), update from client directly.
            if (data.dbUpdateFailed && businessId && planType) {
              try {
                if (accountType === 'personal') {
                    await updateDoc(doc(db, 'account', businessId), { planType });
                    console.log(`[PaymentSuccess] Client-side fallback: upgraded personal account ${businessId} to ${planType}`);
                } else {
                    await updateDoc(doc(db, 'businesses', businessId), { planType });
                    console.log(`[PaymentSuccess] Client-side fallback: upgraded ${businessId} to ${planType}`);
                }
              } catch (fbErr) {
                console.warn('[PaymentSuccess] Client fallback update failed:', fbErr.message);
              }
            }
            
            // Clean up the session storage
            sessionStorage.removeItem('pending_paymongo_session_id');
            setStatus('success');
        } else {
            console.warn("Verification returned:", data);
            setStatus('error');
            setErrorMsg(data.message || 'Payment has not been completed or could not be verified.');
        }

      } catch (err) {
        console.error("Error upgrading plan:", err);
        setStatus('error');
        setErrorMsg('Failed to apply plan upgrade. Please contact support.');
      }
    };

    upgradePlan();
  }, [currentUser, planType, businessId]);

  return (
    <div className="pricing-container success-page" style={{ justifyContent: 'center' }}>
      <div className="pricing-card active-plan" style={{ textAlign: 'center', padding: '60px 40px' }}>
        
        {status === 'processing' && (
          <>
            <h2 style={{ marginBottom: '20px' }}>Processing Payment...</h2>
            <div className="spinner" style={{ margin: '0 auto', width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p className="desc" style={{ marginTop: '20px' }}>Please do not close this window. We are verifying your transaction.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ color: '#10b981', marginBottom: '10px' }}>Payment Successful!</h2>
            <p className="desc" style={{ fontSize: '1.1rem', marginBottom: '30px' }}>
              Your business workspace has been successfully upgraded to the <strong>{planType.toUpperCase()}</strong> plan. 
              You now have access to premium features!
            </p>
            <button className="btn-plan primary" onClick={() => navigate('/businessDashboard')}>Go to Dashboard</button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
            <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>Verification Failed</h2>
            <p className="desc" style={{ marginBottom: '30px' }}>{errorMsg}</p>
            <button className="btn-plan outline" onClick={() => navigate('/pricing')}>Return to Pricing</button>
          </>
        )}

        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .success-page { min-height: 100vh; display: flex; align-items: center; }
        `}</style>
      </div>
    </div>
  );
}
