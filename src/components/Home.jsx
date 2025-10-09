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
            <div className="content-banner w-full flex items-end justify-center"> 
                <div className="outside-show-content w full flex items-end justify-center relative">
                    <div className="ellipse elip1"></div>
                    <div className="ellipse elip2"></div>
                    <div className="show-content flex items-center justify-evenly relative">
                        
                        <div className="ellipse elip1"></div>
                        <div className="ellipse elip2"></div>

                        <div className="content1">
                            <div className="text-title">
                                <h1 className='text-xl'> Task Name </h1>
                                <IconH1/>
                            </div>
                            <div className="subtask-scroll">
                                <div className="subtask-section p-4">
                                    <div className="subtask-comp">
                                        <div className="subt-title flex items-center justify-between p-2">
                                            <h3> Subtask </h3>
                                            <IconH2/>                             
                                        </div>
                                        <div className="subt-line"></div>
                                        <div className="descrip-task p-2">
                                            <h1> Description Task </h1>
                                            <br />
                                            <p> Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.  </p>
                                        </div>
                                        <div className="subt-line"></div>
                                        <div className="subtask-notes p-2 flex items-center justify-evenly gap-3">
                                            <div className="date-timeline flex items-center justify-evenly gap-3">
                                                <h3> Oct 1, 2023 </h3>
                                                <h3> 1AM to 5PM </h3>
                                            </div>
                                            <div className="prio-level">
                                                <h5> High </h5>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="subtask-section p-4">
                                    <div className="subtask-comp">
                                        <div className="subt-title flex items-center justify-between p-2">
                                            <h3> Subtask </h3>
                                            <IconH2/>                                   
                                        </div>
                                        <div className="subt-line"></div>
                                        <div className="descrip-task p-2">
                                            <h1> Description Task </h1>
                                            <br />
                                            <p> Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.  </p>
                                        </div>
                                        <div className="subt-line"></div>
                                        <div className="subtask-notes p-2 flex items-center justify-evenly gap-3">
                                            <div className="date-timeline flex items-center justify-evenly gap-3">
                                                <h3> Oct 1, 2023 </h3>
                                                <h3> 1AM to 5PM </h3>
                                            </div>
                                            <div className="prio-level">
                                                <h5> High </h5>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div className="content2 px-3 py-3">
                            <div className="task-sec h-12 w-full flex items-center justify-between">
                                <h4> Task Name </h4>
                                <div className="svg-icon">
                                    <IconH2/>
                                </div>
                            </div>
                            <div className="task-sec h-12 w-full flex items-center justify-between">
                                <h4> Task Name </h4>
                                <div className="svg-icon">
                                    <IconH2/>
                                </div>
                            </div>
                            <div className="task-sec h-12 w-full flex items-center justify-between">
                                <h4> Task Name </h4>
                                <div className="svg-icon">
                                    <IconH2/>
                                </div>
                            </div>
                            <div className="task-sec h-12 w-full flex items-center justify-between">
                                <h4> Task Name </h4>
                                <div className="svg-icon">
                                    <IconH2/>
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