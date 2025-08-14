import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, BarChart3, Brain, Download, FileText, File } from 'lucide-react';
import { reportService } from '../services/reportService';
import { useWebSocket } from '../contexts/WebSocketContext';
import ReportSummary from '../components/ReportDetails/ReportSummary';
import TestsList from '../components/ReportDetails/TestsList';
import ReportMetrics from '../components/ReportDetails/ReportMetrics';
import AnnotationPanel from '../components/ReportDetails/AnnotationPanel';
import AIInsights from '../components/AIInsights/AIInsights';
import RunSummaryInsights from '../components/AIInsights/RunSummaryInsights';
import ExportModal from '../components/ReportDetails/ExportModal';
import toast from 'react-hot-toast';

const ReportDetails: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [exportingHTML, setExportingHTML] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { socket } = useWebSocket();

  useEffect(() => {
    if (reportId) {
      loadReportData();
    }
  }, [reportId]);

  useEffect(() => {
    if (socket && reportId) {
      // Join report room for real-time updates
      socket.emit('join-report', reportId);

      // Listen for real-time updates
      socket.on('test-updated', handleTestUpdate);
      socket.on('test-execution-completed', handleExecutionComplete);

      return () => {
        socket.off('test-updated');
        socket.off('test-execution-completed');
      };
    }
  }, [socket, reportId]);

  const loadReportData = async () => {
    if (!reportId) return;

    try {
      setLoading(true);
      const [reportData, metricsData] = await Promise.all([
        reportService.getReportById(reportId),
        reportService.getReportMetrics(reportId)
      ]);

      setReport(reportData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

  const handleTestUpdate = (data: any) => {
    if (data.reportId === reportId) {
      setReport((prev: any) => ({
        ...prev,
        tests: prev.tests.map((test: any) =>
          test.name === data.test.name ? { ...test, ...data.test } : test
        ),
        summary: data.summary
      }));
      toast.success(`Test ${data.test.name} updated`);
    }
  };

  const handleExecutionComplete = (data: any) => {
    if (data.reportId === reportId) {
      setReport((prev: any) => ({
        ...prev,
        status: 'completed',
        summary: data.summary
      }));
      toast.success('Test execution completed');
    }
  };

  const exportReportAsJSON = () => {
    if (!report) return;
    
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${reportId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('JSON report downloaded successfully!');
  };

  const exportReportAsPDF = async () => {
    if (!reportId) return;
    
    try {
      toast.loading('Generating PDF report...', { id: 'pdf-export' });
      await reportService.exportToPDF(reportId);
      toast.success('PDF report downloaded successfully!', { id: 'pdf-export' });
    } catch (error: any) {
      console.error('PDF export failed:', error);
      toast.error(error.message || 'Failed to export PDF report', { id: 'pdf-export' });
    }
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: BarChart3 },
    { id: 'tests', label: 'Test Results', icon: BarChart3 },
    { id: 'ai-insights', label: 'AI Insights', icon: Brain },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Report Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          The requested report could not be found.
        </p>
        <Link
          to="/reports"
          className="inline-flex items-center text-blue-600 hover:text-blue-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/reports"
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {report.testSuite}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {report.environment} • {report.framework}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportReportAsPDF}
            className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
            title="Export as PDF - Complete test report with formatted layout"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </button>
          <button
            onClick={exportReportAsJSON}
            className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
            title="Export as JSON - Raw test data for programmatic use"
          >
            <File className="w-4 h-4 mr-2" />
            Export JSON
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            title="Export as HTML - Interactive web report with options"
          >
            <Download className="w-4 h-4 mr-2" />
            Export HTML
          </button>
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className="inline-flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Annotations
          </button>
        </div>
      </div>

      {/* Report Summary */}
      <ReportSummary report={report} />

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <ReportSummary report={report} />
              {report.stats && (report.stats.failed > 0 || report.stats.errors > 0) && (
                <RunSummaryInsights
                  reportId={reportId!}
                  totalTests={report.stats.total || 0}
                  failedTests={(report.stats.failed || 0) + (report.stats.errors || 0)}
                  onViewFullAnalysis={() => setActiveTab('ai-insights')}
                />
              )}
            </div>
          )}
          {activeTab === 'tests' && <TestsList tests={report.tests} reportId={reportId!} />}
          {activeTab === 'ai-insights' && <AIInsights reportId={reportId!} />}
          {activeTab === 'metrics' && <ReportMetrics metrics={metrics} />}
        </div>
      </div>

      {/* Annotations Panel */}
      {showAnnotations && (
        <AnnotationPanel
          reportId={reportId!}
          onClose={() => setShowAnnotations(false)}
        />
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        reportId={reportId!}
        reportName={report?.test_suite}
      />
    </div>
  );
};

export default ReportDetails;