import React from 'react';
import { Link } from 'react-router-dom';
import './error.scss';

const Error = () => {
    return (
        <div className="error-container">
            {/* Background shapes */}
            <div className="shape shape1"></div>
            <div className="shape shape2"></div>
            <div className="shape shape3"></div>
            {/* Glassmorphism content */}
            <div className="error-content">
                <h1 className="sr-only">Page Not Found</h1>
                <div className="error-code">
                    <span>4</span>
                    <span>0</span>
                    <span>4</span>
                </div>
                <p>Oops! The page you’re looking for can’t be found.</p>
                <Link to="/home" className="error-home-link">
                    Go Home
                </Link>
            </div>
        </div>
    );
};

export default Error;