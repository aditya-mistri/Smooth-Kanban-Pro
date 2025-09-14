// socket/events.js

// Socket Event Constants
export const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  RECONNECT: "reconnect",

  // Board events
  JOIN_BOARD: "join_board",
  LEAVE_BOARD: "leave_board",
  BOARD_UPDATED: "board_updated",
  BOARD_CREATED: "board_created",
  BOARD_DELETED: "board_deleted",
  USER_JOINED_BOARD: "user_joined_board",
  USER_LEFT_BOARD: "user_left_board",

  // Column events
  COLUMN_CREATED: "column_created",
  COLUMN_UPDATED: "column_updated",
  COLUMN_DELETED: "column_deleted",
  COLUMNS_REORDERED: "columns_reordered",

  // Card events
  CARD_CREATED: "card_created",
  CARD_UPDATED: "card_updated",
  CARD_DELETED: "card_deleted",
  CARD_MOVED: "card_moved",
  CARD_ASSIGNED: "card_assigned",
  CARD_UNASSIGNED: "card_unassigned",
  CARD_COMMENT_ADDED: "card_comment_added",
  CARD_STATUS_CHANGED: "card_status_changed",

  // Member events
  MEMBER_ADDED: "member_added",
  MEMBER_REMOVED: "member_removed",
  MEMBER_UPDATED: "member_updated",
  MEMBER_ROLE_CHANGED: "member_role_changed",

  // Invite events
  INVITE_SENT: "invite_sent",
  INVITE_ACCEPTED: "invite_accepted",
  INVITE_DECLINED: "invite_declined",

  // Real-time collaboration
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  USER_TYPING: "user_typing",
  CURSOR_MOVE: "cursor_move",
  USER_CURSOR: "user_cursor",

  // User presence
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",
  USER_DISCONNECTED: "user_disconnected",
  ONLINE_USERS_UPDATE: "online_users_update",

  // Notifications
  NOTIFICATION: "notification",
  SYSTEM_NOTIFICATION: "system_notification",
  ERROR_NOTIFICATION: "error_notification",
};

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
};

// Socket Event Helpers
export class SocketEventHelper {
  constructor(socketManager) {
    this.socketManager = socketManager;
  }

  // Board-related events
  emitBoardUpdated(boardId, boardData, excludeUserId = null) {
    const eventData = {
      boardId,
      board: boardData,
      timestamp: new Date(),
    };

    if (excludeUserId) {
      this.socketManager.io
        .to(boardId.toString())
        .except(this.socketManager.connectedUsers.get(excludeUserId))
        .emit(SOCKET_EVENTS.BOARD_UPDATED, eventData);
    } else {
      this.socketManager.emitToBoard(
        boardId,
        SOCKET_EVENTS.BOARD_UPDATED,
        eventData
      );
    }
  }

  emitBoardCreated(boardData, userId) {
    this.socketManager.emitToUser(userId, SOCKET_EVENTS.BOARD_CREATED, {
      board: boardData,
      timestamp: new Date(),
    });
  }

  emitBoardDeleted(boardId, boardName) {
    this.socketManager.io
      .to(boardId.toString())
      .emit(SOCKET_EVENTS.BOARD_DELETED, {
        id: boardId,
        name: boardName,
        timestamp: new Date(),
      });
  }

  // Column-related events
  emitColumnCreated(boardId, columnData) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.COLUMN_CREATED, {
      boardId,
      column: columnData,
      timestamp: new Date(),
    });
  }

  emitColumnUpdated(boardId, columnData) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.COLUMN_UPDATED, {
      boardId,
      column: columnData,
      timestamp: new Date(),
    });
  }

  emitColumnDeleted(boardId, columnId) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.COLUMN_DELETED, {
      boardId,
      columnId,
      timestamp: new Date(),
    });
  }

  emitColumnsReordered(boardId, orderedColumns) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.COLUMNS_REORDERED, {
      boardId,
      columns: orderedColumns,
      timestamp: new Date(),
    });
  }

  // Card-related events
  emitCardCreated(boardId, cardData) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.CARD_CREATED, {
      boardId,
      card: cardData,
      timestamp: new Date(),
    });
  }

  emitCardUpdated(boardId, cardData, updatedFields = []) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.CARD_UPDATED, {
      boardId,
      card: cardData,
      updatedFields,
      timestamp: new Date(),
    });
  }

  emitCardMoved(boardId, cardData, fromColumnId, toColumnId) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.CARD_MOVED, {
      boardId,
      card: cardData,
      fromColumnId,
      toColumnId,
      timestamp: new Date(),
    });
  }

  emitCardDeleted(boardId, cardId, columnId) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.CARD_DELETED, {
      boardId,
      cardId,
      columnId,
      timestamp: new Date(),
    });
  }

  // Assignment events
  emitCardAssigned(boardId, cardId, assigneeData, assigner) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.CARD_ASSIGNED, {
      boardId,
      cardId,
      assignee: assigneeData,
      assigner,
      timestamp: new Date(),
    });

    // Send notification to the assigned user
    this.emitNotification(assigneeData.id, {
      type: NOTIFICATION_TYPES.INFO,
      title: "Card Assignment",
      message: `You have been assigned to a card by ${assigner.name}`,
      data: { cardId, boardId },
    });
  }

  emitCardUnassigned(boardId, cardId, unassignedUser, unassigner) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.CARD_UNASSIGNED, {
      boardId,
      cardId,
      unassignedUser,
      unassigner,
      timestamp: new Date(),
    });
  }

  // Comment events
  emitCardCommentAdded(boardId, cardId, commentData, author) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.CARD_COMMENT_ADDED, {
      boardId,
      cardId,
      comment: commentData,
      author,
      timestamp: new Date(),
    });
  }

  // Member events
  emitMemberAdded(boardId, memberData, inviter) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.MEMBER_ADDED, {
      boardId,
      member: memberData,
      inviter,
      timestamp: new Date(),
    });

    // Send notification to the new member
    this.emitNotification(memberData.userId, {
      type: NOTIFICATION_TYPES.SUCCESS,
      title: "Board Access Granted",
      message: `You have been added to the board by ${inviter.name}`,
      data: { boardId },
    });
  }

  emitMemberRemoved(boardId, removedMember, remover) {
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.MEMBER_REMOVED, {
      boardId,
      removedMember,
      remover,
      timestamp: new Date(),
    });

    // Send notification to the removed member
    this.emitNotification(removedMember.userId, {
      type: NOTIFICATION_TYPES.WARNING,
      title: "Board Access Removed",
      message: `You have been removed from the board`,
      data: { boardId },
    });
  }

  // Invite events
  emitInviteSent(inviterId, inviteData) {
    this.emitNotification(inviterId, {
      type: NOTIFICATION_TYPES.SUCCESS,
      title: "Invite Sent",
      message: `Invitation sent to ${inviteData.inviteeEmail}`,
      data: { inviteId: inviteData.id, boardId: inviteData.boardId },
    });
  }

  emitInviteAccepted(boardId, inviterData, acceptedUser) {
    this.emitNotification(inviterData.id, {
      type: NOTIFICATION_TYPES.SUCCESS,
      title: "Invite Accepted",
      message: `${acceptedUser.name} accepted your board invitation`,
      data: { boardId },
    });
  }

  emitInviteDeclined(inviterData, declinedUser, boardId) {
    this.emitNotification(inviterData.id, {
      type: NOTIFICATION_TYPES.INFO,
      title: "Invite Declined",
      message: `${declinedUser.name} declined your board invitation`,
      data: { boardId },
    });
  }

  // Generic notification
  emitNotification(userId, notification) {
    this.socketManager.emitNotificationToUser(userId, notification);
  }

  emitBoardNotification(boardId, notification) {
    this.socketManager.emitNotificationToBoard(boardId, notification);
  }

  // System notifications
  emitSystemNotification(notification) {
    this.socketManager.io.emit(SOCKET_EVENTS.SYSTEM_NOTIFICATION, {
      ...notification,
      timestamp: new Date(),
    });
  }

  // Online users update
  async emitOnlineUsersUpdate(boardId) {
    const onlineUsers = await this.socketManager.getBoardOnlineUsers(boardId);
    this.socketManager.emitToBoard(boardId, SOCKET_EVENTS.ONLINE_USERS_UPDATE, {
      boardId,
      onlineUsers,
      count: onlineUsers.length,
      timestamp: new Date(),
    });
  }
}

// Utility function to create socket event data
export function createSocketEventData(eventType, data, additionalData = {}) {
  return {
    event: eventType,
    timestamp: new Date(),
    ...data,
    ...additionalData,
  };
}
