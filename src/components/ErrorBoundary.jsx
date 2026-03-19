import React from 'react';
import '../scss/ErrorBoundary.scss';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-wrapper">
            {/* Background shapes */}
            <div className="error-boundary-shapes">
              <div className="eb-shape eb-shape1"></div>
              <div className="eb-shape eb-shape2"></div>
              <div className="eb-shape eb-shape3"></div>
            </div>
            
            {/* Glassmorphism content */}
            <div className="error-boundary-content">
                <div className="error-boundary-code">
                    <span>Y</span>
                    <span>I</span>
                    <span>K</span>
                    <span>E</span>
                    <span>S</span>
                </div>
                <p className="error-boundary-msg">Something went wrong loading this component. Please try reloading.</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="error-boundary-btn"
                >
                    Reload Page
                </button>
            </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
