import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import socketService from "../services/socket";
import Modal from "./common/Modal";

const Dashboard = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [invites, setInvites] = useState([]);
  const [adminStats, setAdminStats] = useState(null);

  const { user: authUser } = useAuth();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
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
      setTimeout(() => toast.success(`New board "${newBoard.name}" created!`), 0);
    };
    const handleBoardUpdated = (updatedBoard) => {
      setBoards((prev) =>
        prev.map((b) => (b.id === updatedBoard.id ? updatedBoard : b))
      );
    };
    const handleBoardDeleted = ({ id, name }) => {
      setBoards((prev) => prev.filter((b) => b.id !== id));
      setTimeout(() => toast.success(`Board "${name}" deleted.`), 0);
    };

    // --- Invite events ---
    const handleInviteReceived = (invite) => {
      setInvites((prev) => [invite, ...prev]);
      setTimeout(() => toast.success("New board invite received!"), 0);
    };
    const handleInviteResponded = ({ inviteId, action }) => {
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      setTimeout(() => toast.success(`Invite ${action}ed!`), 0);
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
    if (!boardToEdit?.name.trim()) return toast.error("Board name is required.");
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

  const handleInviteResponse = async (inviteId, action) => {
    try {
      await api.post(`/invites/${inviteId}/respond`, { action });
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
      toast.success(`Invite ${action}ed!`);
      if (action === "accept") {
        const boardsResponse = await api.fetchBoards();
        setBoards(boardsResponse.data);
      }
    } catch {
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
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-base text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-2">😓</div>
          <p className="text-base text-red-600">{error}</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 p-4">
      {/* Quick Actions */}
      <div className="flex justify-end">
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 text-sm flex items-center gap-1"
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
            />
          </svg>
          New Board
        </button>
      </div>

      {/* Admin Stats */}
      {user?.role === "admin" && adminStats && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Admin Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-md shadow flex items-center gap-2">
              <div className="bg-blue-500 text-white p-2 rounded-md w-8 h-8 flex items-center justify-center text-xs font-bold">
                B
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Boards</p>
                <p className="text-sm font-semibold text-gray-800">{adminStats.totalBoards || 0}</p>
              </div>
            </div>
            <div className="bg-white p-3 rounded-md shadow flex items-center gap-2">
              <div className="bg-green-500 text-white p-2 rounded-md w-8 h-8 flex items-center justify-center text-xs font-bold">
                M
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Members</p>
                <p className="text-sm font-semibold text-gray-800">{adminStats.totalMembers || 0}</p>
              </div>
            </div>
            <div className="bg-white p-3 rounded-md shadow flex items-center gap-2">
              <div className="bg-yellow-500 text-white p-2 rounded-md w-8 h-8 flex items-center justify-center text-xs font-bold">
                I
              </div>
              <div>
                <p className="text-xs text-gray-500">Pending Invites</p>
                <p className="text-sm font-semibold text-gray-800">{adminStats.pendingInvites || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invites Section */}
      {invites.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            Pending Invitations
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{invites.length}</span>
          </h2>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="bg-white p-3 rounded-md shadow flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    Invitation to join "{invite.Board?.name || "Unknown Board"}"
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    From: {invite.Inviter?.name || invite.Inviter?.email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInviteResponse(invite.id, "accept")}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleInviteResponse(invite.id, "decline")}
                    className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            Your Workspace
            {boards.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">
                {boards.length} {boards.length === 1 ? 'Board' : 'Boards'}
              </span>
            )}
          </h2>
        </div>

        {boards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {boards.map((board) => {
              const columnCount = board.Columns?.length || 0;
              const cardCount =
                board.Columns?.reduce((sum, col) => sum + (col.Cards?.length || 0), 0) || 0;
              const isOwner = board.ownerId === user?.id;
              return (
                <div
                  key={board.id}
                  className="bg-white rounded-md border border-gray-200 shadow hover:shadow-md flex flex-col group overflow-hidden"
                >
                  <Link
                    to={`/boards/${board.id}`}
                    className="p-3 flex-grow block relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                    <div className="relative">
                      <div className="flex items-start justify-between mb-2">
                        <h3
                          className="text-sm font-semibold text-gray-800 truncate flex-1 group-hover:text-blue-600 transition-colors duration-200"
                          title={board.name}
                        >
                          {board.name}
                        </h3>
                        {isOwner && (
                          <span className="ml-1 px-1 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded border border-blue-200">
                            Owner
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>{columnCount} {columnCount === 1 ? "Column" : "Columns"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>{cardCount} {cardCount === 1 ? "Card" : "Cards"}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  {(isOwner || user?.role === "admin") && (
                    <div className="border-t border-gray-200 px-2 py-1 flex justify-end gap-2">
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 px-4 bg-white rounded-md border border-gray-200">
            <div className="text-5xl mb-3">🚀</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Ready to get started?</h3>
            <p className="text-xs text-gray-500 mb-3 max-w-xs mx-auto">
              Create your first project board and start organizing your tasks.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Create Your First Board
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Create a New Board">
        <form onSubmit={handleCreateBoard}>
          <label className="block text-xs font-medium text-gray-700 mb-1">Board Name</label>
          <input
            type="text"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., Q4 Marketing Plan"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="px-2 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Rename Board">
        <form onSubmit={handleUpdateBoard}>
          <label className="block text-xs font-medium text-gray-700 mb-1">New Board Name</label>
          <input
            type="text"
            value={boardToEdit?.name || ""}
            onChange={(e) => setBoardToEdit({ ...boardToEdit, name: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <button type="button" onClick={() => setEditModalOpen(false)} className="px-2 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Board">
        <p className="text-sm">
          Are you sure you want to delete "<strong>{boardToDelete?.name}</strong>"? This action is permanent.
        </p>
        <div className="flex justify-end gap-2 mt-3">
          <button type="button" onClick={() => setDeleteModalOpen(false)} className="px-2 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">
            Cancel
          </button>
          <button onClick={handleDeleteBoard} disabled={isSubmitting} className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50">
            {isSubmitting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
