import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from './constant';

class SocketClient {
  constructor() {
    this.socket = null;
    this.token = null;
    this.currentBoardId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = new Map();
  }

  log(...args) {
    const ts = new Date().toISOString();
  }

  error(...args) {
    const ts = new Date().toISOString();
    console.error(`[SocketClient][${ts}]`, ...args);
  }

  connect(token) {
    this.token = token;
    this.log('🔌 Connecting to server with token:', token);

    this.socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000
    });

    this.setupEventHandlers();
    return this.socket;
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      this.log('✅ Connected to server:', this.socket.id);
      this.reconnectAttempts = 0;

      if (this.currentBoardId) {
        this.log('🔄 Rejoining board after reconnect:', this.currentBoardId);
        this.joinBoard(this.currentBoardId);
      }

      this.emit('user_connected', { timestamp: new Date() });
    });

    this.socket.on('disconnect', (reason) => {
      this.error('❌ Disconnected from server:', reason);

      if (reason === 'io server disconnect') {
        this.log('🔁 Server disconnected me, trying manual reconnect');
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.error('⚠️ Connection error:', error.message);
      this.reconnectAttempts++;
      this.log('Reconnect attempt count:', this.reconnectAttempts);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.error('⛔ Max reconnection attempts reached');
        this.emit('connection_failed', { error: error.message });
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.log(`✅ Successfully reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', (error) => {
      this.error('⚠️ Reconnection error:', error.message);
    });

    this.socket.on('error', (error) => {
      this.error('🔥 Socket error:', error);
      if (typeof error === 'string' && error.includes('Authentication error')) {
        this.error('🚫 Authentication failed, disconnecting');
        this.disconnect();
        this.emit('auth_error', { error });
      }
    });

    // Catch-all for incoming events
    this.socket.onAny((event, ...args) => {
      this.log(`📡 Incoming event: ${event}`, args);
    });
  }

  // Board-related methods
  joinBoard(boardId) {
    if (this.socket && this.socket.connected) {
      this.currentBoardId = boardId;
      this.log(`📌 Joining board: ${boardId}`);
      this.socket.emit(SOCKET_EVENTS.JOIN_BOARD, boardId);
    } else {
      this.error(`Cannot join board ${boardId}, socket not connected`);
    }
  }

  leaveBoard(boardId) {
    if (this.socket && this.socket.connected) {
      this.log(`📤 Leaving board: ${boardId}`);
      this.socket.emit(SOCKET_EVENTS.LEAVE_BOARD, boardId);
      if (this.currentBoardId === boardId) {
        this.currentBoardId = null;
      }
    }
  }

  // Real-time collaboration methods
  startTyping(cardId, boardId) {
    if (this.socket && this.socket.connected) {
      this.log(`✏️ Start typing on card ${cardId} (board ${boardId})`);
      this.socket.emit(SOCKET_EVENTS.TYPING_START, { cardId, boardId });
    }
  }

  stopTyping(cardId, boardId) {
    if (this.socket && this.socket.connected) {
      this.log(`🛑 Stop typing on card ${cardId} (board ${boardId})`);
      this.socket.emit(SOCKET_EVENTS.TYPING_STOP, { cardId, boardId });
    }
  }

  moveCursor(boardId, position) {
    if (this.socket && this.socket.connected) {
      this.log(`🖱️ Cursor move on board ${boardId}`, position);
      this.socket.emit(SOCKET_EVENTS.CURSOR_MOVE, { boardId, position });
    }
  }

  // Event listener management
  on(event, callback) {
    if (this.socket) {
      this.log(`👂 Listening for event: ${event}`);
      this.socket.on(event, callback);

      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.log(`👋 Removing listener for event: ${event}`);
      this.socket.off(event, callback);

      if (this.eventListeners.has(event)) {
        const callbacks = this.eventListeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.log(`🚀 Emitting event: ${event}`, data);
      this.socket.emit(event, data);
    } else {
      this.error(`❌ Failed to emit ${event}, socket not connected`);
    }
  }

  // Utility methods
  isConnected() {
    return this.socket && this.socket.connected;
  }

  getCurrentBoardId() {
    return this.currentBoardId;
  }

  getSocketId() {
    return this.socket ? this.socket.id : null;
  }

  disconnect() {
    if (this.socket) {
      this.log('🔌 Disconnecting from server...');
      this.eventListeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.eventListeners.clear();

      this.socket.disconnect();
      this.socket = null;
      this.currentBoardId = null;
      this.log('✅ Disconnected from server');
    }
  }

  // Board-specific event listeners
  onBoardUpdated(callback) { this.on(SOCKET_EVENTS.BOARD_UPDATED, callback); }
  onCardCreated(callback) { this.on(SOCKET_EVENTS.CARD_CREATED, callback); }
  onCardUpdated(callback) { this.on(SOCKET_EVENTS.CARD_UPDATED, callback); }
  onCardMoved(callback) { this.on(SOCKET_EVENTS.CARD_MOVED, callback); }
  onCardDeleted(callback) { this.on(SOCKET_EVENTS.CARD_DELETED, callback); }
  onColumnCreated(callback) { this.on(SOCKET_EVENTS.COLUMN_CREATED, callback); }
  onColumnUpdated(callback) { this.on(SOCKET_EVENTS.COLUMN_UPDATED, callback); }
  onColumnDeleted(callback) { this.on(SOCKET_EVENTS.COLUMN_DELETED, callback); }
  onMemberAdded(callback) { this.on(SOCKET_EVENTS.MEMBER_ADDED, callback); }
  onMemberRemoved(callback) { this.on(SOCKET_EVENTS.MEMBER_REMOVED, callback); }
  onNotification(callback) { this.on(SOCKET_EVENTS.NOTIFICATION, callback); }
  onUserTyping(callback) { this.on(SOCKET_EVENTS.USER_TYPING, callback); }
  onUserCursor(callback) { this.on(SOCKET_EVENTS.USER_CURSOR, callback); }
  onOnlineUsersUpdate(callback) { this.on(SOCKET_EVENTS.ONLINE_USERS_UPDATE, callback); }
}

const socketClient = new SocketClient();
export default socketClient;
