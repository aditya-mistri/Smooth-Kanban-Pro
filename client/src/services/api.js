import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

const api = {
  // Board operations
  createBoard: (data) => apiClient.post("/boards", data),
  getBoard: (id) => apiClient.get(`/boards/${id}`),
  getBoards: () => apiClient.get("/boards"),
  updateBoard: (id, data) => apiClient.put(`/boards/${id}`, data),
  deleteBoard: (id) => apiClient.delete(`/boards/${id}`),
  reorderColumns: (boardId, orderedIds) =>
    apiClient.put(`/boards/${boardId}/columns/reorder`, { orderedIds }),

  // Column operations
  createColumn: (boardId, data) =>
    apiClient.post(`/boards/${boardId}/columns`, data),
  updateColumn: (id, data) => apiClient.put(`/columns/${id}`, data),
  deleteColumn: (id) => apiClient.delete(`/columns/${id}`),

  // Card operations
  moveCard: (cardId, data) =>
    apiClient.put(`/cards/${cardId}/move`, data),
  createCard: (columnId, data) =>
    apiClient.post(`/columns/${columnId}/cards`, data),
  updateCard: (id, data) => apiClient.put(`/cards/${id}`, data),
  deleteCard: (id) => apiClient.delete(`/cards/${id}`),
  getCard: (id) => apiClient.get(`/cards/${id}`),
};

export default api;