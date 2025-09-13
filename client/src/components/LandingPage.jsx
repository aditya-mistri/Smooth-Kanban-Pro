// src/components/LandingPage.jsx
import React from "react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Navbar */}
      <nav className="w-full bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Kanban Pro</h1>
          <div className="space-x-4">
            <Link
              to="/login"
              className="px-4 py-2 text-blue-600 font-medium rounded hover:bg-blue-50 transition"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto px-6 py-20 gap-10">
        <div className="flex-1 space-y-6">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Organize Your Work <br /> Effortlessly
          </h2>
          <p className="text-gray-600 text-lg max-w-md">
            Kanban Pro is a real-time, collaborative Kanban board that helps
            teams manage projects, tasks, and workflows efficiently.
          </p>
          <div className="flex gap-4">
            <Link
              to="/signup"
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition"
            >
              Learn More
            </Link>
          </div>
        </div>

        
      </section>

      {/* Features Section */}
      <section className="bg-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="bg-white rounded-xl shadow-md p-8 flex flex-col items-center text-center">
            <div className="bg-blue-100 text-blue-600 p-4 rounded-full mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2M13 7a2 2 0 00-2-2H9a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Collaboration</h3>
            <p className="text-gray-500">
              Changes reflect instantly for all team members across devices.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-8 flex flex-col items-center text-center">
            <div className="bg-green-100 text-green-600 p-4 rounded-full mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Drag & Drop</h3>
            <p className="text-gray-500">
              Organize tasks and columns intuitively with simple drag-and-drop.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-8 flex flex-col items-center text-center">
            <div className="bg-yellow-100 text-yellow-600 p-4 rounded-full mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Customizable Boards</h3>
            <p className="text-gray-500">
              Create and manage projects your way with dynamic boards and columns.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-center">
        <h3 className="text-3xl font-bold mb-6">Ready to get started?</h3>
        <Link
          to="/signup"
          className="px-8 py-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
        >
          Create Your Account
        </Link>
      </section>

      <footer className="bg-gray-100 py-6 text-center text-gray-600">
        &copy; {new Date().getFullYear()} Kanban Pro. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
