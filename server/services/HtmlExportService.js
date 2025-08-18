import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import DatabaseService from './DatabaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * HtmlExportService - Exports test reports as static HTML files
 * Similar to Spark Reports from ExtentReports
 */
class HtmlExportService {
  constructor() {
    this.db = new DatabaseService();
    this.templatesDir = path.join(__dirname, '..', 'templates');
    this.exportsDir = path.join(__dirname, '..', 'data', 'backup', 'exports');
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  /**
   * Export a single report as static HTML
   */
  async exportReport(reportId, options = {}) {
    try {
      // Check if this is a test case only export
      if (options.testCaseOnly && options.testCaseReport) {
        // Get project information for the test case report
        const testRun = options.testCaseReport;
        const project = testRun.project_id ? this.db.findProjectById(testRun.project_id) : null;
        
        // Use the provided test case report data with proper structure
        const exportData = {
          report: {
            ...options.testCaseReport,
            project: project
          },
          testCases: options.testCaseReport.tests || [],
          summary: options.testCaseReport.summary || { total: 0, passed: 0, failed: 0, skipped: 0 },
          exportedAt: new Date().toISOString()
        };

        // Generate HTML content directly with the test case report data
        const htmlContent = this.generateHTML(exportData, options);
        
        // Create export directory and save file
        const exportId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const exportDir = path.join(this.exportsDir, exportId);
        fs.mkdirSync(exportDir, { recursive: true });
        
        const htmlPath = path.join(exportDir, 'index.html');
        fs.writeFileSync(htmlPath, htmlContent);

        // Copy artifacts if includeAssets is true
        if (options.includeAssets && exportData.testCases && exportData.testCases.length > 0) {
          console.log('Copying artifacts for test case export...');
          await this.copyAssets(exportDir, exportData.testCases);
        }

        return {
          exportId,
          exportPath: exportDir,
          htmlPath,
          success: true
        };
      }

      // Regular report export logic
      // Get report data
      const report = this.db.findTestRunById(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      // Get test cases with steps and artifacts
      const testCases = this.db.getTestCasesByRun(reportId);
      const enrichedTestCases = testCases.map(testCase => {
        const steps = this.db.getTestStepsByCase(testCase.id);
        const artifacts = this.db.getTestArtifactsByCase(testCase.id);
        
        return {
          ...testCase,
          steps,
          artifacts
        };
      });

      // Get project info
      const project = this.db.findProjectById(report.project_id);

      // Prepare export data
      const exportData = {
        report: {
          ...report,
          project: project
        },
        testCases: enrichedTestCases,
        summary: this.calculateSummary(enrichedTestCases),
        exportedAt: new Date().toISOString(),
        exportOptions: options
      };

      // Generate HTML
      const html = this.generateHTML(exportData);
      
      // Create export directory
      const exportId = `report-${reportId}-${Date.now()}`;
      const exportPath = path.join(this.exportsDir, exportId);
      fs.mkdirSync(exportPath, { recursive: true });

      // Write HTML file
      const htmlPath = path.join(exportPath, 'index.html');
      fs.writeFileSync(htmlPath, html, 'utf8');

      // Copy assets if needed
      await this.copyAssets(exportPath, enrichedTestCases);

      return {
        exportId,
        exportPath,
        htmlPath,
        size: this.getDirectorySize(exportPath)
      };

    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }

  /**
   * Export report as ZIP with local artifacts (replaces HTML export)
   */
  async exportReportAsZip(reportId, options = {}) {
    try {
      // Default to including artifacts unless explicitly disabled
      const includeArtifacts = options.includeArtifacts !== false;
      
      // Get the basic HTML export first
      const exportResult = await this.exportReport(reportId, { ...options, includeAssets: includeArtifacts });
      
      // Get test run info for folder naming
      const testRun = this.db.findTestRunById(reportId);
      const suffix = includeArtifacts ? 'full' : 'lite';
      
      // Use custom filename if provided, otherwise generate default
      let folderName;
      if (options.customFilename) {
        folderName = `${options.customFilename}-${exportResult.exportId}`;
      } else {
        folderName = `${testRun.test_suite || 'test-report'}-${exportResult.exportId}-${suffix}`;
      }
      
      // Create ZIP file - use custom filename if provided, otherwise use exportId
      let zipFilename;
      if (options.customFilename) {
        zipFilename = `${options.customFilename}.zip`;
      } else {
        zipFilename = `${exportResult.exportId}.zip`;
      }
      const zipPath = path.join(this.exportsDir, zipFilename);
      
      // Create a promise that resolves when the archive is finalized
      return new Promise((resolve, reject) => {
        // Create ZIP archive with better error handling
        const archive = archiver('zip', {
          zlib: { level: 9 },
          forceLocalTime: true,
          forceZip64: false
        });
        
        const output = fs.createWriteStream(zipPath);
        let finalSize = 0;
        
        // Better error handling
        output.on('close', async () => {
          // Add a small delay to ensure file is fully written
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verify the ZIP file was created properly
          try {
            const stats = fs.statSync(zipPath);
            finalSize = stats.size;
            console.log(`ZIP created successfully: ${zipPath} (${finalSize} bytes)`);
            
            if (finalSize === 0) {
              reject(new Error('ZIP file is empty'));
              return;
            }
            
            // Create metadata file for the export
            const metadataPath = zipPath.replace('.zip', '.meta.json');
            const metadata = {
              exportId: exportResult.exportId,
              reportId,
              exportType: suffix, // 'full' or 'lite'
              includeArtifacts,
              createdAt: new Date().toISOString(),
              size: finalSize,
              testSuite: testRun.test_suite || 'test-report'
            };
            
            try {
              fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
              console.log(`Export metadata created: ${metadataPath}`);
            } catch (metaError) {
              console.warn('Failed to create export metadata:', metaError.message);
              // Don't fail the export if metadata creation fails
            }
            
            resolve({
              exportId: exportResult.exportId,
              zipPath,
              zipFilename,
              exportPath: exportResult.exportPath,
              size: finalSize,
              exportType: suffix
            });
          } catch (statError) {
            reject(new Error(`Failed to verify ZIP file: ${statError.message}`));
          }
        });
        
        output.on('error', (error) => {
          console.error('Output stream error:', error);
          reject(error);
        });
        
        archive.on('error', (error) => {
          console.error('Archive error:', error);
          reject(error);
        });
        
        archive.on('end', () => {
          finalSize = archive.pointer();
          console.log(`Archive finalized: ${finalSize} total bytes`);
        });
        
        archive.on('warning', (err) => {
          if (err.code === 'ENOENT') {
            console.warn('Archive warning:', err);
          } else {
            reject(err);
          }
        });
        
        // Pipe archive data to the file
        archive.pipe(output);
        
        // Check if export directory exists
        if (!fs.existsSync(exportResult.exportPath)) {
          reject(new Error(`Export directory not found: ${exportResult.exportPath}`));
          return;
        }
        
        // Add HTML file to the folder in ZIP
        const htmlPath = path.join(exportResult.exportPath, 'index.html');
        if (fs.existsSync(htmlPath)) {
          archive.file(htmlPath, { name: `${folderName}/index.html` });
        }
        
        // Add artifacts directory to the folder in ZIP
        const artifactsDir = path.join(exportResult.exportPath, 'artifacts');
        if (fs.existsSync(artifactsDir)) {
          console.log(`Adding artifacts directory: ${artifactsDir}`);
          archive.directory(artifactsDir, `${folderName}/artifacts`);
        } else {
          console.warn(`Artifacts directory not found: ${artifactsDir}`);
        }
        
        // Finalize the archive
        archive.finalize().catch(reject);
      });
      
    } catch (error) {
      console.error('Error exporting report as ZIP:', error);
      throw error;
    }
  }

  /**
   * Update HTML file to reference local artifacts instead of URLs
   */
  async updateHtmlForLocalArtifacts(htmlPath) {
    try {
      let htmlContent = await fs.readFile(htmlPath, 'utf8');
      
      // Update artifact references to use local paths
      // Replace URL patterns with local file paths
      htmlContent = htmlContent.replace(
        /"http:\/\/[^"]*\/api\/tests\/artifacts\/([^"]+)"/g,
        '"artifacts/$1"'
      );
      
      await fs.writeFile(htmlPath, htmlContent, 'utf8');
    } catch (error) {
      console.error('Error updating HTML for local artifacts:', error);
      throw error;
    }
  }

  /**
   * Generate HTML content using template
   */
  generateHTML(data) {
    const template = this.getHTMLTemplate();
    const chartsData = this.generateChartsData(data);
    
    // Replace template variables
    return template
      .replace(/\{\{REPORT_DATA\}\}/g, JSON.stringify(data, null, 2))
      .replace(/\{\{REPORT_TITLE\}\}/g, `${data.report.test_suite || 'Test Report'} - ${data.report.project?.name || 'Unknown Project'}`)
      .replace(/\{\{EXPORTED_AT\}\}/g, new Date(data.exportedAt).toLocaleString())
      .replace(/\{\{SUMMARY_STATS\}\}/g, this.generateSummaryHTML(data.summary))
      .replace(/\{\{TEST_CASES_HTML\}\}/g, this.generateTestCasesHTML(data.testCases))
      .replace(/\{\{CHARTS_DATA\}\}/g, JSON.stringify(chartsData, null, 2));
  }

  /**
   * Get HTML template (embedded for simplicity)
   */
  getHTMLTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{REPORT_TITLE}}</title>
    <style>
        ${this.getCSS()}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="header">
            <div class="header-content">
                <h1 class="report-title">{{REPORT_TITLE}}</h1>
                <p class="export-info">Exported on {{EXPORTED_AT}}</p>
            </div>
        </header>

        <!-- Summary Stats -->
        <section class="summary-section">
            {{SUMMARY_STATS}}
        </section>

        <!-- Filter Controls -->
        <section class="filter-section">
            <div class="filter-controls">
                <h3>Filter Test Results</h3>
                <div class="filter-buttons">
                    <button class="filter-btn active" data-filter="all">All Tests</button>
                    <button class="filter-btn" data-filter="passed">Passed Only</button>
                    <button class="filter-btn" data-filter="failed">Failed Only</button>
                    <button class="filter-btn" data-filter="skipped">Skipped Only</button>
                </div>
                <div class="filter-stats">
                    <span id="visible-count">0</span> of <span id="total-count">0</span> tests visible
                </div>
            </div>
        </section>

        <!-- Charts -->
        <section class="charts-section">
            <div class="chart-container">
                <canvas id="summaryChart"></canvas>
            </div>
            <div class="chart-container">
                <canvas id="durationChart"></canvas>
            </div>
        </section>

        <!-- Test Cases -->
        <section class="test-cases-section">
            <h2>Test Results</h2>
            {{TEST_CASES_HTML}}
        </section>

        <!-- Footer -->
        <footer class="footer">
            <p>Generated by Reporter Engine - <a href="https://github.com/Qeagle/reporter-engine">GitHub</a></p>
        </footer>
    </div>

    <script>
        // Report data
        const reportData = {{REPORT_DATA}};
        
        // Charts data
        const chartsData = {{CHARTS_DATA}};
        
        // Initialize charts
        ${this.getJavaScript()}
    </script>
</body>
</html>`;
  }

  /**
   * Generate CSS styles
   */
  getCSS() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 2rem;
        }

        .report-title {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .export-info {
            opacity: 0.9;
            font-size: 0.9rem;
        }

        .summary-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }

        .stat-number {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .stat-label {
            font-size: 0.9rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .passed { color: #10b981; }
        .failed { color: #ef4444; }
        .skipped { color: #f59e0b; }
        .total { color: #6366f1; }

        .charts-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .chart-container {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            height: 300px;
        }

        .test-cases-section {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 2rem;
            margin-bottom: 2rem;
        }

        .test-case {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            margin-bottom: 1rem;
            overflow: hidden;
        }

        .test-case-header {
            padding: 1rem;
            background: #f9fafb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }

        .test-case-header:hover {
            background: #f3f4f6;
        }

        .test-name {
            font-weight: 600;
            flex: 1;
            margin-bottom: 0.25rem;
            word-break: break-word;
        }

        .test-info {
            flex: 1;
        }

        .test-meta {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .test-status {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-passed {
            background: #dcfce7;
            color: #166534;
        }

        .status-failed {
            background: #fee2e2;
            color: #991b1b;
        }

        .status-skipped {
            background: #fef3c7;
            color: #92400e;
        }

        .test-duration {
            font-size: 0.875rem;
            color: #6b7280;
        }

        .test-artifacts {
            margin-top: 1rem;
        }

        .artifacts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 0.5rem;
            margin-top: 0.5rem;
        }

        .artifact-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            background: #f3f4f6;
            border-radius: 4px;
            font-size: 0.875rem;
        }

        .artifact-type {
            padding: 0.25rem 0.5rem;
            background: #e5e7eb;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .artifact-name {
            color: #374151;
            font-family: monospace;
            font-size: 0.75rem;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .artifact-name:hover {
            color: #6366f1;
            text-decoration: underline;
        }

        .test-case-details {
            padding: 1rem;
            border-top: 1px solid #e5e7eb;
            display: none;
        }

        .test-case-details.expanded {
            display: block;
        }

        .test-steps {
            margin-bottom: 1.5rem;
        }

        .steps-list {
            list-style: none;
            padding: 0;
            margin: 0.5rem 0;
        }

        .step-item {
            display: flex;
            align-items: center;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            background: #f9fafb;
            border-radius: 6px;
            border-left: 4px solid #e5e7eb;
        }

        .step-item.step-passed {
            border-left-color: #10b981;
            background: #f0fdf4;
        }

        .step-item.step-failed {
            border-left-color: #ef4444;
            background: #fef2f2;
        }

        .step-item.step-skipped {
            border-left-color: #f59e0b;
            background: #fffbeb;
        }

        .step-status {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 0.75rem;
            flex-shrink: 0;
        }

        .step-status.passed {
            background: #10b981;
        }

        .step-status.failed {
            background: #ef4444;
        }

        .step-status.skipped {
            background: #f59e0b;
        }

        .step-content {
            flex: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .step-name {
            font-weight: 500;
            color: #374151;
            font-size: 0.875rem;
        }

        .step-duration {
            font-size: 0.75rem;
            color: #6b7280;
            font-family: monospace;
        }

        .step-category {
            padding: 0.125rem 0.5rem;
            background: #e5e7eb;
            border-radius: 4px;
            font-size: 0.625rem;
            font-weight: 600;
            text-transform: uppercase;
            color: #374151;
            margin-left: 0.5rem;
        }

        .error-message {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 4px;
            padding: 1rem;
            margin-bottom: 1rem;
            font-family: monospace;
            font-size: 0.875rem;
            color: #991b1b;
        }

        .stack-trace {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 1rem;
            font-family: monospace;
            font-size: 0.75rem;
            color: #374151;
            white-space: pre-wrap;
            overflow-x: auto;
        }

        .footer {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
            font-size: 0.875rem;
        }

        .footer a {
            color: #6366f1;
            text-decoration: none;
        }

        /* Filter Controls Styles */
        .filter-section {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 1.5rem;
            margin-bottom: 2rem;
        }

        .filter-controls h3 {
            margin-bottom: 1rem;
            color: #374151;
            font-size: 1.125rem;
        }

        .filter-buttons {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }

        .filter-btn {
            padding: 0.5rem 1rem;
            border: 2px solid #e5e7eb;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .filter-btn:hover {
            border-color: #6366f1;
            color: #6366f1;
        }

        .filter-btn.active {
            background: #6366f1;
            border-color: #6366f1;
            color: white;
        }

        .filter-stats {
            font-size: 0.875rem;
            color: #6b7280;
        }

        .test-case.hidden {
            display: none;
        }

        @media (max-width: 768px) {
            .charts-section {
                grid-template-columns: 1fr;
            }
            
            .summary-section {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .filter-buttons {
                flex-direction: column;
            }
        }
    `;
  }

  /**
   * Generate JavaScript for interactivity
   */
  getJavaScript() {
    return `
        // Toggle test case details
        document.addEventListener('DOMContentLoaded', function() {
            const headers = document.querySelectorAll('.test-case-header');
            headers.forEach(header => {
                header.addEventListener('click', function() {
                    const details = this.nextElementSibling;
                    details.classList.toggle('expanded');
                });
            });

            // Initialize filter functionality
            initializeFilters();

            // Initialize charts
            initializeCharts();
        });

        function initializeFilters() {
            const filterButtons = document.querySelectorAll('.filter-btn');
            const testCases = document.querySelectorAll('.test-case');
            const visibleCount = document.getElementById('visible-count');
            const totalCount = document.getElementById('total-count');

            // Set total count
            totalCount.textContent = testCases.length;

            filterButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Update active button
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');

                    const filter = this.dataset.filter;
                    let visible = 0;

                    testCases.forEach(testCase => {
                        const shouldShow = filter === 'all' || testCase.classList.contains('status-' + filter);
                        
                        if (shouldShow) {
                            testCase.classList.remove('hidden');
                            visible++;
                        } else {
                            testCase.classList.add('hidden');
                        }
                    });

                    // Update visible count
                    visibleCount.textContent = visible;
                });
            });

            // Initialize with all tests visible
            visibleCount.textContent = testCases.length;
        }

        function initializeCharts() {
            // Summary pie chart
            const summaryCtx = document.getElementById('summaryChart');
            if (summaryCtx && chartsData.summary) {
                new Chart(summaryCtx, {
                    type: 'doughnut',
                    data: chartsData.summary,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Test Results Summary'
                            },
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
            }

            // Duration bar chart
            const durationCtx = document.getElementById('durationChart');
            if (durationCtx && chartsData.duration) {
                new Chart(durationCtx, {
                    type: 'bar',
                    data: chartsData.duration,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Test Duration (Top 10)'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Duration (ms)'
                                }
                            }
                        }
                    }
                });
            }
        }
    `;
  }

  /**
   * Generate summary HTML
   */
  generateSummaryHTML(summary) {
    return `
        <div class="stat-card">
            <div class="stat-number total">${summary.total}</div>
            <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat-card">
            <div class="stat-number passed">${summary.passed}</div>
            <div class="stat-label">Passed</div>
        </div>
        <div class="stat-card">
            <div class="stat-number failed">${summary.failed}</div>
            <div class="stat-label">Failed</div>
        </div>
        <div class="stat-card">
            <div class="stat-number skipped">${summary.skipped}</div>
            <div class="stat-label">Skipped</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${summary.passRate}%</div>
            <div class="stat-label">Pass Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${this.formatDuration(summary.duration)}</div>
            <div class="stat-label">Total Duration</div>
        </div>
    `;
  }

  /**
   * Generate test cases HTML
   */
  generateTestCasesHTML(testCases) {
    return testCases.map(testCase => `
        <div class="test-case status-${testCase.status}">
            <div class="test-case-header">
                <div class="test-info">
                    <div class="test-name">${this.escapeHtml(testCase.name)}</div>
                </div>
                <div class="test-meta">
                    <span class="test-duration">${this.formatDuration(testCase.duration || 0)}</span>
                    <span class="test-status status-${testCase.status}">${testCase.status}</span>
                </div>
            </div>
            <div class="test-case-details">
                ${testCase.error_message ? `
                    <div class="error-message">
                        ${this.escapeHtml(testCase.error_message)}
                    </div>
                ` : ''}
                ${testCase.stack_trace ? `
                    <div class="stack-trace">${this.escapeHtml(testCase.stack_trace)}</div>
                ` : ''}
                ${testCase.steps && testCase.steps.length > 0 ? `
                    <div class="test-steps">
                        <h4>Steps:</h4>
                        <div class="steps-list">
                            ${testCase.steps.map(step => `
                                <div class="step-item step-${step.status}">
                                    <div class="step-status ${step.status}"></div>
                                    <div class="step-content">
                                        <div class="step-name">${this.escapeHtml(step.name)}</div>
                                        <div class="step-meta">
                                            <span class="step-duration">${this.formatDuration(step.duration || 0)}</span>
                                            ${step.category ? `<span class="step-category">${step.category}</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${testCase.artifacts && testCase.artifacts.length > 0 ? `
                    <div class="test-artifacts">
                        <h4>Artifacts:</h4>
                        <div class="artifacts-grid">
                            ${testCase.artifacts.map(artifact => {
                                const filename = artifact.filename || 'unknown';
                                const artifactPath = `artifacts/test-case-${testCase.id}/${filename}`;
                                return `
                                <div class="artifact-item">
                                    <span class="artifact-type">${artifact.type}</span>
                                    <a href="${artifactPath}" class="artifact-name" target="_blank">
                                        ${this.escapeHtml(filename)}
                                    </a>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
  }

  /**
   * Generate charts data
   */
  generateChartsData(data) {
    const summary = data.summary || { passed: 0, failed: 0, skipped: 0 };
    
    const summaryChart = {
      labels: ['Passed', 'Failed', 'Skipped'],
      datasets: [{
        data: [summary.passed || 0, summary.failed || 0, summary.skipped || 0],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
        borderWidth: 0
      }]
    };

    // Top 10 longest tests
    const testCases = data.testCases || [];
    const sortedTests = testCases
      .filter(tc => tc && tc.duration && tc.duration > 0)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);

    const durationChart = {
      labels: sortedTests.map(tc => {
        const name = tc.name || 'Unknown Test';
        return name.length > 30 ? name.substring(0, 30) + '...' : name;
      }),
      datasets: [{
        label: 'Duration (ms)',
        data: sortedTests.map(tc => tc.duration || 0),
        backgroundColor: '#6366f1',
        borderColor: '#4f46e5',
        borderWidth: 1
      }]
    };

    return {
      summary: summaryChart,
      duration: durationChart
    };
  }

  /**
   * Calculate summary from test cases
   */
  calculateSummary(testCases) {
    const summary = {
      total: testCases.length,
      passed: testCases.filter(tc => tc.status === 'passed').length,
      failed: testCases.filter(tc => tc.status === 'failed').length,
      skipped: testCases.filter(tc => tc.status === 'skipped').length,
      duration: testCases.reduce((sum, tc) => sum + (tc.duration || 0), 0)
    };

    summary.passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;

    return summary;
  }

  /**
   * Copy artifacts/assets to export directory
   */
  async copyAssets(exportPath, testCases) {
    const artifactsDir = path.join(exportPath, 'artifacts');
    fs.mkdirSync(artifactsDir, { recursive: true });
    
    console.log(`Copying artifacts to: ${artifactsDir}`);
    let copiedCount = 0;
    let missingCount = 0;

    // Copy screenshots and other artifacts organized by test case
    for (const testCase of testCases) {
      if (testCase.artifacts && testCase.artifacts.length > 0) {
        console.log(`Processing ${testCase.artifacts.length} artifacts for test case ${testCase.id}`);
        
        // Create a subdirectory for this test case to avoid filename conflicts
        const testCaseDir = path.join(artifactsDir, `test-case-${testCase.id}`);
        fs.mkdirSync(testCaseDir, { recursive: true });
        
        for (const artifact of testCase.artifacts) {
          try {
            // Extract the actual stored filename from the URL
            // URL format: http://localhost:3001/api/tests/artifacts/{uuid-filename}
            let storedFilename;
            if (artifact.url) {
              const urlParts = artifact.url.split('/');
              storedFilename = urlParts[urlParts.length - 1]; // Get the last part after the last '/'
              console.log(`Extracted filename from URL: ${storedFilename} from ${artifact.url}`);
            } else {
              // Fallback: construct from artifact_id + filename
              storedFilename = `${artifact.artifact_id}-${artifact.filename}`;
              console.log(`Constructed filename: ${storedFilename}`);
            }
            
            // Check multiple possible source paths
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            let sourcePath = path.join(uploadsDir, storedFilename);
            
            if (!fs.existsSync(sourcePath)) {
              // Try alternative filename patterns
              const alternativePatterns = [
                artifact.filename, // Original filename
                `${artifact.artifact_id}-${artifact.filename}`, // artifact_id-filename
                artifact.artifact_id // Just the artifact_id
              ];
              
              for (const pattern of alternativePatterns) {
                const altPath = path.join(uploadsDir, pattern);
                if (fs.existsSync(altPath)) {
                  sourcePath = altPath;
                  console.log(`Found artifact using alternative pattern: ${pattern}`);
                  break;
                }
              }
            }
            
            if (fs.existsSync(sourcePath)) {
              // Copy with original filename to test case specific directory
              const destPath = path.join(testCaseDir, artifact.filename);
              fs.copyFileSync(sourcePath, destPath);
              copiedCount++;
              console.log(`✓ Copied artifact: ${artifact.filename} from ${path.basename(sourcePath)} to test-case-${testCase.id}/`);
            } else {
              missingCount++;
              console.warn(`✗ Artifact not found: ${storedFilename} for ${artifact.filename}`);
              console.warn(`  Checked paths:`);
              console.warn(`    - ${sourcePath}`);
              console.warn(`    - ${path.join(uploadsDir, artifact.filename)}`);
              console.warn(`    - ${path.join(uploadsDir, artifact.artifact_id)}`);
            }
          } catch (error) {
            missingCount++;
            console.warn(`✗ Failed to copy artifact ${artifact.filename}:`, error.message);
          }
        }
      }
    }
    
    console.log(`Artifacts summary: ${copiedCount} copied, ${missingCount} missing/failed`);
    
    // Create a manifest file with information about the artifacts
    const manifestPath = path.join(artifactsDir, 'manifest.json');
    const manifest = {
      totalTestCases: testCases.length,
      artifactsCopied: copiedCount,
      artifactsMissing: missingCount,
      generatedAt: new Date().toISOString()
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Get directory size in bytes
   */
  getDirectorySize(dirPath) {
    let totalSize = 0;
    
    function calculateSize(currentPath) {
      const stats = fs.statSync(currentPath);
      if (stats.isFile()) {
        totalSize += stats.size;
      } else if (stats.isDirectory()) {
        const files = fs.readdirSync(currentPath);
        files.forEach(file => {
          calculateSize(path.join(currentPath, file));
        });
      }
    }
    
    try {
      calculateSize(dirPath);
    } catch (error) {
      console.error('Error calculating directory size:', error);
    }
    
    return totalSize;
  }

  /**
   * Format duration for display with configurable time units
   */
  formatDuration(duration, options = {}) {
    const { 
      preferredUnit = 'auto', // 'auto', 'ms', 's', 'min', 'h'
      precision = 1,
      showUnit = true 
    } = options;
    
    if (!duration || duration === 0) return '0ms';
    
    // Convert duration to milliseconds if not already
    const durationMs = typeof duration === 'string' ? parseFloat(duration) : duration;
    
    if (preferredUnit === 'ms') {
      return showUnit ? `${durationMs}ms` : durationMs.toString();
    }
    
    if (preferredUnit === 's') {
      const seconds = (durationMs / 1000).toFixed(precision);
      return showUnit ? `${seconds}s` : seconds;
    }
    
    if (preferredUnit === 'min') {
      const minutes = (durationMs / 60000).toFixed(precision);
      return showUnit ? `${minutes}m` : minutes;
    }
    
    if (preferredUnit === 'h') {
      const hours = (durationMs / 3600000).toFixed(precision);
      return showUnit ? `${hours}h` : hours;
    }
    
    // Auto mode - choose best unit
    if (durationMs < 1000) {
      return showUnit ? `${durationMs}ms` : durationMs.toString();
    } else if (durationMs < 60000) {
      const seconds = (durationMs / 1000).toFixed(precision);
      return showUnit ? `${seconds}s` : seconds;
    } else if (durationMs < 3600000) {
      const minutes = (durationMs / 60000).toFixed(precision);
      return showUnit ? `${minutes}m` : minutes;
    } else {
      const hours = (durationMs / 3600000).toFixed(precision);
      return showUnit ? `${hours}h` : hours;
    }
  }

  /**
   * Escape HTML characters
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Get list of available exports
   */
  getAvailableExports() {
    try {
      const exports = fs.readdirSync(this.exportsDir)
        .map(dir => {
          const exportPath = path.join(this.exportsDir, dir);
          const stats = fs.statSync(exportPath);
          const htmlPath = path.join(exportPath, 'index.html');
          
          return {
            id: dir,
            path: exportPath,
            htmlPath,
            createdAt: stats.ctime,
            size: this.getDirectorySize(exportPath),
            exists: fs.existsSync(htmlPath)
          };
        })
        .filter(exp => exp.exists)
        .sort((a, b) => b.createdAt - a.createdAt);

      return exports;
    } catch (error) {
      console.error('Error getting available exports:', error);
      return [];
    }
  }

  /**
   * Get export size estimates for both options
   */
  async getExportSizeEstimates(reportId) {
    try {
      const testRun = this.db.findTestRunById(reportId);
      if (!testRun) {
        throw new Error('Test run not found');
      }

      // Get test cases with artifacts
      const testCases = this.db.getTestCasesByRun(reportId).map(testCase => {
        const steps = this.db.getTestStepsByCase(testCase.id);
        const artifacts = this.db.getTestArtifactsByCase(testCase.id);
        return { ...testCase, steps, artifacts };
      });

      // Calculate base HTML size (rough estimate)
      const baseHtmlSize = 50 * 1024; // ~50KB for HTML structure
      const testCaseDataSize = testCases.length * 2 * 1024; // ~2KB per test case
      const liteSize = baseHtmlSize + testCaseDataSize;

      // Calculate artifacts size
      let artifactsSize = 0;
      let artifactCount = 0;
      
      for (const testCase of testCases) {
        if (testCase.artifacts && testCase.artifacts.length > 0) {
          for (const artifact of testCase.artifacts) {
            artifactCount++;
            try {
              // Extract filename from URL
              let storedFilename;
              if (artifact.url) {
                const urlParts = artifact.url.split('/');
                storedFilename = urlParts[urlParts.length - 1];
              } else {
                storedFilename = `${artifact.artifact_id}-${artifact.filename}`;
              }
              
              const sourcePath = path.join(__dirname, '..', 'uploads', storedFilename);
              if (fs.existsSync(sourcePath)) {
                const stats = fs.statSync(sourcePath);
                artifactsSize += stats.size;
              }
            } catch (error) {
              // Skip if file doesn't exist or can't be read
            }
          }
        }
      }

      const fullSize = liteSize + artifactsSize;

      return {
        lite: {
          size: liteSize,
          formattedSize: this.formatFileSize(liteSize),
          description: 'HTML report only',
          artifactCount: 0
        },
        full: {
          size: fullSize,
          formattedSize: this.formatFileSize(fullSize),
          description: `HTML report + ${artifactCount} artifacts`,
          artifactCount: artifactCount
        }
      };
    } catch (error) {
      console.error('Error calculating export size estimates:', error);
      return {
        lite: { size: 0, formattedSize: '~50KB', description: 'HTML report only', artifactCount: 0 },
        full: { size: 0, formattedSize: 'Unknown', description: 'HTML report + artifacts', artifactCount: 0 }
      };
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Delete an export
   */
  deleteExport(exportId) {
    try {
      const exportPath = path.join(this.exportsDir, exportId);
      if (fs.existsSync(exportPath)) {
        fs.rmSync(exportPath, { recursive: true, force: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting export:', error);
      return false;
    }
  }
}

export default HtmlExportService;
