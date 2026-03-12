import SkeletonBlock from "./SkeletonBlock";
import "../../scss/skeleton.scss";
// import "../../scss/Home.scss";

export default function HomeSkeleton() {
    return (
        <div className="home-comp">
            <div className="headline">
                <div className="line"></div>
                <div className="title-task"><h1 className="ti-h1"> T 4 S K </h1><h1 className="ti-h2"> T 4 S K </h1></div>
                <div className="line"></div>
            </div>

            <div className="hero-container skeleton-mode relative">

                <div className="hero-copy z-10">
                    {/* Toggle skeleton */}
                    <div className="mode-toggle" style={{ width: '240px', height: '44px', background: 'var(--home-card-custom-bg)' }}></div>

                    {/* Headline skeleton */}
                    <div style={{ width: '80%', height: '4rem', background: 'var(--home-card-custom-bg)', marginBottom: '1rem', borderRadius: '8px' }}></div>
                    <div style={{ width: '60%', height: '4rem', background: 'var(--home-card-custom-bg)', marginBottom: '2rem', borderRadius: '8px' }}></div>

                    {/* Subtitle skeleton */}
                    <div style={{ width: '90%', height: '1.2rem', background: 'var(--home-card-custom-bg)', marginBottom: '0.5rem', borderRadius: '4px' }}></div>
                    <div style={{ width: '75%', height: '1.2rem', background: 'var(--home-card-custom-bg)', borderRadius: '4px' }}></div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-8">
                        <SkeletonBlock style={{ width: 180, height: 48, borderRadius: 8 }} />
                        <SkeletonBlock style={{ width: 160, height: 48, borderRadius: 8 }} />
                    </div>
                </div>

                <div className="hero-features z-10 mt-8">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-start gap-3">
                            <SkeletonBlock style={{ width: 32, height: 32, borderRadius: 8 }} />
                            <div className="space-y-1">
                                <SkeletonBlock style={{ width: 120, height: 16 }} />
                                <SkeletonBlock style={{ width: 180, height: 12 }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* RIGHT COLUMN: STICKY PREVIEW (SKELETON MODE) */}
                <div className="hero-preview z-10 perspective-1000">
                    <div className="w-full h-full rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)] bg-[var(--home-bg-main)] shadow-2xl flex flex-col">

                        {/* Browser Header */}
                        <div className="h-9 bg-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.05)] flex items-center px-4 gap-2 flex-shrink-0">
                            <SkeletonBlock style={{ width: 12, height: 12, borderRadius: "50%" }} />
                            <SkeletonBlock style={{ width: 12, height: 12, borderRadius: "50%" }} />
                            <SkeletonBlock style={{ width: 12, height: 12, borderRadius: "50%" }} />
                            <div className="ml-4 flex-1 h-5 rounded bg-[rgba(255,255,255,0.05)] max-w-[400px]" />
                        </div>

                        {/* Inner Dashboard */}
                        <div className="flex-1 flex bg-[var(--home-bg-main)] overflow-hidden">

                            {/* Sidebar */}
                            <div className="w-14 border-r border-[rgba(255,255,255,0.05)] flex flex-col items-center py-4 gap-6 hidden sm:flex shrink-0">
                                <SkeletonBlock style={{ width: 32, height: 32, borderRadius: 8 }} />
                                <div className="flex flex-col gap-4 w-full items-center">
                                    <SkeletonBlock style={{ width: 24, height: 24, borderRadius: 4 }} />
                                    <SkeletonBlock style={{ width: 24, height: 24, borderRadius: 4 }} />
                                    <SkeletonBlock style={{ width: 24, height: 24, borderRadius: 4 }} />
                                </div>
                                <div className="mt-auto">
                                    <SkeletonBlock style={{ width: 32, height: 32, borderRadius: "50%" }} />
                                </div>
                            </div>

                            {/* Main Board Area */}
                            <div className="flex-1 flex flex-col min-w-0">
                                {/* Topbar */}
                                <div className="h-14 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between px-6 shrink-0">
                                    <SkeletonBlock style={{ width: 150, height: 20 }} />
                                    <div className="flex gap-2">
                                        <SkeletonBlock style={{ width: 24, height: 24, borderRadius: "50%" }} />
                                        <SkeletonBlock style={{ width: 24, height: 24, borderRadius: "50%" }} />
                                        <SkeletonBlock style={{ width: 60, height: 24, borderRadius: 6 }} />
                                    </div>
                                </div>

                                {/* Toolbar */}
                                <div className="h-12 border-b border-[rgba(255,255,255,0.05)] flex items-center px-6 gap-4 shrink-0">
                                    <SkeletonBlock style={{ width: 60, height: 20 }} />
                                    <SkeletonBlock style={{ width: 60, height: 20 }} />
                                    <SkeletonBlock style={{ width: 60, height: 20 }} />
                                </div>

                                {/* Columns */}
                                <div className="flex-1 p-6 flex gap-6 overflow-hidden">
                                    {[1, 2, 3].map((col) => (
                                        <div key={col} className={`flex-1 min-w-[180px] max-w-[240px] flex flex-col gap-3 ${col === 3 ? 'hidden lg:flex' : ''}`}>
                                            <div className="flex justify-between mb-1">
                                                <SkeletonBlock style={{ width: 80, height: 14 }} />
                                                <SkeletonBlock style={{ width: 20, height: 14 }} />
                                            </div>
                                            {/* Cards */}
                                            <SkeletonBlock style={{ width: "100%", height: 120, borderRadius: 8 }} />
                                            <SkeletonBlock style={{ width: "100%", height: 100, borderRadius: 8 }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}