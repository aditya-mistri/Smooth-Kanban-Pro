import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import socketService from "../services/socket";

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const FeatureIcon = ({ children }) => (
  <div className="bg-blue-100 text-blue-600 rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0">
    {children}
  </div>
);

const Dashboard = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [invites, setInvites] = useState([]);
  const [adminStats, setAdminStats] = useState(null);

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [boardToEdit, setBoardToEdit] = useState(null);
  const [boardToDelete, setBoardToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!socketService.socket) {
      socketService.connect();
    }

    const initializeDashboard = async () => {
      try {
        setLoading(true);

        const profileResponse = await api.getProfile();
        setUser(profileResponse.data);

        const boardsResponse = await api.fetchBoards();
        setBoards(boardsResponse.data);

        try {
          const invitesResponse = await api.get("/invites/received");
          setInvites(invitesResponse.data);
        } catch {
          console.log("No invites API available yet");
        }

        if (profileResponse.data.role === "admin") {
          try {
            const statsResponse = await api.get("/admin/stats");
            setAdminStats(statsResponse.data);
          } catch {
            console.log("No admin stats API available yet");
          }
        }
      } catch {
        setError("Failed to fetch dashboard data. Please try again later.");
        setTimeout(() => toast.error("Could not load dashboard."), 0);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();

    // --- Board events ---
    const handleBoardCreated = (newBoard) => {
      setBoards((prev) => [newBoard, ...prev]);
      setTimeout(
        () => toast.success(`New board "${newBoard.name}" was created!`),
        0
      );
    };
    const handleBoardUpdated = (updatedBoard) => {
      setBoards((prev) =>
        prev.map((b) => (b.id === updatedBoard.id ? updatedBoard : b))
      );
    };
    const handleBoardDeleted = ({ id, name }) => {
      setBoards((prev) => prev.filter((b) => b.id !== id));
      setTimeout(() => toast.success(`Board "${name}" was deleted.`), 0);
    };

    // --- Invite events ---
    const handleInviteReceived = (invite) => {
      setInvites((prev) => [invite, ...prev]);
      setTimeout(() => toast.success("You received a new board invite!"), 0);
    };
    const handleInviteResponded = ({ inviteId, action }) => {
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      setTimeout(() => toast.success(`Invite ${action}ed successfully!`), 0);
    };

    // --- Admin stats update ---
    const handleStatsUpdated = (stats) => {
      setAdminStats(stats);
    };

    // Register events
    socketService.on("board_created", handleBoardCreated);
    socketService.on("board_updated", handleBoardUpdated);
    socketService.on("board_deleted", handleBoardDeleted);

    socketService.on("invite_received", handleInviteReceived);
    socketService.on("invite_responded", handleInviteResponded);

    socketService.on("admin_stats_updated", handleStatsUpdated);

    if (socketService.socket) {
      socketService.socket.onAny((event, ...args) => {
        console.log("📡 Socket Event:", event, args);
        setTimeout(() => {
          toast.success(`📡 Event: ${event}`, { duration: 3000 });
        }, 0);
      });
    }

    return () => {
      if (socketService.socket) {
        socketService.socket.off("board_created", handleBoardCreated);
        socketService.socket.off("board_updated", handleBoardUpdated);
        socketService.socket.off("board_deleted", handleBoardDeleted);

        socketService.socket.off("invite_received", handleInviteReceived);
        socketService.socket.off("invite_responded", handleInviteResponded);

        socketService.socket.off("admin_stats_updated", handleStatsUpdated);
      }
    };
  }, []);

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim()) return toast.error("Board name is required.");
    setIsSubmitting(true);
    try {
      await api.createBoard({ name: newBoardName });
      setCreateModalOpen(false);
      setNewBoardName("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create board.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBoard = async (e) => {
    e.preventDefault();
    if (!boardToEdit?.name.trim())
      return toast.error("Board name is required.");
    setIsSubmitting(true);
    try {
      await api.updateBoard(boardToEdit.id, { name: boardToEdit.name });
      toast.success("Board renamed successfully!");
      setEditModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to rename board.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return;
    setIsSubmitting(true);
    try {
      await api.deleteBoard(boardToDelete.id);
      setDeleteModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete board.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const handleInviteResponse = async (inviteId, action) => {
    try {
      await api.post(`/invites/${inviteId}/respond`, { action });
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
      toast.success(`Invite ${action}ed successfully!`);

      if (action === "accept") {
        // Refresh boards list
        const boardsResponse = await api.fetchBoards();
        setBoards(boardsResponse.data);
      }
    } catch (err) {
      toast.error(`Failed to ${action} invite.`);
    }
  };

  const openEditModal = (board) => {
    setBoardToEdit({ ...board });
    setEditModalOpen(true);
  };
  const openDeleteModal = (board) => {
    setBoardToDelete(board);
    setDeleteModalOpen(true);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-xl">
        Loading dashboard...
      </div>
    );
  if (error)
    return (
      <div className="flex justify-center items-center h-screen text-xl text-red-500">
        {error}
      </div>
    );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-80 bg-white border-r border-gray-200 p-8 hidden lg:block flex-shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <svg
              className="w-6 h-6"
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
          <h1 className="text-2xl font-bold text-gray-900">Kanban Pro</h1>
        </div>
        <p className="text-gray-600 text-sm mb-8">
          A real-time, collaborative Kanban board to help you manage projects
          and tasks efficiently.
        </p>
        <div className="space-y-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Key Features
          </h2>
          <ul className="space-y-5">
            <li className="flex items-start gap-4">
              <FeatureIcon>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </FeatureIcon>
              <div>
                <h3 className="font-semibold text-gray-800">
                  Real-time Updates
                </h3>
                <p className="text-sm text-gray-500">
                  Changes reflect instantly for all users.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <FeatureIcon>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  ></path>
                </svg>
              </FeatureIcon>
              <div>
                <h3 className="font-semibold text-gray-800">Drag & Drop</h3>
                <p className="text-sm text-gray-500">
                  Intuitively organize tasks and columns.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <FeatureIcon>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>
              </FeatureIcon>
              <div>
                <h3 className="font-semibold text-gray-800">Dynamic Boards</h3>
                <p className="text-sm text-gray-500">
                  Create and manage projects your way.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </aside>

      <div className="flex-1">
        {/* Header with user info */}
        <header className="bg-white/60 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Dashboard</h2>
              {user && (
                <p className="text-sm text-gray-600">
                  Welcome back, <span className="font-medium">{user.name}</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {user.role}
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 text-sm flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  ></path>
                </svg>
                Create Board
              </button>
              <button
                onClick={() => setLogoutModalOpen(true)}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Admin Stats Section */}
          {user?.role === "admin" && adminStats && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Admin Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2M13 7a2 2 0 00-2-2H9a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2"
                        ></path>
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Boards
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {adminStats.totalBoards || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                        ></path>
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Members
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {adminStats.totalMembers || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="bg-yellow-100 text-yellow-600 p-2 rounded-lg">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        ></path>
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Pending Invites
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {adminStats.pendingInvites || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invites Section */}
          {invites.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Board Invitations
              </h3>
              <div className="space-y-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        Invitation to join "
                        {invite.Board?.name || "Unknown Board"}"
                      </p>
                      <p className="text-sm text-gray-600">
                        From: {invite.Inviter?.name || invite.Inviter?.email}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleInviteResponse(invite.id, "accept")
                        }
                        className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          handleInviteResponse(invite.id, "decline")
                        }
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Boards Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Your Boards
            </h3>
            {boards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {boards.map((board) => {
                  const columnCount = board.Columns?.length || 0;
                  const cardCount =
                    board.Columns?.reduce(
                      (sum, col) => sum + (col.Cards?.length || 0),
                      0
                    ) || 0;
                  const isOwner = board.ownerId === user?.id;
                  return (
                    <div
                      key={board.id}
                      className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg hover:border-blue-400 transition-all duration-300 flex flex-col"
                    >
                      <Link
                        to={`/boards/${board.id}`}
                        className="p-5 flex-grow block"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3
                            className="text-lg font-bold text-gray-800 truncate flex-1"
                            title={board.name}
                          >
                            {board.name}
                          </h3>
                          {isOwner && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              Owner
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                          <span>
                            <strong>{columnCount}</strong>{" "}
                            {columnCount === 1 ? "Column" : "Columns"}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span>
                            <strong>{cardCount}</strong>{" "}
                            {cardCount === 1 ? "Card" : "Cards"}
                          </span>
                        </div>
                      </Link>
                      <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-2 flex justify-end gap-3">
                        {(isOwner || user?.role === "admin") && (
                          <>
                            <button
                              onClick={() => openEditModal(board)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => openDeleteModal(board)}
                              className="text-xs font-medium text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 px-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <h3 className="text-xl font-semibold text-gray-800">
                  No boards yet!
                </h3>
                <p className="text-gray-500 mt-2">
                  Get started by creating your first project board.
                </p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-6 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                >
                  Create a Board
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Board Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create a New Board"
      >
        <form onSubmit={handleCreateBoard}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Board Name
          </label>
          <input
            type="text"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Q4 Marketing Plan"
            autoFocus
          />
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Board Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Rename Board"
      >
        <form onSubmit={handleUpdateBoard}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Board Name
          </label>
          <input
            type="text"
            value={boardToEdit?.name || ""}
            onChange={(e) =>
              setBoardToEdit({ ...boardToEdit, name: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Board Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Board"
      >
        <p>
          Are you sure you want to delete the board "
          <strong>{boardToDelete?.name}</strong>"? This action is permanent.
        </p>
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => setDeleteModalOpen(false)}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteBoard}
            disabled={isSubmitting}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>

      {/* Logout Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        title="Logout"
      >
        <p>Are you sure you want to log out?</p>
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => setLogoutModalOpen(false)}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
