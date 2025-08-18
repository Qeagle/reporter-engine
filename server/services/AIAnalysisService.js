import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DatabaseService from './DatabaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AIAnalysisService {
  constructor() {
    // Initialize database service for proper report loading
    this.db = new DatabaseService();
    
    // Initialize Groq client (OpenAI-compatible)
    this.groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || 'demo-key',
      baseURL: 'https://api.groq.com/openai/v1',
    });
    
    // Initialize OpenAI client (fallback)
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'demo-key'
    });
    
    this.analysisCache = new Map();
    this.embeddingCache = new Map();
    
    // Configure which LLM to use
    this.primaryLLM = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'demo-key' ? 'groq' : 'openai';
    this.groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  }

  /**
   * Main entry point for AI analysis of a test report
   */
  async analyzeReport(reportId) {
    try {
      console.log(`🤖 Starting AI analysis for report: ${reportId}`);
      
      const report = await this.loadReport(reportId);
      if (!report) {
        throw new Error(`Report ${reportId} not found`);
      }

      // Extract failed tests
      const failedTests = report.tests.filter(test => test.status === 'failed');
      
      if (failedTests.length === 0) {
        return {
          reportId,
          clusters: [],
          insights: {
            summary: "No failed tests found in this report.",
            confidence: 100,
            recommendations: ["All tests passed successfully!"]
          },
          timestamp: new Date().toISOString()
        };
      }

      console.log(`📊 Found ${failedTests.length} failed tests to analyze`);

      // Step 1: Extract features from failed tests
      const testFeatures = await this.extractTestFeatures(failedTests);

      // Step 2: Generate embeddings for clustering
      const embeddings = await this.generateEmbeddings(testFeatures);

      // Step 3: Cluster similar failures
      const clusters = await this.clusterFailures(testFeatures, embeddings);

      // Step 4: Generate root-cause hypotheses
      const analysisResults = await this.generateRootCauseAnalysis(clusters);

      // Step 5: Cache results
      this.analysisCache.set(reportId, analysisResults);

      console.log(`✅ AI analysis completed for report: ${reportId}`);
      return analysisResults;

    } catch (error) {
      console.error(`❌ AI analysis failed for report ${reportId}:`, error);
      return {
        reportId,
        error: error.message,
        clusters: [],
        insights: {
          summary: "AI analysis failed due to technical issues.",
          confidence: 0,
          recommendations: ["Manual review required"]
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Extract meaningful features from failed tests
   */
  async extractTestFeatures(failedTests) {
    const features = [];

    for (const test of failedTests) {
      const feature = {
        testId: test.name,
        testName: test.name,
        errorMessage: test.errorMessage || '',
        stackTrace: test.stackTrace || '',
        steps: test.steps || [],
        artifacts: test.artifacts || [],
        duration: test.duration || 0,
        browser: test.metadata?.browser || 'unknown',
        environment: test.metadata?.environment || 'unknown',
        
        // Extracted text for embedding
        combinedText: '',
        
        // Structured data for analysis
        errorPatterns: [],
        domChanges: [],
        networkIssues: [],
        screenshotInsights: []
      };

      // Combine relevant text for embedding
      feature.combinedText = [
        test.name,
        test.errorMessage,
        test.stackTrace,
        test.steps?.map(s => `${s.name}: ${s.status}`).join(' ') || ''
      ].filter(Boolean).join(' ');

      // Extract error patterns
      feature.errorPatterns = this.extractErrorPatterns(test.errorMessage, test.stackTrace);

      // Analyze test steps for DOM/UI issues
      feature.domChanges = this.analyzeDOMChanges(test.steps);

      // Extract network-related issues
      feature.networkIssues = this.analyzeNetworkIssues(test.steps, test.artifacts);

      // Analyze screenshots if available
      feature.screenshotInsights = await this.analyzeScreenshots(test.artifacts);

      features.push(feature);
    }

    return features;
  }

  /**
   * Generate embeddings for clustering similar failures
   */
  async generateEmbeddings(testFeatures) {
    const embeddings = [];

    for (const feature of testFeatures) {
      const cacheKey = this.hashString(feature.combinedText);
      
      if (this.embeddingCache.has(cacheKey)) {
        embeddings.push(this.embeddingCache.get(cacheKey));
        continue;
      }

      try {
        let embedding;
        
        // Try Groq first, then OpenAI, then fallback
        if (this.primaryLLM === 'groq' && process.env.GROQ_API_KEY !== 'demo-key') {
          try {
            // Use Groq for text analysis to generate semantic understanding
            const analysis = await this.analyzeTextWithGroq(feature.combinedText);
            embedding = this.textToEmbedding(analysis);
          } catch (groqError) {
            console.warn('Groq analysis failed, falling back to OpenAI:', groqError.message);
            // Fallback to OpenAI if Groq fails
            if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'demo-key') {
              const response = await this.openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: feature.combinedText
              });
              embedding = response.data[0].embedding;
            } else {
              embedding = this.generateSimpleEmbedding(feature.combinedText);
            }
          }
        } else if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'demo-key') {
          const response = await this.openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: feature.combinedText
          });
          embedding = response.data[0].embedding;
        } else {
          // Fallback: Simple TF-IDF style vectorization
          embedding = this.generateSimpleEmbedding(feature.combinedText);
        }

        this.embeddingCache.set(cacheKey, embedding);
        embeddings.push(embedding);

      } catch (error) {
        console.warn(`Failed to generate embedding for test ${feature.testId}:`, error);
        embeddings.push(this.generateSimpleEmbedding(feature.combinedText));
      }
    }

    return embeddings;
  }

  /**
   * Cluster similar failures using embedding similarity
   */
  async clusterFailures(testFeatures, embeddings) {
    const clusters = [];
    const processed = new Set();
    const similarityThreshold = 0.7;

    for (let i = 0; i < testFeatures.length; i++) {
      if (processed.has(i)) continue;

      const cluster = {
        id: `cluster_${clusters.length + 1}`,
        tests: [testFeatures[i]],
        centroid: embeddings[i],
        patterns: new Set(),
        confidence: 0,
        rootCause: '',
        recommendations: []
      };

      processed.add(i);

      // Find similar tests
      for (let j = i + 1; j < testFeatures.length; j++) {
        if (processed.has(j)) continue;

        const similarity = this.cosineSimilarity(embeddings[i], embeddings[j]);
        
        if (similarity > similarityThreshold) {
          cluster.tests.push(testFeatures[j]);
          processed.add(j);
        }
      }

      // Merge patterns from all tests in cluster
      cluster.tests.forEach(test => {
        test.errorPatterns.forEach(pattern => cluster.patterns.add(pattern));
      });

      clusters.push(cluster);
    }

    return clusters.sort((a, b) => b.tests.length - a.tests.length);
  }

  /**
   * Generate root-cause analysis for each cluster
   */
  async generateRootCauseAnalysis(clusters) {
    const analysisResults = {
      reportId: '',
      clusters: [],
      insights: {
        summary: '',
        topPatterns: [],
        confidence: 0,
        recommendations: []
      },
      timestamp: new Date().toISOString()
    };

    for (const cluster of clusters) {
      const analysis = await this.analyzeCluster(cluster);
      analysisResults.clusters.push(analysis);
    }

    // Generate overall insights
    analysisResults.insights = this.generateOverallInsights(analysisResults.clusters);

    return analysisResults;
  }

  /**
   * Analyze individual cluster for root cause
   */
  async analyzeCluster(cluster) {
    const testCount = cluster.tests.length;
    const errorPatterns = Array.from(cluster.patterns);
    
    // Try enhanced LLM analysis first
    const enhancedAnalysis = await this.enhancedRootCauseAnalysis(cluster);
    
    if (enhancedAnalysis) {
      console.log(`🤖 Using Groq LLM analysis for cluster ${cluster.id}`);
      
      // Combine LLM analysis with pattern analysis
      const commonErrors = this.findCommonErrorPatterns(cluster.tests);
      const browserPatterns = this.analyzeBrowserPatterns(cluster.tests);
      const timingIssues = this.analyzeTimingPatterns(cluster.tests);
      const elementIssues = this.analyzeElementPatterns(cluster.tests);

      return {
        id: cluster.id,
        testCount,
        tests: cluster.tests.map(t => ({
          name: t.testName,
          error: t.errorMessage,
          duration: t.duration
        })),
        rootCause: enhancedAnalysis.rootCause,
        confidence: enhancedAnalysis.confidence,
        recommendations: enhancedAnalysis.recommendations,
        technicalAnalysis: enhancedAnalysis.technicalAnalysis,
        llmEnhanced: true,
        patterns: {
          errors: commonErrors,
          browsers: browserPatterns,
          timing: timingIssues,
          elements: elementIssues
        },
        metadata: {
          avgDuration: cluster.tests.reduce((sum, t) => sum + t.duration, 0) / cluster.tests.length,
          browsers: [...new Set(cluster.tests.map(t => t.browser))],
          environments: [...new Set(cluster.tests.map(t => t.environment))]
        }
      };
    }
    
    // Fallback to pattern-based analysis
    console.log(`📊 Using pattern-based analysis for cluster ${cluster.id}`);
    
    // Analyze common patterns
    const commonErrors = this.findCommonErrorPatterns(cluster.tests);
    const browserPatterns = this.analyzeBrowserPatterns(cluster.tests);
    const timingIssues = this.analyzeTimingPatterns(cluster.tests);
    const elementIssues = this.analyzeElementPatterns(cluster.tests);

    // Generate hypothesis using pattern analysis
    let rootCause = '';
    let confidence = 0;
    let recommendations = [];

    if (commonErrors.length > 0) {
      const mainError = commonErrors[0];
      
      if (mainError.includes('timeout') || mainError.includes('wait')) {
        rootCause = 'Element loading or timing issues';
        confidence = 85;
        recommendations = [
          'Increase wait timeouts for slow-loading elements',
          'Add explicit waits for element visibility',
          'Check network conditions and page load times'
        ];
      } else if (mainError.includes('not found') || mainError.includes('locator')) {
        rootCause = 'Element locator or DOM structure issues';
        confidence = 90;
        recommendations = [
          'Update element selectors to be more robust',
          'Check for DOM changes in the application',
          'Use data-testid attributes for stable element identification'
        ];
      } else if (mainError.includes('network') || mainError.includes('request')) {
        rootCause = 'Network connectivity or API issues';
        confidence = 95;
        recommendations = [
          'Check API endpoint availability',
          'Verify network connectivity',
          'Add retry logic for network requests'
        ];
      } else if (mainError.includes('permission') || mainError.includes('access')) {
        rootCause = 'Authentication or authorization issues';
        confidence = 88;
        recommendations = [
          'Verify user credentials and permissions',
          'Check session timeout settings',
          'Review authentication flow'
        ];
      } else {
        rootCause = 'Application logic or data-related issues';
        confidence = 70;
        recommendations = [
          'Review test data and application state',
          'Check for recent application changes',
          'Verify business logic implementations'
        ];
      }
    } else {
      rootCause = 'Unclear failure pattern - requires manual investigation';
      confidence = 30;
      recommendations = [
        'Manual review of test failures required',
        'Check test logs and screenshots',
        'Consider test environment stability'
      ];
    }

    return {
      id: cluster.id,
      testCount,
      tests: cluster.tests.map(t => ({
        name: t.testName,
        error: t.errorMessage,
        duration: t.duration
      })),
      rootCause,
      confidence,
      recommendations,
      patterns: {
        errors: commonErrors,
        browsers: browserPatterns,
        timing: timingIssues,
        elements: elementIssues
      },
      metadata: {
        avgDuration: cluster.tests.reduce((sum, t) => sum + t.duration, 0) / cluster.tests.length,
        browsers: [...new Set(cluster.tests.map(t => t.browser))],
        environments: [...new Set(cluster.tests.map(t => t.environment))]
      }
    };
  }

  /**
   * Helper methods for pattern analysis
   */
  extractErrorPatterns(errorMessage, stackTrace) {
    const patterns = [];
    const text = `${errorMessage} ${stackTrace}`.toLowerCase();
    
    const knownPatterns = [
      'timeout', 'not found', 'network', 'permission', 'authentication',
      'locator', 'element', 'click', 'type', 'wait', 'load', 'response'
    ];
    
    knownPatterns.forEach(pattern => {
      if (text.includes(pattern)) {
        patterns.push(pattern);
      }
    });
    
    return patterns;
  }

  findCommonErrorPatterns(tests) {
    const errorCounts = {};
    
    tests.forEach(test => {
      const words = `${test.errorMessage} ${test.stackTrace}`.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          errorCounts[word] = (errorCounts[word] || 0) + 1;
        }
      });
    });
    
    return Object.entries(errorCounts)
      .filter(([word, count]) => count > tests.length * 0.5)
      .map(([word]) => word)
      .slice(0, 5);
  }

  analyzeBrowserPatterns(tests) {
    const browsers = {};
    tests.forEach(test => {
      browsers[test.browser] = (browsers[test.browser] || 0) + 1;
    });
    return browsers;
  }

  analyzeTimingPatterns(tests) {
    const avgDuration = tests.reduce((sum, t) => sum + t.duration, 0) / tests.length;
    const longTests = tests.filter(t => t.duration > avgDuration * 1.5).length;
    
    return {
      avgDuration,
      longTests,
      hasTimingIssues: longTests > tests.length * 0.3
    };
  }

  analyzeElementPatterns(tests) {
    const elementErrors = tests.filter(test => 
      test.errorMessage?.includes('element') || 
      test.errorMessage?.includes('locator')
    ).length;
    
    return {
      elementErrors,
      hasElementIssues: elementErrors > tests.length * 0.5
    };
  }

  analyzeDOMChanges(steps) {
    // Analyze steps for DOM-related issues
    return steps?.filter(step => 
      step.name?.includes('click') || 
      step.name?.includes('type') || 
      step.name?.includes('wait')
    ) || [];
  }

  analyzeNetworkIssues(steps, artifacts) {
    // Analyze for network-related problems
    const networkSteps = steps?.filter(step => 
      step.name?.includes('request') || 
      step.name?.includes('response') ||
      step.name?.includes('network')
    ) || [];
    
    const harFiles = artifacts?.filter(artifact => 
      artifact.type === 'har' || artifact.name?.includes('.har')
    ) || [];
    
    return {
      networkSteps: networkSteps.length,
      harFiles: harFiles.length,
      hasNetworkIssues: networkSteps.length > 0 || harFiles.length > 0
    };
  }

  async analyzeScreenshots(artifacts) {
    // Placeholder for screenshot OCR analysis
    const screenshots = artifacts?.filter(artifact => 
      artifact.type === 'image' || 
      artifact.name?.match(/\.(png|jpg|jpeg)$/i)
    ) || [];
    
    return {
      screenshotCount: screenshots.length,
      hasScreenshots: screenshots.length > 0
      // TODO: Add OCR analysis if needed
    };
  }

  generateOverallInsights(clusters) {
    const totalTests = clusters.reduce((sum, cluster) => sum + cluster.testCount, 0);
    const avgConfidence = clusters.reduce((sum, cluster) => sum + cluster.confidence, 0) / clusters.length;
    
    const topPatterns = clusters
      .slice(0, 3)
      .map(cluster => ({
        pattern: cluster.rootCause,
        testCount: cluster.testCount,
        confidence: cluster.confidence
      }));
    
    const allRecommendations = clusters
      .flatMap(cluster => cluster.recommendations)
      .reduce((acc, rec) => {
        acc[rec] = (acc[rec] || 0) + 1;
        return acc;
      }, {});
    
    const topRecommendations = Object.entries(allRecommendations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rec]) => rec);
    
    let summary = '';
    if (clusters.length === 1) {
      summary = `Single failure pattern identified: ${clusters[0].rootCause}`;
    } else if (clusters.length <= 3) {
      summary = `${clusters.length} distinct failure patterns found across ${totalTests} failed tests`;
    } else {
      summary = `${clusters.length} failure patterns identified, suggesting complex system issues`;
    }
    
    return {
      summary,
      topPatterns,
      confidence: Math.round(avgConfidence),
      recommendations: topRecommendations,
      totalFailedTests: totalTests,
      clusterCount: clusters.length
    };
  }

  /**
   * Load report data using database service
   */
  async loadReport(reportId) {
    try {
      // First try to find test run by ID (numeric)
      let testRun = this.db.findTestRunById(reportId);
      
      // If not found, try to find by run_key (UUID) 
      if (!testRun) {
        const runByKey = this.db.findTestRunByKey(reportId);
        if (runByKey) {
          testRun = this.db.findTestRunById(runByKey.id);
        }
      }

      if (!testRun) {
        console.log(`❌ Test run not found for ID: ${reportId}`);
        return null;
      }

      // Get test cases with steps and artifacts
      const testCases = this.db.getTestCasesByRun(testRun.id);
      const enrichedTestCases = testCases.map(testCase => {
        const steps = this.db.getTestStepsByCase(testCase.id);
        const artifacts = this.db.getTestArtifactsByCase(testCase.id);
        
        return {
          ...testCase,
          name: testCase.test_name,
          status: testCase.status,
          duration: testCase.duration,
          error: testCase.error_message,
          steps: steps.map(step => ({
            ...step,
            name: step.step_name,
            status: step.status,
            duration: step.duration,
            error: step.error_message
          })),
          artifacts: artifacts.map(artifact => ({
            ...artifact,
            filename: artifact.artifact_name,
            type: artifact.artifact_type,
            url: artifact.file_path
          }))
        };
      });

      // Return report in expected format
      return {
        id: testRun.run_key,
        projectId: testRun.project_id,
        testSuite: testRun.test_suite,
        environment: testRun.environment,
        framework: testRun.framework,
        status: testRun.status,
        startTime: testRun.started_at,
        endTime: testRun.finished_at,
        summary: testRun.summary ? (typeof testRun.summary === 'string' ? JSON.parse(testRun.summary) : testRun.summary) : {},
        tests: enrichedTestCases
      };
    } catch (error) {
      console.error(`❌ Error loading report ${reportId}:`, error);
      return null;
    }
  }

  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    return dotProduct / (normA * normB);
  }

  generateSimpleEmbedding(text) {
    // Simple TF-IDF style embedding as fallback
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordFreq = {};
    
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Create a fixed-size vector (100 dimensions)
    const embedding = new Array(100).fill(0);
    const wordList = Object.keys(wordFreq);
    
    wordList.forEach((word, index) => {
      if (index < 100) {
        embedding[index] = wordFreq[word] / words.length;
      }
    });
    
    return embedding;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Analyze text using Groq LLM for semantic understanding
   */
  async analyzeTextWithGroq(text) {
    try {
      const response = await this.groq.chat.completions.create({
        model: this.groqModel,
        messages: [
          {
            role: "system",
            content: "You are an expert test failure analyzer. Analyze the given test failure text and extract key semantic concepts, error patterns, and technical issues. Return a structured analysis focusing on: error type, component affected, likely cause, and technical keywords."
          },
          {
            role: "user",
            content: `Analyze this test failure: ${text}`
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      });

      return response.choices[0]?.message?.content || text;
    } catch (error) {
      console.warn('Groq text analysis failed:', error.message);
      return text; // Fallback to original text
    }
  }

  /**
   * Convert LLM analysis text to embedding vector
   */
  textToEmbedding(analysisText) {
    // Enhanced semantic embedding based on LLM analysis
    const keywords = [
      'timeout', 'element', 'locator', 'network', 'authentication', 'permission',
      'click', 'type', 'wait', 'load', 'response', 'error', 'failed', 'connection',
      'dom', 'selector', 'browser', 'api', 'request', 'session'
    ];

    const text = analysisText.toLowerCase();
    const embedding = new Array(100).fill(0);

    // Enhanced keyword matching with weights
    keywords.forEach((keyword, index) => {
      if (index < 100) {
        const count = (text.match(new RegExp(keyword, 'g')) || []).length;
        const weight = count > 0 ? Math.log(count + 1) : 0;
        embedding[index] = weight;
      }
    });

    // Add text length and complexity factors
    embedding[95] = Math.min(text.length / 1000, 1); // Normalized length
    embedding[96] = (text.match(/[.!?]/g) || []).length / 10; // Sentence complexity
    embedding[97] = (text.match(/\b\w+\b/g) || []).length / 100; // Word count factor
    embedding[98] = (text.match(/[A-Z]/g) || []).length / 50; // Caps ratio
    embedding[99] = (text.match(/\d/g) || []).length / 20; // Number ratio

    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map(val => val / magnitude);
    }

    return embedding;
  }

  /**
   * Enhanced root cause analysis using Groq LLM
   */
  async enhancedRootCauseAnalysis(cluster) {
    if (this.primaryLLM !== 'groq' || process.env.GROQ_API_KEY === 'demo-key') {
      return null; // Skip if Groq not available
    }

    try {
      const testSummaries = cluster.tests.map(test => ({
        name: test.testName,
        error: test.errorMessage,
        browser: test.browser,
        duration: test.duration
      }));

      const prompt = `Analyze these related test failures and provide root cause analysis:

Tests:
${JSON.stringify(testSummaries, null, 2)}

Provide analysis in this JSON format:
{
  "rootCause": "Specific technical root cause",
  "confidence": 85,
  "recommendations": ["Specific actionable recommendation 1", "Recommendation 2"],
  "technicalAnalysis": "Detailed technical explanation"
}`;

      const response = await this.groq.chat.completions.create({
        model: this.groqModel,
        messages: [
          {
            role: "system",
            content: "You are an expert QA engineer and test automation specialist. Analyze test failures and provide precise, actionable root cause analysis with high confidence scoring."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.2
      });

      const analysisText = response.choices[0]?.message?.content;
      if (analysisText) {
        try {
          return JSON.parse(analysisText);
        } catch (parseError) {
          console.warn('Failed to parse Groq analysis JSON:', parseError.message);
          return {
            rootCause: analysisText.substring(0, 100),
            confidence: 75,
            recommendations: ["Review detailed analysis manually"],
            technicalAnalysis: analysisText
          };
        }
      }
    } catch (error) {
      console.warn('Enhanced Groq analysis failed:', error.message);
    }

    return null;
  }

  // Cache management
  clearCache() {
    this.analysisCache.clear();
    this.embeddingCache.clear();
  }

  getCachedAnalysis(reportId) {
    return this.analysisCache.get(reportId);
  }
}

export default new AIAnalysisService();
