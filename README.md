## Link - https://smooth-kanban-pro.onrender.com/

## Real-Time Kanban Board By ADITYA MISTRI
- > **A full-stack, collaborative task management application built with Node.js, Express, Sequelize, React, and Socket.IO. This project provides a seamless, real-time experience for managing tasks across multiple columns, with changes instantly reflected for all connected clients.**

- > **I Have used docker + Render for deployment of frontend and backend.**


## Development
```
-> Used Phase wise development 
Phase 1. Firstly I made sure to build a basic CRUD operative KANBAN Platform with minimal UI
Phase 2. Then I made sure to dockerize it and deployed it on RENDER.
Phase 3. Then I added WebSocket using JS socket.io library for realtime updates. -> Deployed Phase 2
Phase 4. Addition of LOGIN AUTH Functionality and Implement Role based access
Phase 5. Addition of REDIS 
```



## Features
- > Real-Time Collaboration: All changes (creating, updating, deleting, moving) are instantly broadcast to every user viewing the board.

- > Drag & Drop: Smoothly reorder cards within columns or move them between different columns using react-beautiful-dnd.

- > Live Notifications: Every action triggers a "snackbar" style notification, keeping all users informed of recent activity.

- > Full CRUD Functionality: Complete Create, Read, Update, and Delete operations for boards, columns, and cards.

- > Persistent Storage: All data is saved to a PostgreSQL database using the Sequelize ORM.

- > Optimistic-Free UI: The user interface relies on a single source of truth from the server, eliminating front-end race conditions and ensuring data consistency.

## Tech Stack
Backend
- > Runtime: Node.js

- > Framework: Express.js

- > Database: PostgreSQL

- > ORM: Sequelize

- > Real-Time Engine: Socket.IO

Frontend
- > Library: React

- > Build Tool: Vite

- > Styling: Tailwind CSS

- > API Client: Axios

- > Drag & Drop: react-beautiful-dnd

- > Notifications: react-hot-toast

- > Routing: react-router-dom
