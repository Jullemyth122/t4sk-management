import SkeletonBlock from "./SkeletonBlock";
import "../../scss/skeleton.scss";

export default function HomeSkeleton() {
    return (
        <div className="home-comp">

            {/* Background Decor — mirrors Home.jsx */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-[0] bg-grid-layer">
                <div className="ellipse elip1 absolute w-[40vw] h-[40vw] rounded-full opacity-30 blur-3xl -top-[15%] -left-[10%]"></div>
                <div className="ellipse elip2 absolute w-[40vw] h-[40vw] rounded-full opacity-30 blur-3xl -top-[15%] -right-[10%]"></div>
                <div className="data-stream d1"></div>
                <div className="data-stream d2"></div>
                <div className="data-stream d3"></div>
                <div className="data-stream d4"></div>
                <div className="data-stream d5"></div>
            </div>

            <div className="hero-content relative z-10 w-full">

                {/* ── Mode Toggle ── */}
                <div className="mode-toggle-wireframe">
                    <SkeletonBlock style={{ width: 120, height: 36, borderRadius: 8 }} />
                    <div className="center-node">
                        <div className="orbit-ring"></div>
                        <div className="orbit-ring inverse"></div>
                        <div className="wave-line"></div>
                    </div>
                    <SkeletonBlock style={{ width: 120, height: 36, borderRadius: 8 }} />
                </div>

                {/* ── Center Box (Title + CTAs) ── */}
                <div className="center-box-container">
                    <div className="vertical-line-top data-travel-path"></div>

                    {/* Title box */}
                    <div className="center-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '2rem' }}>
                        <SkeletonBlock style={{ width: '70%', height: 40, borderRadius: 8 }} />
                        <SkeletonBlock style={{ width: '50%', height: 40, borderRadius: 8 }} />
                        <div className="box-corner tl"></div>
                        <div className="box-corner tr"></div>
                        <div className="box-corner bl"></div>
                        <div className="box-corner br"></div>
                    </div>

                    {/* Subtitle lines */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%', maxWidth: '520px', margin: '0 auto' }}>
                        <SkeletonBlock style={{ width: '90%', height: 16, borderRadius: 4 }} />
                        <SkeletonBlock style={{ width: '75%', height: 16, borderRadius: 4 }} />
                    </div>
                </div>

                    {/* CTA Buttons */}
                    <div className="cta-container">
                        <SkeletonBlock style={{ width: 180, height: 48, borderRadius: 8 }} />
                        <SkeletonBlock style={{ width: 150, height: 48, borderRadius: 8 }} />
                    </div>

                    <div className="vertical-line-bottom text-data-flow"></div>
                </div>

                {/* ── Dual Panels ── */}
                <div className="panels-container w-full max-w-7xl mx-auto">
                    <div className="horizontal-connector">
                        <div className="connector-node left"></div>
                        <div className="flow-dot left-flow"></div>
                        <div className="flow-dot flow-spark"></div>
                        <div className="flow-dot right-flow"></div>
                        <div className="connector-node right"></div>
                    </div>

                    {/* Left Panel — Feature Timeline */}
                    <div className="panel left-panel panel-amber">
                        <div className="panel-hud-corners"></div>
                        <SkeletonBlock style={{ width: 200, height: 18, borderRadius: 4, marginBottom: '1.5rem' }} />
                        <div className="timeline-nodes">
                            {[1, 2, 3, 4].map((i) => (
                                <div className="t-node-row" key={i}>
                                    {/* Icon circle */}
                                    <div className="t-circle" style={{ position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                                        <SkeletonBlock style={{ width: '100%', height: '100%', borderRadius: '50%', position: 'absolute', inset: 0 }} />
                                    </div>
                                    {/* Text */}
                                    <div className="t-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                        <SkeletonBlock style={{ width: '60%', height: 14, borderRadius: 4 }} />
                                        <SkeletonBlock style={{ width: '90%', height: 12, borderRadius: 4 }} />
                                    </div>
                                    <div className="t-line animated-line"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel — Kanban Board */}
                    <div className="panel right-panel panel-amber">
                        <div className="panel-hud-corners"></div>
                        {/* Panel header */}
                        <div className="panel-header-flex" style={{ marginBottom: '1rem' }}>
                            <SkeletonBlock style={{ width: 220, height: 18, borderRadius: 4 }} />
                            <SkeletonBlock style={{ width: 80, height: 14, borderRadius: 4 }} />
                        </div>

                        <div className="kanban-wireframe">
                            {/* Three kanban columns */}
                            {[1, 2, 3].map((col) => (
                                <div
                                    className={`k-col${col === 3 ? ' hidden md:flex' : ''}`}
                                    key={col}
                                    style={{ flexDirection: 'column', gap: '10px' }}
                                >
                                    {/* Column header */}
                                    <div className="k-header-real flex justify-between">
                                        <SkeletonBlock style={{ width: 70, height: 13, borderRadius: 3 }} />
                                        <SkeletonBlock style={{ width: 20, height: 13, borderRadius: 10 }} />
                                    </div>
                                    {/* Cards */}
                                    <div className="k-card-real" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <SkeletonBlock style={{ width: 60, height: 18, borderRadius: 4 }} />
                                        <SkeletonBlock style={{ width: '80%', height: 14, borderRadius: 4 }} />
                                        <SkeletonBlock style={{ width: 50, height: 11, borderRadius: 3 }} />
                                    </div>
                                    <div className="k-card-real" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <SkeletonBlock style={{ width: '90%', height: 14, borderRadius: 4 }} />
                                        <SkeletonBlock style={{ width: '100%', height: 8, borderRadius: 4 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Ratings / Status Row ── */}
                <div className="ratings-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <SkeletonBlock style={{ width: 140, height: 22, borderRadius: 6 }} />
                        <SkeletonBlock style={{ width: 60, height: 20, borderRadius: 10 }} />
                    </div>
                    <div className="diamonds">
                        {/* Diamond 1 */}
                        <div className="diamond">
                            <div className="diamond-brackets"></div>
                            <span className="inner">
                                <SkeletonBlock style={{ width: 20, height: 20, borderRadius: '50%' }} />
                            </span>
                        </div>
                        <div className="d-node animated-d-line"></div>
                        {/* Diamond 2 — active */}
                        <div className="diamond active">
                            <div className="diamond-rotating-ring"></div>
                            <span className="inner">
                                <SkeletonBlock style={{ width: 20, height: 20, borderRadius: '50%' }} />
                            </span>
                        </div>
                        <div className="d-node animated-d-line reverse"></div>
                        {/* Diamond 3 */}
                        <div className="diamond">
                            <div className="diamond-brackets"></div>
                            <span className="inner">
                                <SkeletonBlock style={{ width: 20, height: 20, borderRadius: '50%' }} />
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Data Cube Section ── */}
                <div className="data-cube-section theme-amber">
                    <div className="cube-container">
                        {/* Placeholder cube outline */}
                        <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SkeletonBlock style={{ width: 160, height: 160, borderRadius: '12px' }} />
                        </div>
                        <div className="cube-shadow"></div>
                    </div>

                    <div className="cube-text-content">
                        <SkeletonBlock style={{ width: 200, height: 20, borderRadius: 6, marginBottom: '0.75rem' }} />
                        <SkeletonBlock style={{ width: '80%', height: 28, borderRadius: 6, marginBottom: '0.5rem' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
                            <SkeletonBlock style={{ width: '100%', height: 14, borderRadius: 4 }} />
                            <SkeletonBlock style={{ width: '95%', height: 14, borderRadius: 4 }} />
                            <SkeletonBlock style={{ width: '85%', height: 14, borderRadius: 4 }} />
                            <SkeletonBlock style={{ width: '90%', height: 14, borderRadius: 4 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <SkeletonBlock style={{ width: 14, height: 14, borderRadius: '50%' }} />
                                <SkeletonBlock style={{ width: 180, height: 13, borderRadius: 4 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <SkeletonBlock style={{ width: 14, height: 14, borderRadius: '50%' }} />
                                <SkeletonBlock style={{ width: 160, height: 13, borderRadius: 4 }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="footer-expanded-wrapper">
                    <div className="footer-top-line animated-d-line"></div>
                    <div className="footer-grid">

                        {/* Brand column */}
                        <div className="f-col brand-col">
                            <div className="f-logo" style={{ gap: '8px' }}>
                                <SkeletonBlock style={{ width: 24, height: 24, borderRadius: 4 }} />
                                <SkeletonBlock style={{ width: 60, height: 22, borderRadius: 4 }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                                <SkeletonBlock style={{ width: '100%', height: 13, borderRadius: 4 }} />
                                <SkeletonBlock style={{ width: '85%', height: 13, borderRadius: 4 }} />
                                <SkeletonBlock style={{ width: '70%', height: 13, borderRadius: 4 }} />
                            </div>
                            <div className="social-icons" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <SkeletonBlock style={{ width: 18, height: 18, borderRadius: '50%' }} />
                                <SkeletonBlock style={{ width: 18, height: 18, borderRadius: '50%' }} />
                                <SkeletonBlock style={{ width: 18, height: 18, borderRadius: '50%' }} />
                            </div>
                        </div>

                        {/* Link columns */}
                        {['About Us', 'Product', 'Contact'].map((col) => (
                            <div className="f-col" key={col}>
                                <SkeletonBlock style={{ width: 80, height: 16, borderRadius: 4, marginBottom: '12px' }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {[1, 2, 3, 4].map((i) => (
                                        <SkeletonBlock key={i} style={{ width: `${50 + i * 10}%`, height: 13, borderRadius: 4 }} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="footer-bottom">
                        <SkeletonBlock style={{ width: 260, height: 13, borderRadius: 4 }} />
                        <div className="legal-links" style={{ display: 'flex', gap: '16px' }}>
                            <SkeletonBlock style={{ width: 90, height: 13, borderRadius: 4 }} />
                            <SkeletonBlock style={{ width: 110, height: 13, borderRadius: 4 }} />
                            <SkeletonBlock style={{ width: 90, height: 13, borderRadius: 4 }} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}