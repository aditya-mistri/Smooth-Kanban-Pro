// client/src/services/api.js
import axios from "axios";

/* ------------------------
   🔧 Axios Instance
------------------------- */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to every request if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Log all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    console.error("❌ API Request Error:", error);
    return Promise.reject(error);
  }
);

// Log all responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(
        "❌ API Response Error:",
        error.response.status,
        error.response.data
      );
    } else {
      console.error("❌ API Network Error:", error.message);
    }
    return Promise.reject(error);
  }
);

/* ------------------------
   🔐 Auth APIs
------------------------- */
api.signup = (userData) => api.post("/auth/signup", userData);
api.login = (credentials) => api.post("/auth/login", credentials);
api.getProfile = () => api.get("/auth/profile");
api.logout = () => api.post("/auth/logout");

/* ------------------------
   📋 Board APIs
------------------------- */
// Core
api.fetchBoards = () => api.get("/boards");
api.getBoard = (boardId) => api.get(`/boards/${boardId}`);
api.createBoard = (boardData) => api.post("/boards", boardData);
api.updateBoard = (boardId, boardData) =>
  api.put(`/boards/${boardId}`, boardData);
api.deleteBoard = (boardId) => api.delete(`/boards/${boardId}`);

// Membership
api.getBoardMembers = (boardId) => api.get(`/boards/${boardId}/members`);
api.inviteToBoard = (boardId, inviteeEmail) =>
  api.post(`/boards/${boardId}/invite`, { inviteeEmail });
api.removeBoardMember = (boardId, userId) =>
  api.delete(`/boards/${boardId}/members/${userId}`);
api.leaveBoard = (boardId) => api.post(`/boards/${boardId}/leave`);

// Ownership / Admin
api.transferBoardOwnership = (boardId, newOwnerId) =>
  api.post(`/boards/${boardId}/transfer`, { newOwnerId });

/* ------------------------
   📂 Column APIs
------------------------- */
api.createColumn = (boardId, columnData) =>
  api.post(`/columns/${boardId}`, columnData);
api.updateColumn = (columnId, columnData) =>
  api.put(`/columns/${columnId}`, columnData);
api.reorderColumns = (boardId, orderedIds) =>
  api.put(`/columns/reorder/${boardId}`, { orderedIds });
api.deleteColumn = (columnId) => api.delete(`/columns/${columnId}`);

/* ------------------------
   🃏 Card APIs
------------------------- */

// Create a card in a column
api.createCard = (columnId, cardData) =>
  api.post(`/cards/${columnId}`, cardData);

// Get a single card (with details if your backend supports it)
api.getCard = (cardId) => api.get(`/cards/${cardId}`);

// Update a card (title, description, etc.)
api.updateCard = (cardId, cardData) => api.put(`/cards/${cardId}`, cardData);

// Move a card (change column/order)
api.moveCard = (cardId, moveData) => api.put(`/cards/${cardId}/move`, moveData);

// Update card status (if separate from move)
api.updateCardStatus = (cardId, status) =>
  api.put(`/cards/${cardId}/status`, { status });

// Delete a card
api.deleteCard = (cardId) => api.delete(`/cards/${cardId}`);

/* ------------------------
   👤 Assignment APIs (Fixed)
------------------------- */
// Assign a user to a card
api.assignUserToCard = (cardId, userId) =>
  api.post(`/cards/${cardId}/assign`, { userId });

// Unassign a user from a card
api.removeUserFromCard = (cardId, userId) =>
  api.delete(`/cards/${cardId}/assign/${userId}`);

/* ------------------------
   💬 Comment APIs (Fixed)
------------------------- */
// Add a comment to a card (using correct field name)
api.addCommentToCard = (cardId, comment) =>
  api.post(`/cards/${cardId}/comments`, { comment });

// Delete a comment from a card
api.deleteCommentFromCard = (cardId, commentId) =>
  api.delete(`/cards/${cardId}/comments/${commentId}`);

// Get all comments for a card
api.getCardComments = (cardId) => api.get(`/cards/${cardId}/comments`);

/* ------------------------
   ✉️ Invite APIs
------------------------- */
api.getReceivedInvites = () => api.get("/invites/received");
api.respondToInvite = (inviteId, action) =>
  api.post(`/invites/${inviteId}/respond`, { action });

/* ------------------------
   🛠️ Admin APIs
------------------------- */
api.getAdminStats = () => api.get("/admin/stats");

export default api;
