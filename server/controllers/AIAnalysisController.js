import AIAnalysisService from '../services/AIAnalysisService.js';

class AIAnalysisController {
  constructor() {
    this.analysisService = AIAnalysisService;
  }

  /**
   * Trigger AI analysis for a specific report
   */
  async analyzeReport(req, res) {
    try {
      const { reportId } = req.params;
      
      if (!reportId) {
        return res.status(400).json({
          success: false,
          error: 'Report ID is required'
        });
      }

      // Check if analysis already exists
      const cachedAnalysis = this.analysisService.getCachedAnalysis(reportId);
      if (cachedAnalysis) {
        return res.json({
          success: true,
          data: cachedAnalysis,
          cached: true
        });
      }

      // Start analysis (this could be async with WebSocket updates)
      const analysisResult = await this.analysisService.analyzeReport(reportId);

      // Send real-time update via WebSocket
      const webSocketService = req.app.locals.webSocketService;
      if (webSocketService) {
        webSocketService.emitToRoom(`report-${reportId}`, 'ai-analysis-complete', {
          reportId,
          analysis: analysisResult
        });
      }

      res.json({
        success: true,
        data: analysisResult,
        cached: false
      });

    } catch (error) {
      console.error('Error in AI analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze report',
        details: error.message
      });
    }
  }

  /**
   * Get cached analysis results
   */
  async getAnalysis(req, res) {
    try {
      const { reportId } = req.params;
      
      const analysis = this.analysisService.getCachedAnalysis(reportId);
      
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'No analysis found for this report'
        });
      }

      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      console.error('Error getting analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis',
        details: error.message
      });
    }
  }

  /**
   * Start background analysis for a report (non-blocking)
   */
  async startBackgroundAnalysis(req, res) {
    try {
      const { reportId } = req.params;
      
      // Start analysis in background
      this.analysisService.analyzeReport(reportId)
        .then((result) => {
          // Send WebSocket update when complete
          const webSocketService = req.app.locals.webSocketService;
          if (webSocketService) {
            webSocketService.emitToRoom(`report-${reportId}`, 'ai-analysis-complete', {
              reportId,
              analysis: result
            });
          }
        })
        .catch((error) => {
          console.error('Background analysis failed:', error);
          const webSocketService = req.app.locals.webSocketService;
          if (webSocketService) {
            webSocketService.emitToRoom(`report-${reportId}`, 'ai-analysis-error', {
              reportId,
              error: error.message
            });
          }
        });

      res.json({
        success: true,
        message: 'Analysis started in background',
        reportId
      });

    } catch (error) {
      console.error('Error starting background analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start analysis',
        details: error.message
      });
    }
  }

  /**
   * Get cluster details for a specific cluster
   */
  async getClusterDetails(req, res) {
    try {
      const { reportId, clusterId } = req.params;
      
      const analysis = this.analysisService.getCachedAnalysis(reportId);
      
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'No analysis found for this report'
        });
      }

      const cluster = analysis.clusters.find(c => c.id === clusterId);
      
      if (!cluster) {
        return res.status(404).json({
          success: false,
          error: 'Cluster not found'
        });
      }

      res.json({
        success: true,
        data: cluster
      });

    } catch (error) {
      console.error('Error getting cluster details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cluster details',
        details: error.message
      });
    }
  }

  /**
   * Clear analysis cache
   */
  async clearCache(req, res) {
    try {
      this.analysisService.clearCache();
      
      res.json({
        success: true,
        message: 'Analysis cache cleared'
      });

    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
        details: error.message
      });
    }
  }

  /**
   * Get analysis statistics
   */
  async getAnalysisStats(req, res) {
    try {
      // This could be expanded to provide insights across multiple reports
      res.json({
        success: true,
        data: {
          cachedAnalyses: this.analysisService.analysisCache.size,
          cachedEmbeddings: this.analysisService.embeddingCache.size,
          lastAnalysis: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting analysis stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis stats',
        details: error.message
      });
    }
  }
}

export default new AIAnalysisController();
