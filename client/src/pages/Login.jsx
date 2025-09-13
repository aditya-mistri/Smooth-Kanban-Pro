import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import socketService from "../services/socket.js";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("🔹 Login form submitted");
    console.log("📧 Email:", email);
    console.log("🔑 Password length:", password.length);

    if (!email.trim() || !password.trim()) {
      console.warn("⚠️ Missing email or password");
      toast.error("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      console.log("➡️ Calling login API with credentials...");
      await login({ email, password });
      console.log("✅ Login successful, connecting socket...");

      toast.success("Logged in successfully!");

      // Connect to socket after login
      socketService.connect();

      console.log("🔗 Socket connected, navigating to dashboard...");
      navigate("/");
    } catch (error) {
      console.error("❌ Login failed", error);
      if (error.response) {
        console.error("📥 Backend responded with:", error.response.data);
      } else if (error.request) {
        console.error("📡 Request was sent but no response received:", error.request);
      } else {
        console.error("⚙️ Error setting up request:", error.message);
      }

      toast.error(
        error.response?.data?.error ||
          "Login failed. Please check your credentials."
      );
    } finally {
      console.log("🔄 Resetting loading state...");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-2 text-gray-600">
            Log in to continue to your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                console.log("✏️ Email input changed:", e.target.value);
                setEmail(e.target.value);
              }}
              placeholder="you@example.com"
              autoComplete="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  console.log("✏️ Password input changed (length):", e.target.value.length);
                  setPassword(e.target.value);
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => {
                  setShowPassword((prev) => !prev);
                  console.log("👁 Toggle password visibility:", !showPassword);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.128.186-2.214.525-3.225m2.013-2.337A9.953 9.953 0 0112 3c5.523 0 10 4.477 10 10 0 1.716-.436 3.332-1.2 4.738M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3l18 18M9.88 9.88A3 3 0 0112 9c1.657 0 3 1.343 3 3a3 3 0 01-.88 2.12M9.88 9.88L5.6 5.6M14.12 14.12L18.4 18.4"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password.trim()}
            className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-600">
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
