#!/bin/bash

# Simple start script for development
echo "🚀 Starting Reporter Engine Development Environment"
echo ""
echo "Frontend (Vite): http://localhost:80"
echo "Backend (Node.js): http://localhost:3001"
echo "API Health Check: http://localhost:3001/api/health"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Start both services
npm run dev
