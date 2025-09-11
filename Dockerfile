# Node dependencies (install fresh in container)
client/node_modules
server/node_modules

# Build outputs (rebuilt in container)
client/dist
server/dist
client/build
server/build

# Logs
*.log
logs

# Local envs
.env
client/.env
server/.env

# Git + Docker metadata
.git
.gitignore
.dockerignore

# System + editor
.vscode
.DS_Store
Thumbs.db

# Temporary
tmp
