// client/src/components/Card.jsx
import React, { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { Draggable } from "react-beautiful-dnd";
import { useAuth } from "../contexts/AuthContext";

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="p-6 text-gray-600">{children}</div>
        <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const getCommentText = (c) => c?.comment ?? c?.text ?? "";
const getCommentUserName = (c) =>
  c?.User?.name ?? c?.user?.name ?? c?.userName ?? "Unknown";

const Card = ({ card, index, members = [], onCardUpdate }) => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Fixed: Normalize assignees data structure and ensure array
  const getInitialAssignees = () => {
    const assignees = card.Assignees || card.assignees || card.members || [];
    // Ensure it's an array and normalize the structure
    const normalizedAssignees = Array.isArray(assignees) ? assignees : [];
    return normalizedAssignees.map((assignee) => ({
      id: assignee.id || assignee.userId,
      name:
        assignee.name || assignee.User?.name || assignee.userName || "Unknown",
      email: assignee.email || assignee.User?.email,
    }));
  };

  const [assignedMembers, setAssignedMembers] = useState(getInitialAssignees());

  // Fixed: Update assignees when card prop changes
  useEffect(() => {
    const newAssignees = getInitialAssignees();
    setAssignedMembers(newAssignees);
  }, [card.id, card.Assignees, card.assignees, card.members]);

  // Reset form when card changes or editing starts
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || "");
  }, [card.title, card.description, isEditing]);

  useEffect(() => {
    const fetchComments = async () => {
      if (!isEditing) return;
      setIsLoadingComments(true);
      try {
        const response = await api.getCardComments(card.id);
        setComments(response.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load comments");
      } finally {
        setIsLoadingComments(false);
      }
    };
    fetchComments();
  }, [isEditing, card.id]);

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Card title is required");
    setIsLoading(true);
    const toastId = toast.loading("Saving card...");
    try {
      const updatedCard = await api.updateCard(card.id, {
        title: title.trim(),
        description: description.trim() || null,
      });

      // Call parent update handler if provided
      if (onCardUpdate) {
        onCardUpdate(
          updatedCard.data || {
            ...card,
            title: title.trim(),
            description: description.trim(),
          }
        );
      }

      setIsEditing(false);
      toast.success("Card updated!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to update card.", {
        id: toastId,
      });
      setTitle(card.title);
      setDescription(card.description || "");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle(card.title);
    setDescription(card.description || "");
    setNewComment("");
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const toastId = toast.loading("Deleting card...");
    try {
      await api.deleteCard(card.id);
      toast.success("Card deleted.", { id: toastId });
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to delete card.", {
        id: toastId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") handleCancel();
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const toastId = toast.loading("Adding comment...");
    try {
      await api.addCommentToCard(card.id, newComment.trim());
      const response = await api.getCardComments(card.id);
      setComments(response.data || []);
      setNewComment("");
      toast.success("Comment added", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to add comment.", {
        id: toastId,
      });
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.deleteCommentFromCard(card.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to delete comment.");
    }
  };

  // Fixed: Better member assignment logic
  const handleAssign = async (userId) => {
    if (!userId) return;

    // Check if user is already assigned
    const isAlreadyAssigned = assignedMembers.some((m) => m.id === userId);

    if (isAlreadyAssigned) {
      return toast.error("User already assigned");
    }

    setIsLoading(true);
    const toastId = toast.loading("Assigning member...");

    try {
      const response = await api.assignUserToCard(card.id, userId);

      // Find the user in members array
      const userToAssign = members.find((u) => u.User?.id === userId);

      if (userToAssign) {
        const newAssignee = {
          id: userToAssign.User.id,
          name: userToAssign.User.name,
          email: userToAssign.User.email,
        };

        setAssignedMembers((prev) => [...prev, newAssignee]);
        toast.success(`${userToAssign.User.name} assigned`, { id: toastId });

        // Update parent if callback provided
        if (onCardUpdate) {
          const updatedCard = { ...card };
          updatedCard.assignees = [...assignedMembers, newAssignee];
          onCardUpdate(updatedCard);
        }
      } else {
        toast.error("User not found", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to assign member.", {
        id: toastId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 Fixed Unassign with UUID
  const handleUnassign = async (userId) => {
    // Find the user before removing
    const userToUnassign = assignedMembers.find((m) => m.id === userId);

    if (!userToUnassign) {
      return toast.error("User not found in assignments");
    }

    setIsLoading(true);
    const toastId = toast.loading("Unassigning member...");

    try {
      await api.removeUserFromCard(card.id, userId);

      // Remove from local state
      setAssignedMembers((prev) => prev.filter((m) => m.id !== userId));

      toast.success(`${userToUnassign.name} unassigned`, { id: toastId });

      // Update parent if callback provided
      if (onCardUpdate) {
        const updatedCard = { ...card };
        updatedCard.assignees = assignedMembers.filter((m) => m.id !== userId);
        onCardUpdate(updatedCard);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to unassign member.", {
        id: toastId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fixed: Better available members calculation
  const getAvailableMembers = () => {
    if (!Array.isArray(members) || !Array.isArray(assignedMembers)) {
      return [];
    }


    const available = members.filter((member) => {
      const memberUserId = member.User?.id;
      return !assignedMembers.some(
        (assigned) => assigned.User?.id === memberUserId
      );
    });

    return available;
  };

  const availableMembers = getAvailableMembers();

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-blue-500 rounded-lg shadow-lg p-4 relative">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Members
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {assignedMembers && assignedMembers.length > 0 ? (
                assignedMembers.map((member) => (
                  <div
                    key={`assigned-${member.id}`}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                      String(member.id) === String(currentUser?.id)
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    <span>{member.name || "Unknown"}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleUnassign(member.id)}
                        className="text-blue-600 hover:text-red-600 transition-colors"
                        disabled={isLoading}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No members assigned
                </p>
              )}
            </div>
            {/* Assign New Member - Admin only */}
            {isAdmin && getAvailableMembers().length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssign(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
                value=""
              >
                <option value="">+ Assign Member</option>
                {getAvailableMembers().map((member) => {
                  return (
                    <option
                      key={`available-${member.User.id}`}
                      value={member.User.id} // ✅ use actual userId
                    >
                      {member.User.name}
                    </option>
                  );
                })}
              </select>
            )}

            {isAdmin &&
              getAvailableMembers().length === 0 &&
              assignedMembers.length < members.length && (
                <p className="text-sm text-gray-500 italic">
                  All members are assigned
                </p>
              )}
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3 mb-3 bg-gray-50">
              {isLoadingComments ? (
                <p className="text-sm text-gray-500">Loading comments...</p>
              ) : comments.length > 0 ? (
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-white p-2 rounded border flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-700">
                          {getCommentUserName(comment)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {getCommentText(comment)}
                        </div>
                      </div>
                      {(isAdmin ||
                        String(comment.userId) === String(currentUser?.id)) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-500 hover:text-red-700 text-xs ml-2 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No comments yet</p>
              )}
            </div>
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </form>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={isLoading || !title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Card?"
      >
        Are you sure you want to delete the card "<strong>{card.title}</strong>
        "? This action cannot be undone.
      </ConfirmationModal>

      <Draggable draggableId={String(card.id)} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`bg-white border border-gray-200 rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group relative ${
              snapshot.isDragging
                ? "shadow-lg border-blue-500 ring-2 ring-blue-500 rotate-2"
                : ""
            }`}
            onClick={() => setIsEditing(true)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 leading-5">
                  {card.title}
                </h4>
                {card.description && (
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 mb-2">
                    {card.description}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmOpen(true);
                }}
                disabled={isLoading}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all disabled:opacity-50"
                title="Delete card"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1">
                {assignedMembers && assignedMembers.length > 0 ? (
                  <>
                    {assignedMembers.slice(0, 3).map((member) => (
                      <div
                        key={`avatar-${member.id}`}
                        className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white shadow-sm"
                        title={member.name}
                      >
                        {String(member.name || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    ))}
                    {assignedMembers.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center border-2 border-white shadow-sm">
                        +{assignedMembers.length - 3}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-gray-400">No assignees</div>
                )}
              </div>
              {comments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{comments.length}</span>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
              Click to edit • Drag to move
            </div>
          </div>
        )}
      </Draggable>
    </>
  );
};

export default Card;
