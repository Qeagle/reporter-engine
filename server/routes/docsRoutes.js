import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve API documentation
router.get('/', (req, res) => {
  try {
    const docsPath = path.join(__dirname, '../../docs/API.md');
    const apiDocs = fs.readFileSync(docsPath, 'utf8');
    
    // Convert markdown to HTML for better display
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporter Engine API Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
            border-bottom: 1px solid #ecf0f1;
            padding-bottom: 5px;
        }
        h3 {
            color: #7f8c8d;
        }
        pre {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 15px 0;
        }
        code {
            background: #ecf0f1;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        pre code {
            background: transparent;
            padding: 0;
        }
        .endpoint {
            background: #e8f4fd;
            border-left: 4px solid #3498db;
            padding: 10px;
            margin: 10px 0;
        }
        .method {
            font-weight: bold;
            color: #e74c3c;
        }
        .url {
            font-family: monospace;
            background: #f1f2f6;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .status-codes {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 10px;
            margin: 10px 0;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -40px -40px 30px -40px;
        }
        .nav {
            background: #34495e;
            color: white;
            padding: 10px 0;
            margin: -40px -40px 30px -40px;
            text-align: center;
        }
        .nav a {
            color: #ecf0f1;
            text-decoration: none;
            margin: 0 15px;
            padding: 5px 10px;
            border-radius: 3px;
            transition: background 0.3s;
        }
        .nav a:hover {
            background: #2c3e50;
        }
        .health-check {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; border: none; color: white;">🚀 Reporter Engine API Documentation</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">REST API for Test Reporting & Analytics Platform</p>
        </div>
        
        <div class="nav">
            <a href="/api/health">Health Check</a>
            <a href="/api/health/database">Database Status</a>
            <a href="/">Dashboard</a>
            <a href="https://github.com/Qeagle/reporter-engine">GitHub</a>
        </div>

        <div class="health-check">
            <strong>🔥 Quick Start:</strong> 
            <span class="url">GET /api/health</span> - 
            <a href="/api/health" target="_blank">Test API Connection</a>
        </div>

        <pre><code>${apiDocs.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (error) {
    console.error('Error reading API documentation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load API documentation',
      details: error.message
    });
  }
});

// Serve raw markdown version
router.get('/raw', (req, res) => {
  try {
    const docsPath = path.join(__dirname, '../../docs/API.md');
    const apiDocs = fs.readFileSync(docsPath, 'utf8');
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(apiDocs);
  } catch (error) {
    console.error('Error reading API documentation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load API documentation',
      details: error.message
    });
  }
});

export default router;
