import React, { useState, useEffect } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import api from "../services/api";
import socket from "../services/socket";

const BoardView = ({ board, setBoard }) => {
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // 🔹 Real-time listeners
  useEffect(() => {
    if (!board?.id) return;

    // join board room
    socket.emit("join_board", board.id);

    // Column events
    socket.on("column_created", (col) => {
      setBoard((prev) => ({
        ...prev,
        Columns: [...prev.Columns, { ...col, Cards: [] }],
      }));
    });

    socket.on("column_updated", (col) => {
      setBoard((prev) => ({
        ...prev,
        Columns: prev.Columns.map((c) => (c.id === col.id ? col : c)),
      }));
    });

    // Card events
    socket.on("card_created", (card) => {
      setBoard((prev) => ({
        ...prev,
        Columns: prev.Columns.map((c) =>
          c.id === card.ColumnId ? { ...c, Cards: [...c.Cards, card] } : c
        ),
      }));
    });

    socket.on("card_updated", (card) => {
      setBoard((prev) => ({
        ...prev,
        Columns: prev.Columns.map((c) =>
          c.id === card.ColumnId
            ? {
                ...c,
                Cards: c.Cards.map((cc) => (cc.id === card.id ? card : cc)),
              }
            : {
                ...c,
                Cards: c.Cards.filter((cc) => cc.id !== card.id),
              }
        ),
      }));
    });

    socket.on("card_deleted", ({ id }) => {
      setBoard((prev) => ({
        ...prev,
        Columns: prev.Columns.map((c) => ({
          ...c,
          Cards: c.Cards.filter((card) => card.id !== id),
        })),
      }));
    });

    return () => {
      socket.off("column_created");
      socket.off("column_updated");
      socket.off("card_created");
      socket.off("card_updated");
      socket.off("card_deleted");
    };
  }, [board?.id, setBoard]);
