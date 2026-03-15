import { useState, useEffect } from "react";
import "../scss/home.scss";
import HomeSkeleton from "./loaders/HomeSkeleton";

const Home = ({ simulateLoading = false }) => {
    const [loading, setLoading] = useState(Boolean(simulateLoading));
    const [viewMode, setViewMode] = useState('business');

    useEffect(() => {
        if (!simulateLoading) return;
        const t = setTimeout(() => setLoading(false), 2000); // demo 1s
        return () => clearTimeout(t);
    }, [simulateLoading]);

    if (loading) return <HomeSkeleton/>;

    // --- Dynamic Content Data ---
    const featuresData = {
        business: [
            {
                id: 'f1', title: 'Real-Time Sync', desc: 'Instant updates across all devices seamlessly.',
                iconClass: 'icon-glow-blue',
                iconSvg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
            },
            {
                id: 'f2', title: 'Project Tracking', desc: 'Visual boards, active lists & detailed timelines.',
                iconClass: 'icon-glow-amber', isAnimatedLine: true,
                iconSvg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
            },
            {
                id: 'f3', title: 'Enterprise Security', desc: 'Bank-grade role-based data protection.',
                iconClass: 'icon-glow-green', isReverseLine: true,
                iconSvg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            },
            {
                id: 'f4', title: 'Agile Collaboration', desc: 'Built-in multi-tenant team sharing.',
                iconClass: 'icon-glow-purple',
                iconSvg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            }
        ],
        personal: [
            {
                id: 'p1', title: 'Life Orchestration', desc: 'Centralize daily habits and long-term goals.',
                iconClass: 'icon-glow-teal',
                iconSvg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            },
            {
                id: 'p2', title: 'Focus Sessions', desc: 'Integrated Pomodoro timer with stats.',
                iconClass: 'icon-glow-rose', isAnimatedLine: true,
                iconSvg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            },
            {
                id: 'p3', title: 'Habit Tracking', desc: 'Visual streaks and consistency analytics.',
                iconClass: 'icon-glow-emerald', isReverseLine: true,
                iconSvg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            },
            {
                id: 'p4', title: 'Private Vault', desc: 'Locally encrypted personal reflections.',
                iconClass: 'icon-glow-indigo',
                iconSvg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            }
        ]
    };

    const activeFeatures = viewMode === 'business' ? featuresData.business : featuresData.personal;

    return (
        <div className='home-comp'>

            {/* Background Decor (Grid Texture + Matrix Streams) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-[0] bg-grid-layer">
                <div className="ellipse elip1 absolute w-[40vw] h-[40vw] rounded-full opacity-30 blur-3xl -top-[15%] -left-[10%]"></div>
                <div className="ellipse elip2 absolute w-[40vw] h-[40vw] rounded-full opacity-30 blur-3xl -top-[15%] -right-[10%]"></div>

                {/* Data Streams */}
                <div className="data-stream d1"></div>
                <div className="data-stream d2"></div>
                <div className="data-stream d3"></div>
                <div className="data-stream d4"></div>
                <div className="data-stream d5"></div>
            </div>

            <div className="hero-content relative z-10 w-full">

                {/* Top Toggle */}
                <div className="mode-toggle-wireframe">
                    <span
                        className={viewMode === 'business' ? 'active shadow-glow-amber' : ''}
                        onClick={() => setViewMode('business')}
                    >
                        Business Task
                    </span>
                    <div className="center-node">
                        <div className="orbit-ring"></div>
                        <div className="orbit-ring inverse"></div>
                        <div className="wave-line"></div>
                    </div>
                    <span
                        className={viewMode === 'personal' ? 'active shadow-glow-teal' : ''}
                        onClick={() => setViewMode('personal')}
                    >
                        Personal Task
                    </span>
                </div>

                {/* --- Divergent Layout Logic --- */}
                {viewMode === 'business' ? (
                    <>
                        {/* Center Title Box (Business) */}
                        <div className="center-box-container">
                            <div className="vertical-line-top data-travel-path"></div>
                            <div className="center-box business-box-glow">
                                <h2>Power Your <span className="highlight-text">Business.</span></h2>
                                <div className="box-corner tl"></div><div className="box-corner tr"></div>
                                <div className="box-corner bl"></div><div className="box-corner br"></div>
                            </div>
                            <p className="subtitle-text">
                                Super-flexible task management designed to adapt to your unique workflow. <br />
                                Experience real-time sync, visual boards, and seamless organization.
                            </p>

                            {/* CTAs */}
                            <div className="cta-container">
                                <button className="btn-primary btn-amber">Launch Workspace</button>
                                <button className="btn-secondary">
                                    <span className="play-icon">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </span> Watch Demo
                                </button>
                            </div>

                            <div className="vertical-line-bottom text-data-flow"></div>
                        </div>

                        {/* Dual Panels (Business Kanban) */}
                        <div className="panels-container w-full max-w-7xl mx-auto">
                            <div className="horizontal-connector">
                                <div className="connector-node left"></div>
                                <div className="flow-dot left-flow"></div>
                                <div className="flow-dot flow-spark"></div>
                                <div className="flow-dot right-flow"></div>
                                <div className="connector-node right"></div>
                            </div>

                            {/* Left Panel - Timeline/Nodes (Dynamic Features) */}
                            <div className="panel left-panel panel-amber">
                                <div className="panel-hud-corners"></div>
                                <h4 className="panel-title">System Architecture v2.0</h4>
                                <div className="timeline-nodes">
                                    {activeFeatures.map((feat, idx) => (
                                        <div className="t-node-row" key={feat.id}>
                                            <div className={`t-circle feature-icon ${feat.iconClass}`}>
                                                <div className="ring-pulse"></div>
                                                {feat.iconSvg}
                                            </div>
                                            <div className="t-content">
                                                <h5>{feat.title}</h5>
                                                <p>{feat.desc}</p>
                                            </div>
                                            <div className={`t-line ${feat.isAnimatedLine ? 'active-line' : 'animated-line'} ${feat.isReverseLine ? 'reverse' : ''}`}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Panel - Kanban View (Data) */}
                            <div className="panel right-panel panel-amber">
                                <div className="panel-hud-corners"></div>
                                <div className="panel-header-flex">
                                    <h4 className="panel-title mb-0 flex items-center gap-2">
                                        <span className="status-led bg-amber-500"></span>
                                        PRODUCT_LAUNCH_BOARD
                                    </h4>
                                    <div className="data-processing-indicator">
                                        <span className="p-dot"></span><span className="p-dot"></span><span className="p-dot"></span>
                                        <span className="p-text">SYNCING</span>
                                    </div>
                                </div>

                                <div className="kanban-wireframe">
                                    {/* To Do Column */}
                                    <div className="k-col">
                                        <div className="k-header-real flex justify-between">
                                            <span>TO DO</span> <span className="badge">4</span>
                                        </div>
                                        <div className="k-card-real">
                                            <span className="tag tag-amber">Planning</span>
                                            <h6>Q4 Roadmap Planning</h6>
                                            <span className="date">Oct 24</span>
                                        </div>
                                        <div className="k-card-real">
                                            <h6>Competitor Analysis</h6>
                                            <div className="progress-bar"><div className="fill w-40 animated-progress"></div></div>
                                        </div>
                                    </div>

                                    {/* In Progress Column */}
                                    <div className="k-col">
                                        <div className="k-header-real flex justify-between">
                                            <span>IN PROGRESS</span> <span className="badge">2</span>
                                        </div>
                                        <div className="k-card-real active-card shadow-glow border-glow-amber">
                                            <div className="pulse-dot bg-amber-400"></div>
                                            <span className="tag tag-amber border-glow-amber">High Priority</span>
                                            <h6>Implement Auth Flow</h6>
                                            <p className="desc clamp-2">
                                                Integrate Firebase auth with custom hooks securely...
                                            </p>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="date text-amber-400">Due Today</span>
                                                <svg className="spin-slow text-amber-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.25 3.64" /></svg>
                                            </div>
                                            <div className="scanline-overlay"></div>
                                        </div>
                                    </div>

                                    {/* Review Column */}
                                    <div className="k-col hidden md:flex">
                                        <div className="k-header-real flex justify-between">
                                            <span>IN REVIEW</span> <span className="badge">1</span>
                                        </div>
                                        <div className="k-card-real opacity-70">
                                            <h6>Update API Docs</h6>
                                            <span className="tag tag-mono">PR #204</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ratings / System Status (Business) */}
                        <div className="ratings-section">
                            <h3>Server Uplink <span className="live-badge">ONLINE</span></h3>
                            <div className="diamonds">
                                <div className="diamond" title="API Status: Optimal">
                                    <div className="diamond-brackets"></div>
                                    <span className="inner text-blue-400">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                                    </span>
                                </div>
                                <div className="d-node animated-d-line"></div>
                                <div className="diamond active" title="Database Sync: Live">
                                    <div className="diamond-rotating-ring"></div>
                                    <span className="inner text-amber-400">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" /></svg>
                                    </span>
                                </div>
                                <div className="d-node animated-d-line reverse"></div>
                                <div className="diamond" title="Security: Secured">
                                    <div className="diamond-brackets"></div>
                                    <span className="inner text-green-400">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* --- NEW PERSONAL LAYOUT (Neural Hex Grid & Tesseract) --- */}
                        <div className="personal-hero-section">
                            {/* Central Hex Node */}
                            <div className="hex-core-node">
                                <div className="hex-outer-spin">
                                    <svg viewBox="0 0 100 100" className="hex-svg"><polygon points="50 1 95 25 95 75 50 99 5 75 5 25" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5,10" /></svg>
                                </div>
                                <div className="hex-inner">
                                    <div className="hex-pulse-ring"></div>
                                    <svg viewBox="0 0 100 100" className="hex-svg-solid"><polygon points="50 3 93 25 93 75 50 97 7 75 7 25" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2" /></svg>
                                    <h2>Master Your <br/><span className="highlight-text-alt">Reality.</span></h2>
                                </div>
                            </div>
                            <p className="hex-subtitle">
                                A highly customizable, deeply private telemetry vault.<br/>
                                Orchestrate life metrics, habits, and complex goals intuitively.
                            </p>
                            
                            <div className="hex-cta-cluster">
                                <button className="btn-primary btn-teal hex-button">
                                    <span className="hex-btn-bg"></span>
                                    <span className="relative z-10 flex items-center gap-2">Initialize Vault <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
                                </button>
                                <button className="btn-secondary hex-button outline">
                                    Enter Simulation
                                </button>
                            </div>
                        </div>

                        {/* Honeycomb Data Grid */}
                        <div className="honeycomb-layout-wrapper">
                                <h4 className="honeycomb-title"> T 4 S K F i e l d s </h4>
                            <div className="honeycomb-grid">
                                {/* Map personal active features into Hex Cells */}
                                {activeFeatures.map((feat, idx) => (
                                    <div className="hex-cell" key={feat.id}>
                                        <div className="hex-cell-inner">
                                            <div className={`hex-icon ${feat.iconClass}`}>
                                                {feat.iconSvg}
                                            </div>
                                            <div className="hc-content">
                                                <h5>{feat.title}</h5>
                                                <p className="clamp-2">{feat.desc}</p>
                                            </div>
                                            {/* Glitch Overlay for Personal Tech Theme */}
                                            <div className="hex-glitch-layer"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Processing Data Graphic (Isometric for Business, Tesseract for Personal) */}
                <div className={`data-cube-section ${viewMode === 'personal' ? 'theme-teal' : 'theme-amber'}`}>
                    <div className="cube-container">
                        {viewMode === 'business' ? (
                            <svg className="isometric-cube" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                                {/* Glowing Core Matrix (Backdrop) */}
                                <polygon className="core-glow" points="100,50 150,80 100,110 50,80" />
                                <polygon className="core-glow" points="50,80 100,110 100,170 50,140" />
                                <polygon className="core-glow" points="100,110 150,80 150,140 100,170" />

                                {/* Outer Wireframe Box */}
                                <path className="wire-edge pulse-slow" d="M100 20 L180 65 L100 110 L20 65 Z" fill="none" strokeWidth="2" strokeLinejoin="round"/>
                                <path className="wire-edge pulse-med" d="M20 65 L20 155 L100 200 L100 110 Z" fill="none" strokeWidth="2" strokeLinejoin="round"/>
                                <path className="wire-edge pulse-fast" d="M180 65 L180 155 L100 200 L100 110 Z" fill="none" strokeWidth="2" strokeLinejoin="round"/>

                                {/* Inner Structure Lines */}
                                <line className="wire-inner anim-dash-1" x1="100" y1="20" x2="100" y2="110" strokeWidth="1" strokeDasharray="4 4" />
                                <line className="wire-inner anim-dash-2" x1="20" y1="155" x2="100" y2="110" strokeWidth="1" strokeDasharray="4 4" />
                                <line className="wire-inner anim-dash-3" x1="180" y1="155" x2="100" y2="110" strokeWidth="1" strokeDasharray="4 4" />

                                {/* Orbiting Data Packets */}
                                <circle className="orbit-packet p1" cx="100" cy="20" r="3" />
                                <circle className="orbit-packet p2" cx="180" cy="155" r="3" />
                                <circle className="orbit-packet p3" cx="20" cy="155" r="3" />
                            </svg>
                        ) : (
                            /* --- COMPLEX 4D TESSERACT HYPERCUBE --- */
                            <svg className="tesseract-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                                <g className="tesser-group-outer">
                                    {/* Outer Hexagon (Projected 3D bounds) */}
                                    <polygon className="tesser-edge glow-edge" points="100,10 180,50 180,150 100,190 20,150 20,50" fill="none" strokeWidth="1.5" />
                                    {/* Inner Cube / Core Form */}
                                    <polygon className="tesser-core glow-core" points="100,50 150,75 100,100 50,75" />
                                    <polygon className="tesser-core glow-core" points="50,75 100,100 100,150 50,125" />
                                    <polygon className="tesser-core glow-core" points="100,100 150,75 150,125 100,150" />
                                </g>
                                
                                <g className="tesser-vertices">
                                    {/* Connecting Vertices between Outer Hex and Inner Core (4D Mapping paths) */}
                                    <line className="tesser-vert v1" x1="100" y1="10" x2="100" y2="50" strokeWidth="1" strokeDasharray="3 3"/>
                                    <line className="tesser-vert v2" x1="180" y1="50" x2="150" y2="75" strokeWidth="1" strokeDasharray="3 3"/>
                                    <line className="tesser-vert v3" x1="180" y1="150" x2="150" y2="125" strokeWidth="1" strokeDasharray="3 3"/>
                                    <line className="tesser-vert v4" x1="100" y1="190" x2="100" y2="150" strokeWidth="1" strokeDasharray="3 3"/>
                                    <line className="tesser-vert v5" x1="20" y1="150" x2="50" y2="125" strokeWidth="1" strokeDasharray="3 3"/>
                                    <line className="tesser-vert v6" x1="20" y1="50" x2="50" y2="75" strokeWidth="1" strokeDasharray="3 3"/>
                                </g>

                                {/* HyperData Nodes traveling along vertices */}
                                <circle className="hyper-node n-a" cx="100" cy="10" r="2.5" />
                                <circle className="hyper-node n-b" cx="180" cy="150" r="2.5" />
                                <circle className="hyper-node n-c" cx="20" cy="50" r="2.5" />
                            </svg>
                        )}
                        <div className="cube-shadow"></div>
                    </div>

                    <div className="cube-text-content">
                        <div className="processing-badge">
                            <span className="dot"></span>
                            PROCESSING {viewMode === 'business' ? 'ENTERPRISE DATA' : 'USER TELEMETRY'}
                        </div>
                        <h3>{viewMode === 'business' ? 'Multi-Tenant Processing Core' : 'Tesseract Pattern Aggregator'}</h3>
                        <p>
                            {viewMode === 'business' 
                                ? 'All workspace data is aggressively encrypted via end-to-end proprietary algorithms. The multi-tenant core dynamically balances load across global nodes, ensuring zero downtime while computing real-time kanban synchronization.'
                                : 'A local-first neural matrix recursively compiles your habits and actions into higher-dimensional insights. Your telemetry forms a hypercube geometry completely isolated from external servers, bounded only by strict biometric local decryption.'
                            }
                        </p>
                        <ul className="spec-list">
                            <li>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    {viewMode === 'business' ? <polyline points="20 6 9 17 4 12"></polyline> : <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>}
                                </svg> 
                                {viewMode === 'business' ? 'E2E Encryption Standards' : 'Fractal Local DB Storage'}
                            </li>
                            <li>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    {viewMode === 'business' ? <polyline points="20 6 9 17 4 12"></polyline> : <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>}
                                </svg> 
                                {viewMode === 'business' ? 'Global Edge Networking' : 'Isolated Core Computation'}
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Elaborated Footer Section */}
                <div className="footer-expanded-wrapper">
                    <div className="footer-top-line animated-d-line"></div>
                    <div className="footer-grid">

                        {/* Brand Column */}
                        <div className="f-col brand-col">
                            <div className="f-logo">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                                <span>T4SK</span>
                            </div>
                            <p className="f-desc">Super-flexible task management for modern teams to orchestrate their workflow with precision.</p>
                            <div className="social-icons">
                                <a href="#" aria-label="Twitter"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg></a>
                                <a href="#" aria-label="GitHub"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg></a>
                                <a href="#" aria-label="LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>
                            </div>
                    </>
                )}

                {/* Processing Data Graphic (Isometric for Business, Tesseract for Personal) */}
                <div className={`data-cube-section ${viewMode === 'personal' ? 'theme-teal' : 'theme-amber'}`}>
                    <div className="cube-container">
                        {viewMode === 'business' ? (
                            <svg className="isometric-cube" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                                {/* Glowing Core Matrix (Backdrop) */}
                                <polygon className="core-glow" points="100,50 150,80 100,110 50,80" />
                                <polygon className="core-glow" points="50,80 100,110 100,170 50,140" />
                                <polygon className="core-glow" points="100,110 150,80 150,140 100,170" />

                                {/* Outer Wireframe Box */}
                                <path className="wire-edge pulse-slow" d="M100 20 L180 65 L100 110 L20 65 Z" fill="none" strokeWidth="2" strokeLinejoin="round" />
                                <path className="wire-edge pulse-med" d="M20 65 L20 155 L100 200 L100 110 Z" fill="none" strokeWidth="2" strokeLinejoin="round" />
                                <path className="wire-edge pulse-fast" d="M180 65 L180 155 L100 200 L100 110 Z" fill="none" strokeWidth="2" strokeLinejoin="round" />

                                {/* Inner Structure Lines */}
                                <line className="wire-inner anim-dash-1" x1="100" y1="20" x2="100" y2="110" strokeWidth="1" strokeDasharray="4 4" />
                                <line className="wire-inner anim-dash-2" x1="20" y1="155" x2="100" y2="110" strokeWidth="1" strokeDasharray="4 4" />
                                <line className="wire-inner anim-dash-3" x1="180" y1="155" x2="100" y2="110" strokeWidth="1" strokeDasharray="4 4" />

                                {/* Orbiting Data Packets */}
                                <circle className="orbit-packet p1" cx="100" cy="20" r="3" />
                                <circle className="orbit-packet p2" cx="180" cy="155" r="3" />
                                <circle className="orbit-packet p3" cx="20" cy="155" r="3" />
                            </svg>
                        ) : (
                            /* --- COMPLEX 4D TESSERACT HYPERCUBE --- */
                            <svg className="tesseract-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                                <g className="tesser-group-outer">
                                    {/* Outer Hexagon (Projected 3D bounds) */}
                                    <polygon className="tesser-edge glow-edge" points="100,10 180,50 180,150 100,190 20,150 20,50" fill="none" strokeWidth="1.5" />
                                    {/* Inner Cube / Core Form */}
                                    <polygon className="tesser-core glow-core" points="100,50 150,75 100,100 50,75" />
                                    <polygon className="tesser-core glow-core" points="50,75 100,100 100,150 50,125" />
                                    <polygon className="tesser-core glow-core" points="100,100 150,75 150,125 100,150" />
                                </g>

                                <g className="tesser-vertices">
                                    {/* Connecting Vertices between Outer Hex and Inner Core (4D Mapping paths) */}
                                    <line className="tesser-vert v1" x1="100" y1="10" x2="100" y2="50" strokeWidth="1" strokeDasharray="3 3" />
                                    <line className="tesser-vert v2" x1="180" y1="50" x2="150" y2="75" strokeWidth="1" strokeDasharray="3 3" />
                                    <line className="tesser-vert v3" x1="180" y1="150" x2="150" y2="125" strokeWidth="1" strokeDasharray="3 3" />
                                    <line className="tesser-vert v4" x1="100" y1="190" x2="100" y2="150" strokeWidth="1" strokeDasharray="3 3" />
                                    <line className="tesser-vert v5" x1="20" y1="150" x2="50" y2="125" strokeWidth="1" strokeDasharray="3 3" />
                                    <line className="tesser-vert v6" x1="20" y1="50" x2="50" y2="75" strokeWidth="1" strokeDasharray="3 3" />
                                </g>

                                {/* HyperData Nodes traveling along vertices */}
                                <circle className="hyper-node n-a" cx="100" cy="10" r="2.5" />
                                <circle className="hyper-node n-b" cx="180" cy="150" r="2.5" />
                                <circle className="hyper-node n-c" cx="20" cy="50" r="2.5" />
                            </svg>
                        )}
                        <div className="cube-shadow"></div>
                    </div>

                    <div className="cube-text-content">
                        <div className="processing-badge">
                            <span className="dot"></span>
                            PROCESSING {viewMode === 'business' ? 'ENTERPRISE DATA' : 'USER TELEMETRY'}
                        </div>

                        {/* About Us Column */}
                        <div className="f-col">
                            <h4>About Us</h4>
                            <ul>
                                <li><a href="#">Our Story</a></li>
                                <li><a href="#">Careers</a></li>
                                <li><a href="#">Blog</a></li>
                                <li><a href="#">Press Kit</a></li>
                            </ul>
                        </div>

                        {/* Product Column */}
                        <div className="f-col">
                            <h4>Product</h4>
                            <ul>
                                <li><a href="#">Features</a></li>
                                <li><a href="#">Integrations</a></li>
                                <li><a href="#">Pricing</a></li>
                                <li><a href="#">Changelog</a></li>
                            </ul>
                        </div>

                        {/* Contact Column */}
                        <div className="f-col">
                            <h4>Contact</h4>
                            <ul className="contact-list">
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                    xenexashura@gmail.com
                                </li>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    Caloocan City, NCR Metro Manila.
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <span className="copyright">© 2026 T4SK Management. All rights reserved.</span>
                        <div className="legal-links">
                            <a href="#">Privacy Policy</a>
                            <a href="#">Terms of Service</a>
                            <a href="#">Cookie Policy</a>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Home;