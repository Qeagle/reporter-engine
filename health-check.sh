#!/bin/bash

echo "🏥 Reporter Engine Production Health Check"
echo "========================================"

# Check if server is running
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend server is running on port 3001"
    
    # Get health data
    HEALTH_DATA=$(curl -s http://localhost:3001/api/health)
    echo "📊 Health Status: $(echo $HEALTH_DATA | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
    echo "🕐 Timestamp: $(echo $HEALTH_DATA | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)"
    
    # Check database health
    if curl -s http://localhost:3001/api/health/database > /dev/null; then
        echo "✅ Database is accessible"
        DB_DATA=$(curl -s http://localhost:3001/api/health/database)
        echo "👥 Users: $(echo $DB_DATA | grep -o '"users":[0-9]*' | cut -d':' -f2)"
        echo "📁 Projects: $(echo $DB_DATA | grep -o '"projects":[0-9]*' | cut -d':' -f2)"
        echo "🧪 Test Runs: $(echo $DB_DATA | grep -o '"testRuns":[0-9]*' | cut -d':' -f2)"
    else
        echo "❌ Database health check failed"
    fi
    
else
    echo "❌ Backend server is not responding on port 3001"
    echo "🔍 Checking if process is running..."
    
    if pgrep -f "node server/index.js" > /dev/null; then
        echo "⚠️  Process is running but not responding"
        echo "📋 Process info:"
        ps aux | grep "node server/index.js" | grep -v grep
    else
        echo "❌ No server process found"
        echo "💡 To start: ./start-production.sh or pm2 start ecosystem.config.js"
    fi
fi

echo ""
echo "🌐 Testing frontend (if served by backend)..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    echo "✅ Frontend is being served successfully"
else
    echo "⚠️  Frontend may not be accessible"
fi

echo ""
echo "📱 Access URLs:"
echo "   Main App: http://localhost:3001"
echo "   API Health: http://localhost:3001/api/health"
echo "   Database Health: http://localhost:3001/api/health/database"
