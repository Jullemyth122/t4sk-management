import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Navbar from './navigation/Navbar';
import NavbarLoading from './navigation/NavbarLoading';
import Home from './components/Home';
const Task = () => {

    const navigation = useNavigate();
    const location = useLocation();

    const isLoading = navigation.state == "loading"
    const isNavHomePath = location.pathname === "/"


    return (
        <div className="task-ft_lay_comp w-full">
            {isLoading ? ( <NavbarLoading/> ) : ( <Navbar/> )}      
            <main>
                <Outlet/>
                {isNavHomePath && <Home  simulateLoading={true}/>}
            </main>

        </div>
    )
}

export default Task