# Inventory Management System - Backend Setup Guide

## 📋 Quick Setup (5 Minutes)

### 1️⃣ **Database Setup (pgAdmin4)**


# Open pgAdmin4
# Right-click Databases → Create → Database
# Name: inventory_db
# Owner: postgres
# Click Save

# Right-click inventory_db → Query Tool
# Copy entire database/schema.sql
# Press F5 to execute

## Start Server

# Navigate to backend folder
cd inventory-management-system/backend

# Install dependencies
npm install

# Copy environment file
# Edit backend/.env with your PostgreSQL password:
# DB_PASSWORD=your_password_here

## Testing APIs

# 1. Health check
curl http://localhost:3000/api/health

# 2. Get all users
curl http://localhost:3000/api/users

# 3. Get user by ID
curl http://localhost:3000/api/users/1

# 4. Create new user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"123","role":"sales"}'

# 5. Update user
curl -X PUT http://localhost:3000/api/users/5 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","role":"warehouse"}'

# 6. Delete user
curl -X DELETE http://localhost:3000/api/users/5

## 📁 Project Structure

inventory-management-system/
├── backend/
│   ├── src/
│   │   ├── models/User.js        ← Business logic
│   │   ├── controllers/          ← HTTP handlers
│   │   ├── routes/               ← API endpoints
│   │   ├── db/pool.js            ← Database connection
│   │   └── app.js                ← Express server
│   ├── typescript-demo/          ← TypeScript files (teacher)
│   ├── package.json
│   └── .env                      ← Configuration
├── database/schema.sql           ← 12 tables
└── docs/                         ← Documentation
