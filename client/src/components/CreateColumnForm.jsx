import React, { useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import socketService from "../services/socket";

const CreateColumnForm = ({ boardId, onColumnCreated, onClose }) => {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsLoading(true);
    const toastId = toast.loading("Creating column...");
    try {
      const res = await api.createColumn(boardId, { name: title.trim() });
      onColumnCreated(res.data);
      toast.success("Column created!", { id: toastId });
      socketService.emit("column_created", res.data);
      setTitle("");
      onClose();
    } catch (error) {
      console.error("Error creating column:", error);
      toast.error(error.response?.data?.error || "Failed to create column", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleCreate();
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md w-80">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Column title"
        autoFocus
        disabled={isLoading}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleCreate}
          disabled={isLoading || !title.trim()}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Creating..." : "Create"}
        </button>
        <button
          onClick={onClose}
          disabled={isLoading}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CreateColumnForm;
