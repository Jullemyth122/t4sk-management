import SkeletonBlock from "./SkeletonBlock";
import "../../scss/skeleton.scss";

export default function HomeSkeleton() {
    return (
        <div className="home-comp skeleton-home">
            <div className="headline">
                <SkeletonBlock className="line" style={{ height: 4, width: "calc(50% - 150px)", borderRadius: 5 }} />
                <div className="title-task">
                    <SkeletonBlock className="ti-h1" style={{ width: 300, height: 60, marginBottom: 0 }} />
                    <SkeletonBlock className="ti-h2" style={{ width: 300, height: 60, position: "absolute", top: 0 }} />
                </div>
                <SkeletonBlock className="line" style={{ height: 4, width: "calc(50% - 150px)", borderRadius: 5 }} />
            </div>
            <div className="content-banner w-full flex items-end justify-center">
                <div className="outside-show-content w-full flex items-end justify-center relative">
                    <div className="ellipse elip1"></div> {/* Keep as is for layout, no shimmer needed */}
                    <div className="ellipse elip2"></div> {/* Keep as is for layout, no shimmer needed */}
                    <div className="show-content flex items-center justify-evenly relative">
                        <div className="ellipse elip1"></div> {/* Keep as is */}
                        <div className="ellipse elip2"></div> {/* Keep as is */}
                        <div className="content1">
                            <div className="text-title flex items-center justify-between">
                                <SkeletonBlock style={{ width: "60%", height: 28 }} />
                                <SkeletonBlock style={{ width: 24, height: 24, borderRadius: "50%" }} /> {/* Icon placeholder */}
                            </div>
                            <div className="subtask-scroll">
                                {/* Repeat for two subtasks */}
                                <div className="subtask-section p-4">
                                    <div className="subtask-comp">
                                        <div className="subt-title flex items-center justify-between p-2">
                                            <SkeletonBlock style={{ width: "50%", height: 20 }} />
                                            <SkeletonBlock style={{ width: 20, height: 20, borderRadius: "50%" }} /> {/* Icon */}
                                        </div>
                                        <SkeletonBlock className="subt-line" style={{ height: 1.75, width: "100%", borderRadius: 5 }} />
                                        <div className="descrip-task p-2">
                                            <SkeletonBlock style={{ width: "80%", height: 16, marginBottom: 8 }} />
                                            <SkeletonBlock style={{ width: "100%", height: 12, marginBottom: 4 }} />
                                            <SkeletonBlock style={{ width: "100%", height: 12, marginBottom: 4 }} />
                                            <SkeletonBlock style={{ width: "70%", height: 12 }} />
                                        </div>
                                        <SkeletonBlock className="subt-line" style={{ height: 1.75, width: "100%", borderRadius: 5 }} />
                                        <div className="subtask-notes p-2 flex items-center justify-evenly gap-3">
                                            <div className="date-timeline flex items-center justify-evenly gap-3">
                                                <SkeletonBlock style={{ width: 80, height: 16 }} />
                                                <SkeletonBlock style={{ width: 100, height: 16 }} />
                                            </div>
                                            <div className="prio-level">
                                                <SkeletonBlock style={{ width: 50, height: 14 }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="subtask-section p-4">
                                    <div className="subtask-comp">
                                        <div className="subt-title flex items-center justify-between p-2">
                                            <SkeletonBlock style={{ width: "50%", height: 20 }} />
                                            <SkeletonBlock style={{ width: 20, height: 20, borderRadius: "50%" }} /> {/* Icon */}
                                        </div>
                                        <SkeletonBlock className="subt-line" style={{ height: 1.75, width: "100%", borderRadius: 5 }} />
                                        <div className="descrip-task p-2">
                                            <SkeletonBlock style={{ width: "80%", height: 16, marginBottom: 8 }} />
                                            <SkeletonBlock style={{ width: "100%", height: 12, marginBottom: 4 }} />
                                            <SkeletonBlock style={{ width: "100%", height: 12, marginBottom: 4 }} />
                                            <SkeletonBlock style={{ width: "70%", height: 12 }} />
                                        </div>
                                        <SkeletonBlock className="subt-line" style={{ height: 1.75, width: "100%", borderRadius: 5 }} />
                                        <div className="subtask-notes p-2 flex items-center justify-evenly gap-3">
                                            <div className="date-timeline flex items-center justify-evenly gap-3">
                                                <SkeletonBlock style={{ width: 80, height: 16 }} />
                                                <SkeletonBlock style={{ width: 100, height: 16 }} />
                                            </div>
                                            <div className="prio-level">
                                                <SkeletonBlock style={{ width: 50, height: 14 }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="content2 px-3 py-3">
                            {/* Repeat for four task-secs */}
                            <div className="task-sec h-12 w-full flex items-center justify-between">
                                <SkeletonBlock style={{ width: "70%", height: 20 }} />
                                <div className="svg-icon">
                                    <SkeletonBlock style={{ width: 20, height: 20, borderRadius: "50%" }} /> {/* Icon */}
                                </div>
                            </div>
                            <div className="task-sec h-12 w-full flex items-center justify-between">
                                <SkeletonBlock style={{ width: "70%", height: 20 }} />
                                <div className="svg-icon">
                                    <SkeletonBlock style={{ width: 20, height: 20, borderRadius: "50%" }} /> {/* Icon */}
                                </div>
                            </div>
                            <div className="task-sec h-12 w-full flex items-center justify-between">
                                <SkeletonBlock style={{ width: "70%", height: 20 }} />
                                <div className="svg-icon">
                                    <SkeletonBlock style={{ width: 20, height: 20, borderRadius: "50%" }} /> {/* Icon */}
                                </div>
                            </div>
                            <div className="task-sec h-12 w-full flex items-center justify-between">
                                <SkeletonBlock style={{ width: "70%", height: 20 }} />
                                <div className="svg-icon">
                                    <SkeletonBlock style={{ width: 20, height: 20, borderRadius: "50%" }} /> {/* Icon */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}