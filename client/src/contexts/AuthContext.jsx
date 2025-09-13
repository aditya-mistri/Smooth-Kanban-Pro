// client/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import socketService from "../services/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  /* ------------------------
     🔄 Initialize Auth State
  ------------------------- */
  useEffect(() => {
    const init = async () => {
      try {
        if (token) {
          // Validate token with backend
          const { data } = await api.getProfile();
          setUser(data);
          socketService.connect(token); // ✅ pass token
        }
      } catch (err) {
        console.error("❌ Token validation failed:", err);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  /* ------------------------
     🔐 Login
  ------------------------- */
  const handleLogin = async (credentials) => {
    try {
      const { data } = await api.login(credentials);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      socketService.connect(data.token); // ✅ pass token
    } catch (err) {
      console.error("❌ Login failed:", err);
      throw err; // rethrow so Login component can catch and show toast
    }
  };

  /* ------------------------
     📝 Signup
  ------------------------- */
  const handleSignup = async (userData) => {
    try {
      const { data } = await api.signup(userData);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      socketService.connect(data.token); // ✅ pass token
    } catch (err) {
      console.error("❌ Signup failed:", err);
      throw err; // rethrow for toast display
    }
  };

  /* ------------------------
     🚪 Logout
  ------------------------- */
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    socketService.disconnect();
  };

  /* ------------------------
     📦 Context Value
  ------------------------- */
  const value = {
    user,
    token,
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout,
    isAuthenticated: !!user, // ✅ more robust
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
