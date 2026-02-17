import SkeletonBlock from "./SkeletonBlock";
import "../../scss/skeleton.scss";
// import "../../scss/Home.scss";

export default function HomeSkeleton() {
    return (
        <div className="home-comp content-banner w-full min-h-screen flex items-center justify-center relative pt-20 pb-10 px-4 md:px-8 bg-[var(--home-bg-main)]">
            {/* Background Decor */}
            <div className="outside-show-content w-full h-full absolute top-0 left-0 z-0 overflow-hidden pointer-events-none">
                <div className="ellipse elip1 opacity-50"></div>
                <div className="ellipse elip2 opacity-50"></div>
            </div>

            <div className="z-10 w-full max-w-[1400px] flex flex-col lg:flex-row items-center gap-12 lg:gap-8">

                {/* 1. INTRODUCTION SKELETON */}
                <div className="flex-1 w-full max-w-[500px] flex flex-col items-center lg:items-start space-y-6">
                    {/* Badge */}
                    <SkeletonBlock style={{ width: 120, height: 24, borderRadius: 9999 }} />

                    {/* Title */}
                    <div className="space-y-3 w-full flex flex-col items-center lg:items-start">
                        <SkeletonBlock style={{ width: "90%", height: 48, borderRadius: 8 }} />
                        <SkeletonBlock style={{ width: "70%", height: 48, borderRadius: 8 }} />
                    </div>

                    {/* Subtitle */}
                    <div className="space-y-2 w-full flex flex-col items-center lg:items-start">
                        <SkeletonBlock style={{ width: "100%", height: 16 }} />
                        <SkeletonBlock style={{ width: "95%", height: 16 }} />
                        <SkeletonBlock style={{ width: "80%", height: 16 }} />
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2">
                        <SkeletonBlock style={{ width: 160, height: 48, borderRadius: 8 }} />
                        <SkeletonBlock style={{ width: 160, height: 48, borderRadius: 8 }} />
                    </div>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-6 w-full max-w-md">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-start gap-3">
                                <SkeletonBlock style={{ width: 24, height: 24, borderRadius: 4 }} />
                                <div className="space-y-1">
                                    <SkeletonBlock style={{ width: 80, height: 14 }} />
                                    <SkeletonBlock style={{ width: 60, height: 10 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. VISUAL SKELETON (Browser Window) */}
                <div className="flex-1 w-full max-w-[800px]">
                    <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)] bg-[var(--home-bg-main)] shadow-2xl">

                        {/* Browser Header */}
                        <div className="h-9 bg-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.05)] flex items-center px-4 gap-2">
                            <SkeletonBlock style={{ width: 12, height: 12, borderRadius: "50%" }} />
                            <SkeletonBlock style={{ width: 12, height: 12, borderRadius: "50%" }} />
                            <SkeletonBlock style={{ width: 12, height: 12, borderRadius: "50%" }} />
                            <div className="ml-4 flex-1 h-5 rounded bg-[rgba(255,255,255,0.05)] max-w-[400px]" />
                        </div>

                        {/* Inner Dashboard */}
                        <div className="h-[500px] md:h-[600px] flex">

                            {/* Sidebar */}
                            <div className="w-14 border-r border-[rgba(255,255,255,0.05)] flex flex-col items-center py-4 gap-6 hidden sm:flex">
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
                                <div className="h-14 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between px-6">
                                    <SkeletonBlock style={{ width: 150, height: 20 }} />
                                    <div className="flex gap-2">
                                        <SkeletonBlock style={{ width: 24, height: 24, borderRadius: "50%" }} />
                                        <SkeletonBlock style={{ width: 24, height: 24, borderRadius: "50%" }} />
                                        <SkeletonBlock style={{ width: 60, height: 24, borderRadius: 6 }} />
                                    </div>
                                </div>

                                {/* Toolbar */}
                                <div className="h-12 border-b border-[rgba(255,255,255,0.05)] flex items-center px-6 gap-4">
                                    <SkeletonBlock style={{ width: 60, height: 20 }} />
                                    <SkeletonBlock style={{ width: 60, height: 20 }} />
                                    <SkeletonBlock style={{ width: 60, height: 20 }} />
                                </div>

                                {/* Columns */}
                                <div className="flex-1 p-6 flex gap-6 overflow-hidden">
                                    {[1, 2, 3].map((col) => (
                                        <div key={col} className={`flex-1 min-w-[200px] flex flex-col gap-3 ${col === 3 ? 'hidden md:flex' : ''}`}>
                                            <div className="flex justify-between mb-1">
                                                <SkeletonBlock style={{ width: 80, height: 14 }} />
                                                <SkeletonBlock style={{ width: 20, height: 14 }} />
                                            </div>
                                            {/* Cards */}
                                            <SkeletonBlock style={{ width: "100%", height: 100, borderRadius: 8 }} />
                                            <SkeletonBlock style={{ width: "100%", height: 80, borderRadius: 8 }} />
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