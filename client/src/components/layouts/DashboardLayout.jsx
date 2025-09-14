import { useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-[98%] mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center">
                <img src="/logo.png" alt="Logo" className="h-6 w-auto" />
                <span className="ml-2 text-lg font-bold text-gray-900">
                  Doom Kanban
                </span>
              </Link>
            </div>

            {/* Navigation + User */}
            <div className="flex items-center space-x-4">
              {/* Boards Link */}
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-gray-900 px-2 py-1 rounded-md text-sm font-medium flex items-center"
              >
                Boards
              </Link>

              {/* Small Vertical Divider */}
              <div className="h-5 w-px bg-gray-300"></div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 text-sm focus:outline-none"
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:block text-gray-700 text-sm">
                    {user?.name}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5">
                    <div className="px-3 py-2 text-xs text-gray-500 border-b">
                      {user?.email}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
