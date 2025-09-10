import { useState, useEffect } from "react";
import BoardView from "./components/BoardView";
import api from "./services/api";
import "./App.css";

function App() {
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeBoard = async () => {
      try {
        // First, try to get existing boards
        const existingBoards = await api.getBoards();

        if (existingBoards.data && existingBoards.data.length > 0) {
          // Use the most recent board
          const response = await api.getBoard(existingBoards.data[0].id);
          setBoard(response.data);
        } else {
          // Create a new board if none exists
          const newBoard = await api.createBoard({
            name: "My Kanban Board",
          });

          // Create default columns
          const columns = ["To Do", "In Progress", "Done"];
          for (let i = 0; i < columns.length; i++) {
            await api.createColumn(newBoard.data.id, {
              title: columns[i],
              order: i,
            });
          }

          // Fetch the complete board with columns
          const response = await api.getBoard(newBoard.data.id);
          setBoard(response.data);
        }
      } catch (err) {
        setError("Failed to initialize board");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeBoard();
  }, []);

  if (error) return <div className="app-message error">Error: {error}</div>;
  if (isLoading) return <div className="app-message">Loading...</div>;
  if (!board) return <div className="app-message">No board found</div>;

  return (
    <div className="app">
      <BoardView board={board} setBoard={setBoard} />
    </div>
  );
}

export default App;
