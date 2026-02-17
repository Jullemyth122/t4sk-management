import { useState, useEffect } from "react";
import "../scss/home.scss";
import IconH1 from '../icons/IconH1';
import IconH2 from '../icons/IconH2';
import HomeSkeleton from "./loaders/HomeSkeleton";

const Home = ({ simulateLoading = false }) => {
    const [loading, setLoading] = useState(Boolean(simulateLoading));
    

    useEffect(() => {
        if (!simulateLoading) return;
        const t = setTimeout(() => setLoading(false), 2000); // demo 1s
        return () => clearTimeout(t);
    }, [simulateLoading]);

    if (loading) return <HomeSkeleton/>;

    return (
        <div className='home-comp'>
            <div className="headline">
                <div className="line"></div>
                <div className="title-task">
                    <h1 className="ti-h1"> T 4 S K </h1>    
                    <h1 className='ti-h2'> T 4 S K </h1>    
                </div>
                <div className="line"></div>
            </div>             
            <div className="content-banner w-full min-h-screen flex items-center justify-center relative pt-20 pb-10 px-4 md:px-8">
                {/* Background Decor */}
                <div className="outside-show-content w-full h-full absolute top-0 left-0 z-0 overflow-hidden pointer-events-none">
                    <div className="ellipse elip1 opacity-50"></div>
                    <div className="ellipse elip2 opacity-50"></div>
                </div>

                <div className="z-10 w-full max-w-[1400px] flex flex-col lg:flex-row items-center gap-12 lg:gap-8">

                    {/* 1. INTRODUCTION (Text & Value) */}
                    <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start space-y-6 lg:max-w-[500px]">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <span className="text-xs font-medium text-[var(--home-text-muted)] tracking-wide uppercase">System v2.0 Live</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[var(--home-text-main)]">
                            Orchestrate Your Life. <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600">Power Your Business.</span>
                        </h1>

                        <p className="text-lg text-[var(--home-text-muted)] leading-relaxed max-w-xl">
                            The unified workspace where personal goals meet professional projects. Experience real-time collaboration, advanced boards, and seamless organization in one powerful platform.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2">
                            <button className="px-8 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-semibold shadow-lg shadow-amber-500/25 transition-all hover:-translate-y-0.5">
                                Get Started Free
                            </button>
                            <button className="px-8 py-3 rounded-lg border border-[var(--home-card-border)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] text-[var(--home-text-main)] font-medium transition-all flex items-center justify-center gap-2">
                                <span>▶</span> Watch Demo
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-6 text-left w-full max-w-md">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">⚡</div>
                                <div>
                                    <h4 className="text-sm font-bold text-[var(--home-text-main)]">Real-Time Sync</h4>
                                    <p className="text-xs text-[var(--home-text-muted)]">Instant updates across all devices</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 w-5 h-5 rounded bg-amber-500/10 flex items-center justify-center text-amber-500">🎯</div>
                                <div>
                                    <h4 className="text-sm font-bold text-[var(--home-text-main)]">Project Tracking</h4>
                                    <p className="text-xs text-[var(--home-text-muted)]">Visual boards, lists & timelines</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 w-5 h-5 rounded bg-pink-500/10 flex items-center justify-center text-pink-400">🛡️</div>
                                <div>
                                    <h4 className="text-sm font-bold text-[var(--home-text-main)]">Enterprise Security</h4>
                                    <p className="text-xs text-[var(--home-text-muted)]">Bank-grade data protection</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 w-5 h-5 rounded bg-teal-500/10 flex items-center justify-center text-teal-400">🤝</div>
                                <div>
                                    <h4 className="text-sm font-bold text-[var(--home-text-main)]">Team Collaboration</h4>
                                    <p className="text-xs text-[var(--home-text-muted)]">Built-in chat and file sharing</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. VISUAL (Browser Window Dashboard) */}
                    <div className="flex-1 w-full max-w-[800px] perspective-1000">
                        {/* Browser Window Frame */}
                        <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)] bg-[var(--home-bg-main)] shadow-2xl transform transition-transform duration-500 hover:scale-[1.01]">

                            {/* Browser Header */}
                            <div className="h-9 bg-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.05)] flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                <div className="ml-4 flex-1 h-5 rounded bg-[rgba(255,255,255,0.05)] max-w-[400px] border border-[rgba(255,255,255,0.02)] flex items-center px-3">
                                    <span className="text-[10px] text-[var(--home-text-muted)] opacity-60">app.t4sk.com/dashboard/product-launch</span>
                                </div>
                            </div>

                            {/* Inner Dashboard */}
                            <div className="h-[500px] md:h-[600px] flex text-[var(--home-text-main)] bg-[var(--home-bg-main)]">

                                {/* Mock Sidebar */}
                                <div className="w-14 border-r border-[rgba(255,255,255,0.05)] flex flex-col items-center py-4 gap-6 bg-[rgba(255,255,255,0.01)] hidden sm:flex">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center font-bold text-white text-xs shadow-lg shadow-amber-500/20">T</div>
                                    <div className="flex flex-col gap-4 w-full items-center">
                                        <div className="p-2 rounded-md bg-[rgba(255,255,255,0.1)] text-[var(--home-text-main)] cursor-pointer"><span className="text-lg block">▦</span></div>
                                        <div className="p-2 rounded-md hover:bg-[rgba(255,255,255,0.05)] text-[var(--home-text-muted)] cursor-pointer"><span className="text-lg block">☰</span></div>
                                        <div className="p-2 rounded-md hover:bg-[rgba(255,255,255,0.05)] text-[var(--home-text-muted)] cursor-pointer"><span className="text-lg block">◎</span></div>
                                    </div>
                                    <div className="mt-auto w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-[rgba(255,255,255,0.1)]"></div>
                                </div>

                                {/* Main Board Area */}
                                <div className="flex-1 flex flex-col min-w-0 bg-[rgba(255,255,255,0.005)]">
                                    {/* Topbar */}
                                    <div className="h-14 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between px-4 md:px-6">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-sm flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                Product Launch v2.0
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)] text-[var(--home-text-muted)]">Public</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-600 border border-[var(--home-bg-main)]"></div>
                                                <div className="w-6 h-6 rounded-full bg-gray-500 border border-[var(--home-bg-main)]"></div>
                                                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-[10px] text-white border border-[var(--home-bg-main)]">+3</div>
                                            </div>
                                            <button className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors">Share</button>
                                        </div>
                                    </div>

                                    {/* Toolbar */}
                                    <div className="h-12 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between px-4 md:px-6 overflow-x-auto hide-scrollbar">
                                        <div className="flex items-center gap-4 min-w-max">
                                            <div className="flex items-center text-xs font-medium text-[var(--home-text-muted)] gap-4">
                                                <span className="text-[var(--home-text-main)] border-b-2 border-amber-500 py-3.5">Board</span>
                                                <span className="hover:text-[var(--home-text-main)] cursor-pointer">List</span>
                                                <span className="hover:text-[var(--home-text-main)] cursor-pointer">Timeline</span>
                                                <span className="hover:text-[var(--home-text-main)] cursor-pointer">Calendar</span>
                                            </div>
                                            <div className="h-4 w-[1px] bg-[rgba(255,255,255,0.1)]"></div>
                                            <div className="flex items-center gap-2 text-xs text-[var(--home-text-muted)]">
                                                <span>Filter:</span>
                                                <span className="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(255,255,255,0.05)] text-[var(--home-text-main)]">My Tasks ✕</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Board Columns */}
                                    <div className="flex-1 p-4 md:p-6 overflow-hidden flex gap-4 md:gap-6 bg-[rgba(0,0,0,0.02)]">

                                        {/* Column 1 */}
                                        <div className="flex-1 min-w-[200px] flex flex-col gap-3">
                                            <div className="flex justify-between items-center px-1 mb-1">
                                                <span className="text-xs font-bold text-[var(--home-text-muted)] uppercase tracking-wider">Backlog</span>
                                                <span className="text-[10px] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded text-[var(--home-text-muted)]">4</span>
                                            </div>
                                            <div className="p-3 rounded-lg border border-[var(--home-card-border)] bg-[var(--home-card-bg-start)] shadow-sm hover:translate-y-[-2px] transition-transform">
                                                <div className="flex gap-2 mb-2">
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-teal-400 bg-teal-500/10 border border-teal-500/20">Planning</span>
                                                </div>
                                                <h5 className="text-sm font-medium mb-2">Q4 Roadmap Planning</h5>
                                                <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.05)]">
                                                    <div className="flex items-center gap-2 text-[10px] text-[var(--home-text-muted)]">
                                                        <span>Oct 24</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg border border-[var(--home-card-border)] bg-[var(--home-card-bg-start)] shadow-sm hover:translate-y-[-2px] transition-transform">
                                                <h5 className="text-sm font-medium mb-2">Competitor Analysis</h5>
                                                <div className="w-full h-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden mb-2">
                                                    <div className="h-full w-[40%] bg-blue-500"></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2 */}
                                        <div className="flex-1 min-w-[200px] flex flex-col gap-3">
                                            <div className="flex justify-between items-center px-1 mb-1">
                                                <span className="text-xs font-bold text-[var(--home-text-muted)] uppercase tracking-wider">In Progress</span>
                                                <span className="text-[10px] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded text-[var(--home-text-muted)]">2</span>
                                            </div>

                                            {/* Active Card */}
                                            <div className="p-3 rounded-lg border border-amber-500/30 bg-[var(--home-card-bg-start)] shadow-[0_4px_12px_rgba(245,158,11,0.15)] relative">
                                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
                                                <div className="flex gap-2 mb-2">
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-amber-400 bg-amber-500/10 border border-amber-500/20">High Priority</span>
                                                </div>
                                                <h5 className="text-sm font-medium mb-2">Implement Auth Flow</h5>
                                                <p className="text-xs text-[var(--home-text-muted)] mb-3 line-clamp-2">Integrate Firebase auth with custom hooks for personal/business separation.</p>
                                                <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.05)]">
                                                    <div className="flex -space-x-1">
                                                        <div className="w-5 h-5 rounded-full bg-gray-600 border border-[var(--home-card-bg-start)]"></div>
                                                        <div className="w-5 h-5 rounded-full bg-gray-500 border border-[var(--home-card-bg-start)]"></div>
                                                    </div>
                                                    <span className="text-[10px] text-amber-400 font-medium">Due Today</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 3 (Hidden on mobile) */}
                                        <div className="flex-1 min-w-[200px] hidden md:flex flex-col gap-3">
                                            <div className="flex justify-between items-center px-1 mb-1">
                                                <span className="text-xs font-bold text-[var(--home-text-muted)] uppercase tracking-wider">In Review</span>
                                                <span className="text-[10px] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded text-[var(--home-text-muted)]">1</span>
                                            </div>
                                            <div className="p-3 rounded-lg border border-[var(--home-card-border)] bg-[var(--home-card-bg-start)] shadow-sm opacity-80">
                                                <h5 className="text-sm font-medium mb-2">Update API Docs</h5>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] text-[var(--home-text-muted)] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">PR #204</span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>     
            </div>     
        </div>
    )
}

export default Home