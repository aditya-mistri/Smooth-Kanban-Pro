import React, { useState } from "react";

const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-6 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img src="../../public/logo.png" alt="logo" />
            <h1 className="text-2xl font-serif font-bold text-gray-900">
              Doom Kanban
            </h1>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Features
            </a>
            <div className="flex items-center space-x-4">
              <a
                href="/login"
                className="px-5 py-2 text-gray-700 font-medium hover:text-blue-600 transition-colors"
              >
                Sign In
              </a>
              <a
                href="/signup"
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Get Started
              </a>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg border border-gray-300 hover:bg-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-6 h-6 text-gray-700"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 px-6 py-4 space-y-4">
            <a
              href="#features"
              className="block text-gray-700 hover:text-blue-600 font-medium"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="block text-gray-700 hover:text-blue-600 font-medium"
            >
              Pricing
            </a>
            <a
              href="/login"
              className="block text-gray-700 hover:text-blue-600 font-medium"
            >
              Sign In
            </a>
            <a
              href="/signup"
              className="block px-6 py-2 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Get Started
            </a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 sm:px-8 pt-16 sm:pt-20 pb-24 sm:pb-32 bg-gray-50">
        <div className="flex flex-col lg:flex-row items-center lg:items-start mb-40">
          {/* Illustration */}
          <div className="flex justify-center lg:justify-start lg:w-1/2 mb-10 lg:mb-0 flex-shrink-0">
            <img
              src="/hero1.png"
              alt="Team collaboration illustration"
              className="w-full max-w-sm object-contain drop-shadow-xl rounded-xl"
            />
          </div>
          {/* Text Section */}
          <div className="text-center lg:text-left lg:w-1/2">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-gray-900 leading-tight mb-6">
              Project Management,
              <br />
              <span className="text-blue-600">Simplified</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-xl leading-relaxed mb-10">
              Transform the way your team collaborates with intuitive Kanban
              boards, real-time synchronization, and powerful workspace
              management tools.
            </p>
          </div>
        </div>

        {/* Visual Board Preview */}
        <div
          className="w-full max-w-8xl mx-auto bg-slate-100 rounded-2xl shadow-2xl border overflow-hidden relative"
          style={{ height: "720px" }}
        >
          {/* Fake MacBook Top Bar */}
          <div className="bg-gray-200 h-8 flex items-center px-4 space-x-2 relative">
            <span className="w-3 h-3 bg-red-400 rounded-full"></span>
            <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
            <span className="w-3 h-3 bg-green-400 rounded-full"></span>
          </div>

          {/* Kanban Board */}
          <div className="relative p-8 overflow-x-auto h-full space-y-7">
            <div className="absolute right-2 top-2 bg-green-100 text-green-700 text-sm font-normal px-4 py-1.5 rounded-full shadow-sm">
              👥 6 Online
            </div>

            <div className="flex space-x-6 min-w-max">
              {/* To Do */}
              <div className="min-w-80 bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800">To Do</h4>
                  <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">
                    3
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg">
                    <h5 className="font-medium text-gray-800 text-sm">
                      Design system updates
                    </h5>
                    <p className="text-gray-500 text-xs mt-1">Due: Today</p>
                  </div>
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg">
                    <h5 className="font-medium text-gray-800 text-sm">
                      User research findings
                    </h5>
                    <p className="text-gray-500 text-xs mt-1">Due: Tomorrow</p>
                  </div>
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg">
                    <h5 className="font-medium text-gray-800 text-sm">
                      Sprint planning
                    </h5>
                    <p className="text-gray-500 text-xs mt-1">Due: Friday</p>
                  </div>
                </div>
              </div>

              {/* In Progress */}
              <div className="min-w-80 bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800">In Progress</h4>
                  <span className="bg-blue-100 text-blue-600 text-sm px-2 py-1 rounded-full">
                    2
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg">
                    <h5 className="font-medium text-gray-800 text-sm">
                      API integration
                    </h5>
                    <p className="text-gray-500 text-xs mt-1">In development</p>
                  </div>
                  <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded-r-lg">
                    <h5 className="font-medium text-gray-800 text-sm">
                      Mobile optimization
                    </h5>
                    <p className="text-gray-500 text-xs mt-1">50% complete</p>
                  </div>
                </div>
              </div>

              {/* Complete */}
              <div className="min-w-80 bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800">Complete</h4>
                  <span className="bg-green-100 text-green-600 text-sm px-2 py-1 rounded-full">
                    4
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded-r-lg">
                    <h5 className="font-medium text-gray-600 text-sm">
                      Database migration
                    </h5>
                    <p className="text-gray-500 text-xs mt-1">
                      Completed yesterday
                    </p>
                  </div>
                  <div className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded-r-lg">
                    <h5 className="font-medium text-gray-600 text-sm">
                      Testing suite
                    </h5>
                    <p className="text-gray-500 text-xs mt-1">
                      Completed 2 days ago
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toasts */}
          <div className="absolute bottom-6 right-6 space-y-3 w-60 text-sm">
            <div className="bg-white border-l-4 border-green-500 shadow-lg rounded-md p-1 flex items-center space-x-2">
              <span className="text-green-500 text-lg">●</span>
              <p className="text-gray-700">
                <strong>Rahul</strong> joined the board
              </p>
            </div>
            <div className="bg-white border-l-4 border-blue-500 shadow-lg rounded-md p-1 flex items-center space-x-2">
              <span className="text-blue-500 text-lg">💬</span>
              <p className="text-gray-700">
                <strong>Alex</strong> commented on a card
              </p>
            </div>
            <div className="bg-white border-l-4 border-amber-500 shadow-lg rounded-md p-1 flex items-center space-x-2">
              <span className="text-amber-500 text-lg">⚡</span>
              <p className="text-gray-700">Tasks updated in real-time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 mb-4">
              Everything you need to manage projects
            </h3>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to streamline your workflow and enhance
              team collaboration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
            {/* Feature 1 */}
            <div className="bg-blue-200 rounded-2xl p-8 border shadow-sm hover:shadow-xl transition-transform duration-300 hover:-translate-y-2 hover:rotate-1">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {" "}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                    ></path>{" "}
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Real-time Collaboration
                  </h4>
                  <p className="text-gray-600">
                    See changes instantly as your team updates tasks, moves
                    cards, and adds comments.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-blue-200 rounded-2xl p-8 border shadow-sm hover:shadow-xl transition-transform duration-300 hover:-translate-y-2 hover:-rotate-1">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {" "}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    ></path>{" "}
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Multiple Workspaces
                  </h4>
                  <p className="text-gray-600">
                    Organize projects in separate workspaces while keeping easy
                    access.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-blue-200 rounded-2xl p-8 border shadow-sm hover:shadow-xl transition-transform duration-300 hover:-translate-y-2 hover:rotate-1">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {" "}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2M13 7a2 2 0 00-2-2H9a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2"
                    ></path>{" "}
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Custom Boards & Columns
                  </h4>
                  <p className="text-gray-600">
                    Tailor boards to your workflow with unlimited customization.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-blue-200 rounded-2xl p-8 border shadow-sm hover:shadow-xl transition-transform duration-300 hover:-translate-y-2 hover:-rotate-1">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {" "}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    ></path>{" "}
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Intuitive Drag & Drop
                  </h4>
                  <p className="text-gray-600">
                    Move tasks seamlessly with simple drag and drop gestures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-blue-400 to-purple-400 py-20 sm:py-24 text-white mt-20">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <h3 className="text-3xl sm:text-4xl font-serif font-bold mb-6">
            Ready to transform your workflow?
          </h3>
          <p className="text-lg sm:text-xl mb-8 sm:mb-10 max-w-2xl mx-auto text-gray-100">
            Join thousands of teams already using Doom Kanban to streamline
            their projects and boost productivity.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
            <a
              href="/signup"
              className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Try out
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-10 sm:py-12">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <img src="../../public/logo.png" alt="Doom Kanban Logo" />

              <span className="text-xl font-serif font-bold text-white">
                Doom Kanban
              </span>
            </div>
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Doom Kanban. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
