import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Column from "./Column";
import api from "../services/api";
import socketService from "../services/socket";
import { DragDropContext } from "react-beautiful-dnd";
import { StrictDroppable } from "./StrictDroppable";

const BoardView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const sortBoard = (data) => {
    if (!data) return null;
    return {
      ...data,
      Columns: [...(data.Columns || [])]
        .sort((a, b) => a.order - b.order)
        .map((col) => ({
          ...col,
          Cards: [...(col.Cards || [])].sort((a, b) => a.order - b.order),
        })),
    };
  };

  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      const [boardRes, profileRes, membersRes] = await Promise.all([
        api.getBoard(id),
        api.getProfile(),
        api.getBoardMembers(id),
      ]);
      setBoard(sortBoard(boardRes.data));
      setCurrentUser(profileRes.data);
      setMembers(membersRes.data || []);
      setError(null);
    } catch (err) {
      console.error("[BoardView] Error fetching board:", err);
      setError(
        "Failed to load board. It might not exist or you may not have access."
      );
      toast.error("Failed to load board.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!socketService.socket) socketService.connect();
    socketService.joinBoard(id);
    fetchBoard();

    const updateHandler = () => fetchBoard();

    socketService.on("board_updated", (updated) => {
      if (updated.id === parseInt(id)) setBoard(sortBoard(updated));
    });
    ["column_created", "card_created", "card_updated", "card_deleted", "member_joined", "member_removed"].forEach((event) =>
      socketService.on(event, updateHandler)
    );
    socketService.on("notification", ({ message, type }) => {
      if (type === "success") toast.success(message);
      else if (type === "error") toast.error(message);
      else toast(message);
    });

    return () => {
      socketService.leaveBoard(id);
      socketService.socket?.off();
    };
  }, [id, fetchBoard]);

  const onDragEnd = async ({ destination, source, draggableId, type }) => {
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    if (type === "COLUMN") {
      const newCols = Array.from(board.Columns);
      const [moved] = newCols.splice(source.index, 1);
      newCols.splice(destination.index, 0, moved);
      setBoard({ ...board, Columns: newCols.map((col, idx) => ({ ...col, order: idx })) });
      try {
        await api.reorderColumns(board.id, newCols.map((c) => c.id));
      } catch {
        toast.error("Could not save column order.");
        fetchBoard();
      }
      return;
    }

    const srcColId = parseInt(source.droppableId);
    const dstColId = parseInt(destination.droppableId);
    const start = board.Columns.find((c) => c.id === srcColId);
    const finish = board.Columns.find((c) => c.id === dstColId);
    if (!start || !finish) return;

    const draggedCard = start.Cards[source.index];
    const newCols = board.Columns.map((col) => {
      if (col.id === srcColId) {
        const newCards = [...col.Cards];
        newCards.splice(source.index, 1);
        return { ...col, Cards: newCards };
      }
      if (col.id === dstColId) {
        const newCards = [...col.Cards];
        newCards.splice(destination.index, 0, draggedCard);
        return { ...col, Cards: newCards };
      }
      return col;
    });

    setBoard({ ...board, Columns: newCols });

    try {
      await api.moveCard(draggableId, { newColumnId: dstColId, newOrder: destination.index });
      toast.success("Card moved successfully");
    } catch {
      toast.error("Could not move card.");
      fetchBoard();
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim()) return;
    setIsLoadingAction(true);
    try {
      await api.createColumn(id, { title: newColumnTitle.trim() });
      setNewColumnTitle("");
      setIsAddingColumn(false);
      toast.success("Column created!");
      fetchBoard();
    } catch {
      toast.error("Failed to create column.");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleCardCreated = (columnId, newCard) => {
    setBoard((prevBoard) => ({
      ...prevBoard,
      Columns: prevBoard.Columns.map((col) =>
        col.id === columnId ? { ...col, Cards: [...(col.Cards || []), newCard] } : col
      ),
    }));
  };

  const handleCardUpdated = (cardId, updatedCard) => {
    setBoard((prevBoard) => ({
      ...prevBoard,
      Columns: prevBoard.Columns.map((col) => ({
        ...col,
        Cards: col.Cards.map((card) => (card.id === cardId ? { ...card, ...updatedCard } : card)),
      })),
    }));
  };

  const handleCardDeleted = (cardId) => {
    setBoard((prevBoard) => ({
      ...prevBoard,
      Columns: prevBoard.Columns.map((col) => ({
        ...col,
        Cards: col.Cards.filter((card) => card.id !== cardId),
      })),
    }));
  };

  const handleColumnUpdated = (columnId, updatedColumn) => {
    setBoard((prevBoard) => ({
      ...prevBoard,
      Columns: prevBoard.Columns.map((col) => (col.id === columnId ? { ...col, ...updatedColumn } : col)),
    }));
  };

  const handleColumnDeleted = (columnId) => {
    setBoard((prevBoard) => ({
      ...prevBoard,
      Columns: prevBoard.Columns.filter((col) => col.id !== columnId),
    }));
  };

  const isOwner = board?.ownerId === currentUser?.id;
  const isAdmin = currentUser?.role === "admin";
  const canManageBoard = isOwner || isAdmin;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await api.inviteToBoard(id, inviteEmail);
      toast.success("User invited!");
      setInviteEmail("");
    } catch {
      toast.error("Failed to invite user.");
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await api.removeBoardMember(id, userId);
      toast.success("Member removed.");
    } catch {
      toast.error("Failed to remove member.");
    }
  };

  const handleLeaveBoard = async () => {
    if (isOwner) return toast.error("Board owners cannot leave. Transfer ownership first.");
    if (window.confirm("Are you sure you want to leave this board?")) {
      try {
        await api.leaveBoard(id);
        toast.success("You left the board.");
        navigate("/dashboard");
      } catch {
        toast.error("Failed to leave board.");
      }
    }
  };

  const handleTransferOwnership = async (newOwnerId) => {
    if (!window.confirm("Transfer ownership? This cannot be undone.")) return;
    try {
      await api.transferBoardOwnership(id, newOwnerId);
      toast.success("Ownership transferred.");
      fetchBoard();
    } catch {
      toast.error("Failed to transfer ownership.");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchBoard} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );

  if (!board)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Board not found</p>
      </div>
    );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="min-h-screen bg-slate-100 p-3">
        {/* Board Header */}
        <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">{board.name}</h1>
            {board.description && <p className="text-gray-600 text-sm mt-1">{board.description}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">Members:</span>
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white shadow-sm"
                  title={member.name || member.User?.name}
                >
                  {String(member.name || member.User?.name || "").charAt(0).toUpperCase()}
                </div>
              ))}
              {members.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center border-2 border-white shadow-sm">
                  +{members.length - 5}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-500">({members.length})</span>
            <button
              onClick={() => setShowMembers(true)}
              className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
            >
              Manage
            </button>
          </div>
        </div>

        {/* Columns */}
        <StrictDroppable droppableId="all-columns" direction="horizontal" type="COLUMN">
          {(provided) => (
            <div className="flex gap-4 overflow-x-auto pb-4" {...provided.droppableProps} ref={provided.innerRef}>
              {board.Columns.map((column, index) => (
                <Column
                  key={column.id}
                  column={column}
                  index={index}
                  canManageBoard={canManageBoard}
                  members={members}
                  onColumnUpdated={handleColumnUpdated}
                  onColumnDeleted={handleColumnDeleted}
                  onCardCreated={handleCardCreated}
                  onCardUpdated={handleCardUpdated}
                  onCardDeleted={handleCardDeleted}
                />
              ))}
              {provided.placeholder}

              {/* Add Column */}
              {canManageBoard &&
                (isAddingColumn ? (
                  <div className="bg-white rounded-lg shadow border p-4 w-64 flex-shrink-0">
                    <input
                      type="text"
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddColumn();
                        if (e.key === "Escape") setIsAddingColumn(false);
                      }}
                      placeholder="Column title..."
                      className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={isLoadingAction}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleAddColumn}
                        disabled={isLoadingAction || !newColumnTitle.trim()}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isLoadingAction ? "Adding..." : "Add"}
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingColumn(false);
                          setNewColumnTitle("");
                        }}
                        className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingColumn(true)}
                    className="bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-gray-50 p-6 w-64 text-center rounded-lg flex flex-col items-center justify-center gap-1"
                  >
                    <svg
                      className="w-6 h-6 text-gray-500 group-hover:text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-xs text-gray-500">Add Column</span>
                  </button>
                ))}
            </div>
          )}
        </StrictDroppable>

        {/* Members Modal */}
        {showMembers && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-xl w-full max-w-md max-h-[70vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Board Members</h2>
                <button onClick={() => setShowMembers(false)} className="text-gray-400 hover:text-gray-600 text-xl">
                  ×
                </button>
              </div>
              <ul className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {members.length > 0 ? (
                  members.map((member) => (
                    <li key={member.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <div>
                        <span className="font-medium">{member.User?.name || member.name || "Unknown"}</span>
                        <br />
                        <span className="text-xs text-gray-600">{member.User?.email || member.email}</span>
                        {board?.ownerId === member.userId && (
                          <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">Owner</span>
                        )}
                      </div>
                      {canManageBoard && board?.ownerId !== member.userId && (
                        <div className="flex gap-2">
                          <button onClick={() => handleRemoveMember(member.userId)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                          {isOwner && (
                            <button onClick={() => handleTransferOwnership(member.userId)} className="text-blue-600 hover:text-blue-800 text-xs">
                              Make Owner
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No members found</p>
                )}
              </ul>
              {canManageBoard && (
                <div className="border-t pt-2">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                      placeholder="Email address"
                      className="flex-grow border px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button onClick={handleInvite} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm">
                      Invite
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
};

export default BoardView;
