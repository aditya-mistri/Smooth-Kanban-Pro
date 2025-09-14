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
        className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-6 text-gray-700 leading-relaxed">{children}</div>
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const getCommentText = (c) => c?.comment ?? c?.text ?? "";
const getCommentUserName = (c) =>
  c?.User?.name ?? c?.user?.name ?? c?.userName ?? "Unknown";

const Card = ({ card, index, members = [], onCardUpdate, onCardMove, columnId }) => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Fixed: Normalize assignees data structure and ensure array
  const getInitialAssignees = () => {
    const assignees = card.Assignees || card.assignees || card.members || [];
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
      if (!isExpanded) return;
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
  }, [isExpanded, card.id]);

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Card title is required");
    setIsLoading(true);
    const toastId = toast.loading("Saving card...");
    try {
      const updatedCard = await api.updateCard(card.id, {
        title: title.trim(),
        description: description.trim() || null,
      });

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
      // The parent board component should handle removing from UI via real-time updates
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
    if (e.key === "Enter" && !e.shiftKey && e.target.tagName !== "TEXTAREA") {
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

  const handleAssign = async (userId) => {
    if (!userId) return;
    const isAlreadyAssigned = assignedMembers.some((m) => m.id === userId);
    if (isAlreadyAssigned) {
      return toast.error("User already assigned");
    }

    setIsLoading(true);
    const toastId = toast.loading("Assigning member...");

    try {
      await api.assignUserToCard(card.id, userId);
      const userToAssign = members.find((u) => u.User?.id === userId);

      if (userToAssign) {
        const newAssignee = {
          id: userToAssign.User.id,
          name: userToAssign.User.name,
          email: userToAssign.User.email,
        };

        setAssignedMembers((prev) => [...prev, newAssignee]);
        toast.success(`${userToAssign.User.name} assigned`, { id: toastId });

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
      setShowAssignDropdown(false);
    }
  };

  const handleUnassign = async (userId) => {
    const userToUnassign = assignedMembers.find((m) => m.id === userId);
    if (!userToUnassign) {
      return toast.error("User not found in assignments");
    }

    setIsLoading(true);
    const toastId = toast.loading("Unassigning member...");

    try {
      await api.removeUserFromCard(card.id, userId);
      setAssignedMembers((prev) => prev.filter((m) => m.id !== userId));
      toast.success(`${userToUnassign.name} unassigned`, { id: toastId });

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

  // Handle card updates
  const handleCardUpdate = (updatedCard) => {
    setColumns(prevColumns => 
      prevColumns.map(column => ({
        ...column,
        cards: column.cards?.map(card => 
          card.id === updatedCard.id ? updatedCard : card
        ) || []
      }))
    );
  };

  const getAvailableMembers = () => {
    if (!Array.isArray(members) || !Array.isArray(assignedMembers)) {
      return [];
    }
    return members.filter((member) => {
      const memberUserId = member.User?.id;
      return !assignedMembers.some(
        (assigned) => String(assigned.id) === String(memberUserId)
      );
    });
  };

  const availableMembers = getAvailableMembers();

  // Expanded/Detail View
  if (isExpanded) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-start p-4 pt-8 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="text-2xl font-bold text-gray-900 w-full border-none outline-none bg-transparent resize-none"
                  disabled={isLoading}
                  autoFocus
                />
              ) : (
                <h2 className="text-2xl font-bold text-gray-900">{card.title}</h2>
              )}
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit card"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete card"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                Description
              </label>
              {isEditing ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for this card..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  disabled={isLoading}
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-lg min-h-[100px]">
                  {card.description ? (
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {card.description}
                    </p>
                  ) : (
                    <p className="text-gray-400 italic">No description provided</p>
                  )}
                </div>
              )}
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                Assigned Members ({assignedMembers.length})
              </label>
              
              <div className="flex flex-wrap gap-3 mb-4">
                {assignedMembers.length > 0 ? (
                  assignedMembers.map((member) => (
                    <div
                      key={`assigned-${member.id}`}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${
                        String(member.id) === String(currentUser?.id)
                          ? "bg-green-50 border-green-200 text-green-800"
                          : "bg-blue-50 border-blue-200 text-blue-800"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-current bg-opacity-20 flex items-center justify-center text-sm font-semibold">
                        {String(member.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{member.name || "Unknown"}</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleUnassign(member.id)}
                          className="ml-2 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                          disabled={isLoading}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 italic px-4 py-8 bg-gray-50 rounded-lg w-full text-center">
                    No members assigned to this card
                  </div>
                )}
              </div>

              {/* Assign Member Dropdown */}
              {isAdmin && availableMembers.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    disabled={isLoading}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Assign Member
                  </button>
                  
                  {showAssignDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="p-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-700">Available Members</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {availableMembers.map((member) => (
                          <button
                            key={`available-${member.User.id}`}
                            onClick={() => handleAssign(member.User.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                            disabled={isLoading}
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                              {String(member.User.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{member.User.name}</div>
                              {member.User.email && (
                                <div className="text-sm text-gray-500">{member.User.email}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                Comments ({comments.length})
              </label>
              
              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="mb-6">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {String(currentUser?.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isLoading}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Post
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {isLoadingComments ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 mt-2">Loading comments...</p>
                  </div>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {String(getCommentUserName(comment) || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {getCommentUserName(comment)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                          {getCommentText(comment)}
                        </p>
                      </div>
                      {(isAdmin || String(comment.userId) === String(currentUser?.id)) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 italic">
                    No comments yet. Be the first to comment!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          {isEditing && (
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="px-6 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading || !title.trim()}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Compact Card View
  return (
    <>
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Card"
      >
        Are you sure you want to delete the card "<strong>{card.title}</strong>"? 
        This action cannot be undone and will remove all comments and assignments.
      </ConfirmationModal>

      <Draggable draggableId={String(card.id)} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden ${
              snapshot.isDragging
                ? "shadow-xl border-blue-400 ring-2 ring-blue-100 rotate-1 scale-105"
                : "hover:border-gray-300"
            }`}
          >
            {/* Card Content */}
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <h4 
                  className="font-semibold text-gray-900 leading-tight cursor-pointer flex-1 pr-2"
                  onClick={() => setIsExpanded(true)}
                >
                  {card.title}
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmOpen(true);
                  }}
                  disabled={isLoading}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                  title="Delete card"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Description Preview */}
              {card.description && (
                <p 
                  className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-2 cursor-pointer"
                  onClick={() => setIsExpanded(true)}
                >
                  {card.description}
                </p>
              )}

              {/* Metadata Row */}
              <div className="flex items-center justify-between">
                {/* Assignees */}
                <div className="flex items-center gap-1">
                  {assignedMembers && assignedMembers.length > 0 ? (
                    <>
                      {assignedMembers.slice(0, 3).map((member, idx) => (
                        <div
                          key={`avatar-${member.id}`}
                          className={`w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs font-semibold flex items-center justify-center border-2 border-white shadow-sm ${
                            idx > 0 ? "-ml-2" : ""
                          }`}
                          style={{ zIndex: 3 - idx }}
                          title={member.name}
                        >
                          {String(member.name || "U").charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {assignedMembers.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-gray-500 text-white text-xs font-semibold flex items-center justify-center border-2 border-white shadow-sm -ml-2">
                          +{assignedMembers.length - 3}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-full">
                      Unassigned
                    </div>
                  )}
                </div>

                {/* Comments Count */}
                <div className="flex items-center gap-4">
                  {comments.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">{comments.length}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Click to expand indicator */}
            <div className="px-5 pb-4">
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full text-xs text-gray-400 hover:text-blue-600 transition-colors text-center py-2 rounded-lg hover:bg-blue-50"
              >
                Click to view details • Drag to move
              </button>
            </div>

            {/* Drag indicator */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-30 transition-opacity">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </div>
          </div>
        )}
      </Draggable>

      {/* Click outside to close assign dropdown */}
      {showAssignDropdown && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowAssignDropdown(false)}
        />
      )}
    </>
  );
};

export default Card;