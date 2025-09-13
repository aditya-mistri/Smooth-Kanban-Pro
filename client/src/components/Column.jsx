import React, { useState, useEffect } from "react";
import { Draggable } from "react-beautiful-dnd";
import { StrictDroppable } from "./StrictDroppable";
import Card from "./Card";
import api from "../services/api";
import toast from "react-hot-toast";
import socketService from "../services/socket";

const Column = ({ column, index, boardId, members, onColumnUpdated, onColumnDeleted }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(column.name || column.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDescription, setNewCardDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState(column.Cards || []);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    if (!boardId) return;

    const handleCardCreated = (card) => {
      if (card.columnId === column.id) setCards((prev) => [...prev, card]);
    };
    const handleCardUpdated = (updatedCard) => {
      if (updatedCard.columnId === column.id) {
        setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
      }
    };
    const handleCardDeleted = ({ cardId, columnId }) => {
      if (columnId === column.id) setCards((prev) => prev.filter((c) => c.id !== cardId));
    };

    socketService.on("card_created", handleCardCreated);
    socketService.on("card_updated", handleCardUpdated);
    socketService.on("card_deleted", handleCardDeleted);

    return () => {
      socketService.off("card_created", handleCardCreated);
      socketService.off("card_updated", handleCardUpdated);
      socketService.off("card_deleted", handleCardDeleted);
    };
  }, [boardId, column.id]);

  // --- Column Title ---
  const handleSaveTitle = async () => {
    if (!title.trim() || title.trim() === column.name) {
      setIsEditing(false);
      return;
    }
    setIsLoading(true);
    const toastId = toast.loading("Updating column...");
    try {
      const res = await api.updateColumn(column.id, { name: title.trim() });
      setIsEditing(false);
      onColumnUpdated?.(column.id, { name: title.trim() });
      toast.success("Column updated!", { id: toastId });
      socketService.emit("column_updated", res.data);
    } catch (error) {
      console.error("Error updating column:", error);
      toast.error(error.response?.data?.error || "Failed to update column", { id: toastId });
      setTitle(column.name);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setTitle(column.name);
    setIsEditing(false);
  };

  const handleDeleteColumn = async () => {
    if (!window.confirm(`Delete column "${title}" and all its cards?`)) return;
    setIsLoading(true);
    const toastId = toast.loading("Deleting column...");
    try {
      await api.deleteColumn(column.id);
      onColumnDeleted?.(column.id);
      toast.success("Column deleted!", { id: toastId });
      socketService.emit("column_deleted", { columnId: column.id, boardId });
    } catch (error) {
      console.error("Error deleting column:", error);
      toast.error(error.response?.data?.error || "Failed to delete column", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Add Card ---
  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    setIsLoading(true);
    const toastId = toast.loading("Adding card...");
    try {
      const res = await api.createCard(column.id, {
        title: newCardTitle.trim(),
        description: newCardDescription.trim() || null,
      });
      setCards((prev) => [...prev, res.data]);
      setNewCardTitle("");
      setNewCardDescription("");
      setIsAddingCard(false);
      toast.success("Card added!", { id: toastId });
      socketService.emit("card_created", res.data);
    } catch (error) {
      console.error("Error creating card:", error);
      toast.error(error.response?.data?.error || "Failed to add card", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      action();
    }
    if (e.key === "Escape") {
      if (action === handleSaveTitle) handleCancelEdit();
      else {
        setIsAddingCard(false);
        setNewCardTitle("");
        setNewCardDescription("");
      }
    }
  };

  return (
    <Draggable draggableId={String(column.id)} index={index}>
      {(provided) => (
        <div
          className="bg-gray-50 rounded-lg shadow-md border border-gray-200 w-80 flex-shrink-0 flex flex-col"
          {...provided.draggableProps}
          ref={provided.innerRef}
        >
          {/* Column Header */}
          <div className="border-b border-gray-200 p-4 flex justify-between items-start" {...provided.dragHandleProps}>
            {isEditing ? (
              <div className="flex-1 space-y-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, handleSaveTitle)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveTitle}
                    disabled={isLoading || !title.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex justify-between items-center">
                <div className="cursor-pointer" onClick={() => setIsEditing(true)}>
                  <h2 className="text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors">{title}</h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 mt-1">
                    {cards.length} cards
                  </span>
                </div>
                <button
                  onClick={handleDeleteColumn}
                  disabled={isLoading}
                  className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                  title="Delete column"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Cards */}
          <StrictDroppable droppableId={String(column.id)} type="CARD">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`p-4 space-y-3 min-h-[100px] flex-grow transition-colors ${snapshot.isDraggingOver ? "bg-blue-50" : ""}`}
              >
                {cards.map((card, idx) => (
                  <Card key={card.id} card={card} index={idx} members={members} />
                ))}
                {provided.placeholder}

                {cards.length === 0 && !isAddingCard && (
                  <p className="text-center text-gray-400 text-sm mt-4">No cards yet</p>
                )}
              </div>
            )}
          </StrictDroppable>

          {/* Add Card */}
          <div className="border-t border-gray-200 p-4">
            {isAddingCard ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, handleAddCard)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Card title"
                  disabled={isLoading}
                  autoFocus
                />
                <textarea
                  value={newCardDescription}
                  onChange={(e) => setNewCardDescription(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, handleAddCard)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description (optional)"
                  rows={2}
                  disabled={isLoading}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCard}
                    disabled={isLoading || !newCardTitle.trim()}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? "Adding..." : "Add Card"}
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingCard(false);
                      setNewCardTitle("");
                      setNewCardDescription("");
                    }}
                    disabled={isLoading}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingCard(true)}
                className="w-full p-3 text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all"
                disabled={isLoading}
              >
                + Add Card
              </button>
            )}
          </div>

          {/* Debug Info */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
              <p>Column ID: {column.id}</p>
              <p>Cards: {cards.length}</p>
              <p>Members: {members.length}</p>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default Column;
