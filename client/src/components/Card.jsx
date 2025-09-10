import React, { useState } from "react";
import api from "../services/api";

const Card = ({ card }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");

  const handleSave = async () => {
    try {
      await api.updateCard(card.id, { title, description });
      // Socket will broadcast card_updated
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating card:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteCard(card.id);
      // Socket will broadcast card_deleted
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  };

  if (isEditing) {
    return (
      <div className="card card-edit">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Card title"
          className="card-edit-title"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          className="card-edit-description"
        />
        <div className="card-actions">
          <button onClick={handleSave}>Save</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-content">
        <h3>{card.title}</h3>
        {card.description && <p>{card.description}</p>}
      </div>
      <div className="card-actions">
        <button onClick={() => setIsEditing(true)} className="card-edit-button">
          Edit
        </button>
        <button onClick={handleDelete} className="card-delete-button">
          Delete
        </button>
      </div>
    </div>
  );
};

export default Card;
