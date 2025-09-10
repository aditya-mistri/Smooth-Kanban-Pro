import React, { useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import api from "../services/api";

const BoardView = ({ board, setBoard }) => {
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Drop outside the list
    if (!destination) return;

    // No movement
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    try {
      // Update local state first for immediate feedback
      const newBoard = { ...board };
      const sourceColumn = newBoard.Columns.find(
        (col) => col.id === source.droppableId
      );
      const destColumn = newBoard.Columns.find(
        (col) => col.id === destination.droppableId
      );
      const card = sourceColumn.Cards[source.index];

      // Remove from source column
      sourceColumn.Cards.splice(source.index, 1);

      // Insert at destination
      destColumn.Cards.splice(destination.index, 0, {
        ...card,
        columnId: destination.droppableId,
      });

      setBoard(newBoard);

      // Then update the backend
      await api.updateCard(draggableId, {
        columnId: destination.droppableId,
        order: destination.index,
      });
    } catch (error) {
      console.error("Error updating card:", error);
      // Optionally revert the state if the API call fails
      // You might want to show an error message to the user
    }
  };

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;

    try {
      const response = await api.createColumn(board.id, {
        title: newColumnTitle,
        order: board.Columns.length,
      });

      setBoard({
        ...board,
        Columns: [...board.Columns, { ...response.data, Cards: [] }],
      });

      setNewColumnTitle("");
      setIsAddingColumn(false);
    } catch (error) {
      console.error("Error adding column:", error);
    }
  };

  const handleCardAdded = (columnId, newCard) => {
    const newBoard = { ...board };
    const column = newBoard.Columns.find((col) => col.id === columnId);
    if (column) {
      column.Cards = [...(column.Cards || []), newCard];
      setBoard(newBoard);
    }
  };

  const handleCardDeleted = (columnId, cardId) => {
    const newBoard = { ...board };
    const column = newBoard.Columns.find((col) => col.id === columnId);
    if (column) {
      column.Cards = column.Cards.filter((card) => card.id !== cardId);
      setBoard(newBoard);
    }
  };

  const handleCardUpdated = (columnId, updatedCard) => {
    const newBoard = { ...board };
    const column = newBoard.Columns.find((col) => col.id === columnId);
    if (column) {
      const cardIndex = column.Cards.findIndex(
        (card) => card.id === updatedCard.id
      );
      if (cardIndex !== -1) {
        column.Cards[cardIndex] = updatedCard;
        setBoard(newBoard);
      }
    }
  };

  const handleColumnUpdated = (columnId, newTitle) => {
    const newBoard = { ...board };
    const column = newBoard.Columns.find((col) => col.id === columnId);
    if (column) {
      column.title = newTitle;
      setBoard(newBoard);
    }
  };

  return (
    <div className="board">
      <h1>{board.name}</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board-columns">
          {board.Columns?.map((column) => (
            <Column
              key={column.id}
              column={column}
              onCardAdded={handleCardAdded}
              onCardDeleted={handleCardDeleted}
              onCardUpdated={handleCardUpdated}
              onColumnUpdated={handleColumnUpdated}
            />
          ))}
          {isAddingColumn ? (
            <form onSubmit={handleAddColumn} className="add-column-form">
              <input
                type="text"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Enter column title"
                autoFocus
              />
              <div className="add-column-actions">
                <button type="submit">Add</button>
                <button type="button" onClick={() => setIsAddingColumn(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              className="add-column-button"
              onClick={() => setIsAddingColumn(true)}
            >
              + Add Column
            </button>
          )}
        </div>
      </DragDropContext>
    </div>
  );
};

export default BoardView;
