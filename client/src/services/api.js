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

// --- Board Endpoints ---
const getAllBoards = () => apiClient.get('/boards');
const getBoard = (id) => apiClient.get(`/boards/${id}`);
const createBoard = (boardData) => apiClient.post('/boards', boardData);
const updateBoard = (id, boardData) => apiClient.put(`/boards/${id}`, boardData);
const deleteBoard = (id) => apiClient.delete(`/boards/${id}`);
const reorderColumns = (boardId, orderedIds) => apiClient.put(`/boards/${boardId}/columns/reorder`, { orderedIds });

// --- Column Endpoints ---
const createColumn = (boardId, columnData) => apiClient.post(`/boards/${boardId}/columns`, columnData);
const updateColumn = (id, columnData) => apiClient.put(`/columns/${id}`, columnData);
const deleteColumn = (id) => apiClient.delete(`/columns/${id}`);

// --- Card Endpoints ---
const createCard = (columnId, cardData) => apiClient.post(`/columns/${columnId}/cards`, cardData);
const updateCard = (id, cardData) => apiClient.put(`/cards/${id}`, cardData);
const deleteCard = (id) => apiClient.delete(`/cards/${id}`);
const moveCard = (cardId, moveData) => apiClient.put(`/cards/${cardId}/move`, moveData);


export default {
  getAllBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard,
  reorderColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  createCard,
  updateCard,
  deleteCard,
  moveCard
};
