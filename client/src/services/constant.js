export const SOCKET_EVENTS = {

  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  
  // Board events
  JOIN_BOARD: 'join_board',
  LEAVE_BOARD: 'leave_board',
  BOARD_UPDATED: 'board_updated',
  BOARD_CREATED: 'board_created',
  BOARD_DELETED: 'board_deleted',
  USER_JOINED_BOARD: 'user_joined_board',
  USER_LEFT_BOARD: 'user_left_board',
  
  // Column events
  COLUMN_CREATED: 'column_created',
  COLUMN_UPDATED: 'column_updated',
  COLUMN_DELETED: 'column_deleted',
  COLUMNS_REORDERED: 'columns_reordered',
  
  // Card events
  CARD_CREATED: 'card_created',
  CARD_UPDATED: 'card_updated',
  CARD_DELETED: 'card_deleted',
  CARD_MOVED: 'card_moved',
  CARD_ASSIGNED: 'card_assigned',
  CARD_UNASSIGNED: 'card_unassigned',
  CARD_COMMENT_ADDED: 'card_comment_added',
  CARD_STATUS_CHANGED: 'card_status_changed',
  
  // Member events
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_UPDATED: 'member_updated',
  MEMBER_ROLE_CHANGED: 'member_role_changed',
  
  // Invite events
  INVITE_SENT: 'invite_sent',
  INVITE_ACCEPTED: 'invite_accepted',
  INVITE_DECLINED: 'invite_declined',
  
  // Real-time collaboration
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  USER_TYPING: 'user_typing',
  CURSOR_MOVE: 'cursor_move',
  USER_CURSOR: 'user_cursor',
  
  // User presence
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  USER_DISCONNECTED: 'user_disconnected',
  ONLINE_USERS_UPDATE: 'online_users_update',
  
  // Notifications
  NOTIFICATION: 'notification',
  SYSTEM_NOTIFICATION: 'system_notification',
  ERROR_NOTIFICATION: 'error_notification'
};