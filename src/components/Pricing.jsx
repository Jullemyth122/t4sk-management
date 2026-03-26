import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useReduxAuth } from '../context/ReduxAuthContext';
import '../scss/pricing.scss';

export default function Pricing() {
  // CRITICAL: useAuth() returns { currentUser } where profile lives at currentUser.profile
  // There is NO separate "profile" export from useAuth!
  const { currentUser } = useReduxAuth();
  const profile = currentUser?.profile || null;
  const uid = currentUser?.uid || null;
  const navigate = useNavigate();

  const [loadingPlan, setLoadingPlan] = useState(null);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [businessId, setBusinessId] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showDevZone, setShowDevZone] = useState(false);
  const [ownerCheckComplete, setOwnerCheckComplete] = useState(false);

  useEffect(() => {
    if (!currentUser || !profile) return;

    const affiliations = profile.businessAffiliations;
    if (!Array.isArray(affiliations) || affiliations.length === 0) return;

    const bId = affiliations[0].businessId;
    if (!bId) return;
    setBusinessId(bId);

    const fetchBusiness = async () => {
      try {
        const bDoc = await getDoc(doc(db, 'businesses', bId));
        if (bDoc.exists()) {
          const data = bDoc.data();
          setCurrentPlan(data.planType || 'free');

          // Determine ownership through multiple checks
          let ownerStatus = false;

          // 1. Match ownerUid on the business document
          if (uid && data.ownerUid && String(data.ownerUid) === String(uid)) {
            ownerStatus = true;
          }

          // 2. Match roleId in profile affiliations (case-insensitive)
          const aff = affiliations.find(a => a.businessId === bId);
          if (aff && typeof aff.roleId === 'string' && aff.roleId.toLowerCase() === 'owner') {
            ownerStatus = true;
          }

          // 3. Fallback: if accountType is business AND they have no affiliations, they might be in the middle of creating one
          // But generally, they shouldn't be here. We should only trust the ownerUid or roleId='owner'.
          // Removed the `profile.accountType === 'business' || !data.ownerUid` fallback as it was too permissive.
          
          setIsOwner(ownerStatus);
          setOwnerCheckComplete(true);
          // console.log('[Pricing] Owner check:', { uid, ownerUid: data.ownerUid, roleId: aff?.roleId, accountType: profile.accountType, ownerStatus });
        } else {
            setOwnerCheckComplete(true);
        }
      } catch (e) {
        console.error('Error fetching business plan:', e);
        setOwnerCheckComplete(true);
      }
    };
    fetchBusiness();
  }, [currentUser, profile, uid]);

  const handleCheckout = async (planType, gateway) => {
    if (!currentUser) {
      navigate('/choose-account');
      return;
    }

    if (!businessId) {
      alert('You need to set up a Business account first.');
      navigate('/business');
      return;
    }

    if (!isOwner) {
      alert('Only the Owner of the Business can manage subscriptions.');
      return;
    }

    setLoadingPlan(planType);

    try {
      const endpoint = gateway === 'paymongo' ? '/api/create-paymongo' : '/api/create-stripe';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, planType }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // We received the checkout URL and the session ID.
        // We must store the session ID so the success page can ask the backend to verify it.
        // (Stripe does this automatically by passing {CHECKOUT_SESSION_ID} in the query string, 
        // but PayMongo does not support templating in the redirect URL).
        if (data.sessionId) {
            sessionStorage.setItem('pending_paymongo_session_id', data.sessionId);
        }
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to initialize payment gateway.');
      }
    } catch (e) {
      console.error('Checkout Request Error:', e);
      alert('Error contacting payment gateway: ' + e.message);
      setLoadingPlan(null);
    }
  };

  const handleDevToggle = async (type) => {
    if (!businessId) return alert('No business ID found to toggle.');
    try {
      await updateDoc(doc(db, 'businesses', businessId), { planType: type });
      setCurrentPlan(type);
      alert(`Developer Toggle: Successfully changed plan to ${type.toUpperCase()}`);
    } catch (e) {
      console.error(e);
      alert('Error toggling plan: ' + e.message);
    }
  };

  if (ownerCheckComplete && !isOwner) {
    return (
      <div className="pricing-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#ef4444', maxWidth: '500px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.5rem', fontWeight: 'bold' }}>Access Denied</h2>
          <p style={{ marginBottom: '24px', lineHeight: '1.5' }}>
            Only the Business Owner can manage subscriptions and view the pricing page.
          </p>
          <button 
            className="btn-plan primary" 
            style={{ width: 'auto', padding: '10px 24px' }}
            onClick={() => navigate('/businessDashboard')}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Upgrade your Business Workspace</h1>
        <p>Unlock premium features like AI Co-Pilot and advanced OCR to supercharge your management.</p>
      </div>

      <div className="pricing-cards">
        {/* FREE PLAN */}
        <div className={`pricing-card ${currentPlan === 'free' ? 'active-plan' : ''}`}>
          {currentPlan === 'free' && <div className="current-badge">Current Plan</div>}
          <h2>Free</h2>
          <div className="price">₱0<span>/month</span></div>
          <p className="desc">Basic tools to get started</p>
          <ul className="features">
            <li>✔ Up to 10 Boards</li>
            <li>✔ Unlimited Cards and Lists</li>
            <li>✔ Unlimited Members</li>
            <li>✔ Basic Task Management</li>
            <li>✔ <strong>AI Co-Pilot & OCR (3 per 5 hrs)</strong></li>
            <li className="dimmed">✖ Calendar View</li>
          </ul>
          <button className="btn-plan disabled" disabled>Included</button>
        </div>

        {/* PRO PLAN */}
        <div className={`pricing-card pro ${currentPlan === 'pro' ? 'active-plan' : ''}`}>
          {currentPlan === 'pro' && <div className="current-badge">Current Plan</div>}
          <h2>Pro</h2>
          <div className="price">$4<span>/month</span></div>
          <p className="sub-price">(₱232 / month)</p>
          <p className="desc">For growing businesses</p>
          <ul className="features">
            <li>✔ Unlimited Boards</li>
            <li>✔ Unlimited Members</li>
            <li>✔ Advanced Task Management</li>
            <li>✔ <strong>Calendar View Included</strong></li>
            <li>✔ <strong>AI Co-Pilot Included</strong></li>
            <li>✔ <strong>Document OCR Limit: 100/mo</strong></li>
          </ul>
          {currentPlan === 'pro' ? (
            <button className="btn-plan outline" disabled>Active</button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className={`btn-plan primary ${loadingPlan === 'pro' ? 'loading' : ''}`}
                onClick={() => handleCheckout('pro', 'stripe')}
                disabled={loadingPlan !== null || !isOwner}
              >
                {loadingPlan === 'pro' ? 'Processing...' : 'Pay with Card (Stripe)'}
              </button>
              <button
                className={`btn-plan outline ${loadingPlan === 'pro' ? 'loading' : ''}`}
                onClick={() => handleCheckout('pro', 'paymongo')}
                disabled={loadingPlan !== null || !isOwner}
              >
                {loadingPlan === 'pro' ? 'Processing...' : 'Pay with GCash'}
              </button>
            </div>
          )}
        </div>

        {/* ENTERPRISE PLAN */}
        <div className={`pricing-card enterprise ${currentPlan === 'enterprise' ? 'active-plan' : ''}`}>
          {currentPlan === 'enterprise' && <div className="current-badge">Current Plan</div>}
          <h2>Enterprise</h2>
          <div className="price">$8.50<span>/month</span></div>
          <p className="sub-price">(₱493 / month)</p>
          <p className="desc">Maximum power and features</p>
          <ul className="features">
            <li>✔ Unlimited Everything</li>
            <li>✔ Priority Support</li>
            <li>✔ Custom Analytics</li>
            <li>✔ <strong>Calendar View Included</strong></li>
            <li>✔ <strong>Unlimited AI Co-Pilot</strong></li>
            <li>✔ <strong>Unlimited Document OCR</strong></li>
          </ul>
          {currentPlan === 'enterprise' ? (
            <button className="btn-plan outline" disabled>Active</button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className={`btn-plan premium ${loadingPlan === 'enterprise' ? 'loading' : ''}`}
                onClick={() => handleCheckout('enterprise', 'stripe')}
                disabled={loadingPlan !== null || !isOwner}
              >
                {loadingPlan === 'enterprise' ? 'Processing...' : 'Pay with Card (Stripe)'}
              </button>
              <button
                className={`btn-plan outline ${loadingPlan === 'enterprise' ? 'loading' : ''}`}
                onClick={() => handleCheckout('enterprise', 'paymongo')}
                disabled={loadingPlan !== null || !isOwner}
              >
                {loadingPlan === 'enterprise' ? 'Processing...' : 'Pay with GCash'}
              </button>
            </div>
          )}
        </div>
      </div>

      {currentUser && isOwner && (
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <button
            onClick={() => setShowDevZone(!showDevZone)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.4)',
              padding: '6px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              transition: 'all 0.2s ease',
            }}
          >
            {showDevZone ? '🛠 Hide Dev Tools' : '🛠 Dev Tools'}
          </button>
          {showDevZone && (
            <div className="developer-toggle-zone" style={{ marginTop: '16px' }}>
              <h3>Developer Testing Zone</h3>
              <p>Easily swap your plan directly in the database to test features.</p>
              <div className="toggle-buttons">
                <button onClick={() => handleDevToggle('free')}>Set Free</button>
                <button onClick={() => handleDevToggle('pro')}>Set Pro</button>
                <button onClick={() => handleDevToggle('enterprise')}>Set Enterprise</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
