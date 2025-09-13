// models/associations.js
import User from "./User.js";
import Board from "./Board.js";
import BoardMember from "./BoardMember.js";
import Invite from "./Invite.js";
import Column from "./Column.js";
import Card from "./Card.js";
import CardAssignment from "./CardAssignment.js";
import CardComment from "./CardComment.js";

// User ↔ Board (Owner relationship)
User.hasMany(Board, { 
  foreignKey: "ownerId", 
  as: "OwnedBoards",
  onDelete: "CASCADE"
});
Board.belongsTo(User, { 
  foreignKey: "ownerId", 
  as: "Owner" 
});

// Board ↔ BoardMembers
Board.hasMany(BoardMember, { 
  foreignKey: "boardId", 
  as: "Members",
  onDelete: "CASCADE"
});
BoardMember.belongsTo(Board, { 
  foreignKey: "boardId", 
  as: "Board" 
});

// User ↔ BoardMembers
User.hasMany(BoardMember, { 
  foreignKey: "userId", 
  as: "BoardMemberships",
  onDelete: "CASCADE"
});
BoardMember.belongsTo(User, { 
  foreignKey: "userId", 
  as: "User" 
});

// Many-to-Many: User ↔ Board (through BoardMember)
User.belongsToMany(Board, {
  through: BoardMember,
  foreignKey: "userId",
  otherKey: "boardId",
  as: "MemberBoards"
});
Board.belongsToMany(User, {
  through: BoardMember,
  foreignKey: "boardId",
  otherKey: "userId",
  as: "BoardUsers"
});

// Board ↔ Invites
Board.hasMany(Invite, { 
  foreignKey: "boardId", 
  as: "Invites",
  onDelete: "CASCADE"
});
Invite.belongsTo(Board, { 
  foreignKey: "boardId", 
  as: "Board" 
});

// User ↔ Invites (Inviter relationship)
User.hasMany(Invite, { 
  foreignKey: "inviterId", 
  as: "SentInvites",
  onDelete: "CASCADE"
});
Invite.belongsTo(User, { 
  foreignKey: "inviterId", 
  as: "Inviter" 
});

// Board ↔ Columns
Board.hasMany(Column, { 
  foreignKey: "boardId", 
  as: "Columns",
  onDelete: "CASCADE"
});
Column.belongsTo(Board, { 
  foreignKey: "boardId", 
  as: "Board" 
});

// Column ↔ Cards
Column.hasMany(Card, { 
  foreignKey: "columnId", 
  as: "Cards",
  onDelete: "CASCADE"
});
Card.belongsTo(Column, { 
  foreignKey: "columnId", 
  as: "Column" 
});

// Card ↔ CardAssignments
Card.hasMany(CardAssignment, { 
  foreignKey: "cardId", 
  as: "Assignments",
  onDelete: "CASCADE"
});
CardAssignment.belongsTo(Card, { 
  foreignKey: "cardId", 
  as: "Card" 
});

// User ↔ CardAssignments
User.hasMany(CardAssignment, { 
  foreignKey: "userId", 
  as: "CardAssignments",
  onDelete: "CASCADE"
});
CardAssignment.belongsTo(User, { 
  foreignKey: "userId", 
  as: "User" 
});

// Many-to-Many: Card ↔ User (through CardAssignment)
Card.belongsToMany(User, {
  through: CardAssignment,
  foreignKey: "cardId",
  otherKey: "userId",
  as: "Assignees"
});
User.belongsToMany(Card, {
  through: CardAssignment,
  foreignKey: "userId",
  otherKey: "cardId",
  as: "AssignedCards"
});

// Card ↔ CardComments
Card.hasMany(CardComment, { 
  foreignKey: "cardId", 
  as: "Comments",
  onDelete: "CASCADE"
});
CardComment.belongsTo(Card, { 
  foreignKey: "cardId", 
  as: "Card" 
});

// User ↔ CardComments
User.hasMany(CardComment, { 
  foreignKey: "userId", 
  as: "Comments",
  onDelete: "CASCADE"
});
CardComment.belongsTo(User, { 
  foreignKey: "userId", 
  as: "User" 
});

export {
  User,
  Board,
  BoardMember,
  Invite,
  Column,
  Card,
  CardAssignment,
  CardComment,
};