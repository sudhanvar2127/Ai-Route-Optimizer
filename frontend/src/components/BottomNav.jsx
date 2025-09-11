// src/components/BottomNav.jsx
import { Home, Map, Bookmark, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const BottomNav = () => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t shadow-md flex justify-around items-center py-2 z-[1000]">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center text-sm ${
            isActive ? "text-blue-600" : "text-gray-600"
          }`
        }
      >
        <Home className="w-6 h-6" />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/map"
        className={({ isActive }) =>
          `flex flex-col items-center text-sm ${
            isActive ? "text-blue-600" : "text-gray-600"
          }`
        }
      >
        <Map className="w-6 h-6" />
        <span>Map</span>
      </NavLink>

      <NavLink
        to="/saved"
        className={({ isActive }) =>
          `flex flex-col items-center text-sm ${
            isActive ? "text-blue-600" : "text-gray-600"
          }`
        }
      >
        <Bookmark className="w-6 h-6" />
        <span>Saved</span>
      </NavLink>

      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `flex flex-col items-center text-sm ${
            isActive ? "text-blue-600" : "text-gray-600"
          }`
        }
      >
        <User className="w-6 h-6" />
        <span>Profile</span>
      </NavLink>
    </div>
  );
};

export default BottomNav;