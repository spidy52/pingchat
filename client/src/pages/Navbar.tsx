import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import avatar from "../public/avatar.png";

export default function Navbar() {
  const { authUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="bg-base-200 p-4 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <h1
          className="text-xl font-bold cursor-pointer text-base-content"
          onClick={() => navigate("/")}
        >
          PingChat
        </h1>

        {/* Profile Section */}
        <div className="relative" ref={dropdownRef}>
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
          
            <img
              src={authUser?.avatar || avatar}
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-base-300 hover:scale-105 transition-transform"
            />
          </div>

          {/* Dropdown Popout */}
          {isOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-base-100 shadow-lg rounded-lg border border-base-300 p-3 z-50 animate-fadeIn">
              <div className="flex items-center gap-3 border-b border-base-300 pb-3">
                <img
                  src={authUser?.avatar || avatar}
                  alt="User"
                  className="w-10 h-10 rounded-full object-cover border"
                />
                <div>
                  <p className="text-sm font-semibold text-base-content">
                    {authUser?.displayName || "No Name"}
                  </p>
                  <p className="text-xs text-base-content/60">
                    @{authUser?.username || "username"}
                  </p>
                </div>
              </div>

              {/* Menu Buttons */}
              <div className="mt-3 space-y-2">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 rounded-md hover:bg-base-200 text-sm text-base-content transition"
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/profile");
                  }}
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>

                <button
                  className="flex w-full items-center gap-2 px-3 py-2 rounded-md hover:bg-error/20 text-error text-sm transition"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
