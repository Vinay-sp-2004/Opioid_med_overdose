import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home,
  User,
  LogIn,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Info,
  Moon,
  Sun,
  LogOut,
  AlertTriangle
} from "lucide-react";

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) setIsLoggedIn(true);

    // Load theme
    const isDark = localStorage.getItem("theme") === "dark";
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    // Sync login changes between tabs
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem("user"));
    };
    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const toggleDarkMode = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");

    if (newDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    window.location.href = "/login";
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const checkLoginStatus = () => {
    return !!localStorage.getItem("user");
  };

  const userIsLoggedIn = checkLoginStatus();

  return (
    <>
      {/* NAVBAR */}
      <nav className="bg-white shadow-sm border-b border-gray-100 dark:bg-gray-800 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* LEFT */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="flex items-center">
                  <span className="text-xl font-heading font-bold text-cyan-600 dark:text-cyan-400">
                    MedSafety
                  </span>
                </Link>
              </div>

              <div className="hidden sm:ml-6 sm:flex sm:space-x-6">
                {/* Home */}
                <Link
                  to="/"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${location.pathname === "/"
                      ? "border-cyan-600 text-gray-900 dark:text-gray-100 dark:border-cyan-400"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Link>

                {/* Logged-in only links */}
                {userIsLoggedIn && (
                  <>
                    <Link
                      to="/dashboard"
                      className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${location.pathname === "/dashboard"
                          ? "border-cyan-600 text-gray-900 dark:text-gray-100 dark:border-cyan-400"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>

                    <Link
                      to="/history"
                      className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${location.pathname === "/history"
                          ? "border-cyan-600 text-gray-900 dark:text-gray-100 dark:border-cyan-400"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                      <HistoryIcon className="mr-2 h-4 w-4" />
                      History
                    </Link>

                    <Link
                      to="/settings"
                      className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${location.pathname === "/settings"
                          ? "border-cyan-600 text-gray-900 dark:text-gray-100 dark:border-cyan-400"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Settings
                    </Link>

                    <Link
                      to="/profile"
                      className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${location.pathname === "/profile"
                          ? "border-cyan-600 text-gray-900 dark:text-gray-100 dark:border-cyan-400"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </>
                )}

                {/* About */}
                <Link
                  to="/about"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${location.pathname === "/about"
                      ? "border-cyan-600 text-gray-900 dark:text-gray-100 dark:border-cyan-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                >
                  <Info className="mr-2 h-4 w-4" />
                  About
                </Link>

                {/* Explanation */}
                <Link
                  to="/explanation"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${location.pathname === "/explanation"
                      ? "border-cyan-600 text-gray-900 dark:text-gray-100 dark:border-cyan-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                >
                  <Info className="mr-2 h-4 w-4" />
                  How It Works
                </Link>
              </div>
            </div>

            {/* RIGHT */}
            <div className="hidden sm:flex sm:items-center space-x-4">
              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="rounded-full"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5 text-gray-300" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-700" />
                )}
              </Button>

              {/* Logout / Login */}
              {userIsLoggedIn ? (
                <Button
                  variant="outline"
                  className="border-gray-300 dark:border-gray-600 dark:text-gray-200"
                  onClick={confirmLogout}
                >
                  Logout
                </Button>
              ) : (
                <div className="flex space-x-4">
                  <Button asChild variant="ghost" className="text-gray-600 dark:text-gray-300">
                    <Link to="/login">
                      <LogIn className="mr-2 h-4 w-4" />
                      Log in
                    </Link>
                  </Button>
                  <Button asChild className="bg-cyan-600 hover:bg-cyan-700">
                    <Link to="/signup">Sign up</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ======================= */}
      {/* LOGOUT CONFIRM MODAL */}
      {/* ======================= */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm animate-fade-in">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full mr-3">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-300" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Confirm Logout
              </h2>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to log out? You will need to sign in again to continue.
            </p>

            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={cancelLogout}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white flex items-center"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
