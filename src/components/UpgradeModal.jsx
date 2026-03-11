import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../scss/pricing.scss';

export default function UpgradeModal({ isOpen, onClose, featureName = 'This feature' }) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="upgrade-modal-overlay" onClick={onClose}>
            <div className="upgrade-modal-content" onClick={e => e.stopPropagation()}>
                <div className="upgrade-icon">🚀</div>
                <h2 className="upgrade-title">Upgrade to Pro</h2>
                <p className="upgrade-desc">
                    You've reached the free limit or {featureName} is available exclusively on our Pro and Enterprise plans.
                </p>
                <div className="upgrade-actions">
                    <button className="btn-later" onClick={onClose}>
                        Later
                    </button>
                    <button className="btn-see-plans" onClick={() => {
                        onClose();
                        navigate('/pricing');
                    }}>
                        See Plans
                    </button>
                </div>
            </div>
        </div>
    );
}
