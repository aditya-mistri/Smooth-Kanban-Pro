import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = {
  // Board operations
  createBoard: (data) => axios.post(`${API_URL}/boards`, data),
  getBoard: (id) => axios.get(`${API_URL}/boards/${id}`),
  getBoards: () => axios.get(`${API_URL}/boards`),

  // Column operations
  createColumn: (boardId, data) =>
    axios.post(`${API_URL}/boards/${boardId}/columns`, data),
  updateColumn: (id, data) => axios.put(`${API_URL}/columns/${id}`, data),

  // Card operations
  createCard: (columnId, data) =>
    axios.post(`${API_URL}/columns/${columnId}/cards`, data),
  updateCard: (id, data) => axios.put(`${API_URL}/cards/${id}`, data),
  deleteCard: (id) => axios.delete(`${API_URL}/cards/${id}`),
};

export default api;
