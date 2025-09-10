# Deployment Guide

## Prerequisites
1. A Supabase account with PostgreSQL database
2. A Render.com account

## Deployment Steps

### 1. Supabase Setup
1. Create a new project in Supabase
2. Get your PostgreSQL connection string from the project settings
3. Keep the connection string safe for the next steps

### 2. Render.com Setup
1. Create a new Web Service
2. Connect your GitHub repository
3. Use the following settings:
   - Build Command: `docker build -t kanban-app .`
   - Start Command: `docker run -p 5000:5000 kanban-app`
   
### 3. Environment Variables
Set the following environment variables in Render.com:
- `DATABASE_URL`: Your Supabase PostgreSQL connection string
- `PORT`: 5000 (default)

### 4. Deploy
1. Trigger a manual deploy in Render.com
2. Wait for the build and deployment to complete
3. Your app will be available at the provided Render.com URL

## Notes
- The application uses a single Dockerfile that builds both frontend and backend
- Frontend static files are served from the Express server
- All API routes are prefixed with `/api`
- Make sure your Supabase database is accessible from Render.com's IP addresses
