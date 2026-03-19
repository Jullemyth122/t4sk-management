import { useState } from "react";
import { Link } from "react-router-dom";
import changelogData from "../data/changelog.json";
import "../scss/changelog.scss";

const Changelog = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const entries = changelogData;
    const total = entries.length;

    const goTo = (idx) => {
        if (idx >= 0 && idx < total) setCurrentIndex(idx);
    };

    const current = entries[currentIndex];

    return (
        <div className="changelog-page">
            {/* Background decoration */}
            <div className="changelog-bg-decor">
                <div className="changelog-glow g1"></div>
                <div className="changelog-glow g2"></div>
            </div>

            <div className="changelog-content">
                {/* Header */}
                <div className="changelog-header">
                    <Link to="/home" className="changelog-back-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        Back to Home
                    </Link>
                    <h1 className="changelog-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                        T4SK Changelog
                    </h1>
                    <p className="changelog-subtitle">
                        Track every update, improvement, and new feature as we build the future of task management.
                    </p>
                </div>

                {/* Carousel */}
                <div className="changelog-carousel">
                    {/* Navigation Arrows */}
                    <button
                        className={`carousel-arrow arrow-left ${currentIndex === 0 ? "disabled" : ""}`}
                        onClick={() => goTo(currentIndex - 1)}
                        disabled={currentIndex === 0}
                        aria-label="Previous version"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>

                    {/* Card */}
                    <div className="changelog-card" key={current.version}>
                        <div className="card-header">
                            <div className="version-info">
                                <span className="version-label">v{current.version}</span>
                                <span className="version-title">{current.title.split("—")[0].trim()}</span>
                                <span className="version-date">{current.date}</span>
                                {current.isLatest && (
                                    <span className="latest-badge">LATEST</span>
                                )}
                            </div>
                        </div>

                        {current.title.includes("—") && (
                            <p className="version-description">
                                {current.title.split("—").slice(1).join("—").trim()}
                            </p>
                        )}

                        <div className="changes-list">
                            {current.changes.map((change, idx) => (
                                <div className="change-item" key={idx}>
                                    <span className="change-bullet">•</span>
                                    <span className="change-text">{change}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        className={`carousel-arrow arrow-right ${currentIndex === total - 1 ? "disabled" : ""}`}
                        onClick={() => goTo(currentIndex + 1)}
                        disabled={currentIndex === total - 1}
                        aria-label="Next version"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>

                {/* Dot Indicators */}
                <div className="carousel-dots">
                    {entries.map((_, idx) => (
                        <button
                            key={idx}
                            className={`dot ${idx === currentIndex ? "active" : ""}`}
                            onClick={() => goTo(idx)}
                            aria-label={`Go to version ${entries[idx].version}`}
                        />
                    ))}
                </div>

                {/* Timeline Summary */}
                <div className="changelog-timeline">
                    <h3 className="timeline-title">Release Timeline</h3>
                    {entries.map((entry, idx) => (
                        <div
                            className={`timeline-entry ${idx === currentIndex ? "active" : ""}`}
                            key={entry.version}
                            onClick={() => goTo(idx)}
                        >
                            <div className="timeline-marker">
                                <div className="marker-dot"></div>
                                {idx < entries.length - 1 && <div className="marker-line"></div>}
                            </div>
                            <div className="timeline-info">
                                <span className="timeline-version">+ v{entry.version}</span>
                                <span className="timeline-separator">—</span>
                                <span className="timeline-date">{entry.date}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Changelog;
