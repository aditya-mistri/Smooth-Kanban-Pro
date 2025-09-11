import { useState, useEffect } from "react";
import BoardView from "./components/BoardView";
import api from "./services/api";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 text-center max-w-md mx-4">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Loading Board</h2>
          <p className="text-gray-600">Please wait while we set up your workspace...</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 text-center">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Board Found</h2>
          <p className="text-gray-600">Unable to load or create a board.</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/board/:id" element={<BoardView />} />
        {/* Redirect root path to the board */}
        <Route path="/" element={<Navigate to={`/board/${board.id}`} replace />} />
        {/* Catch all other routes and redirect to board */}
        <Route path="*" element={<Navigate to={`/board/${board.id}`} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;