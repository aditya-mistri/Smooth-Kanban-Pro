import React, { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import Card from "./Card";
import api from "../services/api";

const Column = ({ column }) => {
  const [newCardTitle, setNewCardTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [columnTitle, setColumnTitle] = useState(column.title);

  // Add card (optimistic update not needed, socket will update UI)
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    try {
      await api.createCard(column.id, {
        title: newCardTitle,
        description: "",
      });
      // No local state update here → socket will broadcast card_created
      setNewCardTitle("");
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding card:", error);
    }
  };

  // Update column title
  const handleTitleUpdate = async () => {
    try {
      await api.updateColumn(column.id, { title: columnTitle });
      // Socket will broadcast column_updated
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Error updating column title:", error);
    }
  };

  return (
    <div className="column">
      {isEditingTitle ? (
        <div className="column-title-edit">
          <input
            type="text"
            value={columnTitle}
            onChange={(e) => setColumnTitle(e.target.value)}
            onBlur={handleTitleUpdate}
            onKeyPress={(e) => {
              if (e.key === "Enter") e.target.blur();
            }}
            autoFocus
          />
        </div>
      ) : (
        <h2 className="column-title" onClick={() => setIsEditingTitle(true)}>
          {columnTitle}
        </h2>
      )}

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-content ${
              snapshot.isDraggingOver ? "dragging-over" : ""
            }`}
          >
            {column.Cards?.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <Card card={card} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {isAdding ? (
        <form onSubmit={handleAddCard} className="add-card-form">
          <input
            type="text"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="Enter card title"
            autoFocus
          />
          <div className="add-card-actions">
            <button type="submit">Add</button>
            <button type="button" onClick={() => setIsAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="add-card-button" onClick={() => setIsAdding(true)}>
          + Add Card
        </button>
      )}
    </div>
  );
};

export default Column;
