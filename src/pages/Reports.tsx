import React, { useState, useEffect } from 'react';
import { Search, Filter, User, AlertCircle, Calendar, FileText, File, Archive, Globe } from 'lucide-react';
import { reportService } from '../services/reportService';
import { useProject } from '../contexts/ProjectContext';
import FilterModal, { FilterOptions } from '../components/Reports/FilterModal';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Reports: React.FC = () => {
  const { currentProject } = useProject();
  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: [],
    environment: [],
    framework: [],
    author: [],
    dateRange: { start: '', end: '' }
  });

  useEffect(() => {
    if (currentProject) {
      loadReports();
    }
  }, [currentProject]);

  useEffect(() => {
    applyFilters();
  }, [reports, searchTerm, filters]);

  const loadReports = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);
      const response = await reportService.getReports({ projectId: currentProject.id });
      const reportData = Array.isArray(response) ? response : response.data || [];
      setReports(reportData.sort((a: any, b: any) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      ));
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.testSuite?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.environment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.framework?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(report => filters.status.includes(report.status));
    }

    // Environment filter
    if (filters.environment.length > 0) {
      filtered = filtered.filter(report => filters.environment.includes(report.environment));
    }

    // Framework filter
    if (filters.framework.length > 0) {
      filtered = filtered.filter(report => filters.framework.includes(report.framework));
    }

    // Author filter
    if (filters.author.length > 0) {
      filtered = filtered.filter(report => {
        if (!report.tests) return false;
        return report.tests.some((test: any) => {
          const author = test.author || test.metadata?.author;
          return author && filters.author.includes(author);
        });
      });
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.startTime);
        const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
        const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;

        if (startDate && reportDate < startDate) return false;
        if (endDate && reportDate > endDate) return false;
        return true;
      });
    }

    setFilteredReports(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getUniqueAuthors = (report: any): string[] => {
    if (!report.tests) return [];
    const authors: string[] = report.tests
      .map((test: any) => test.author || test.metadata?.author)
      .filter((author: any): author is string => typeof author === 'string' && author !== 'Unknown');
    return [...new Set(authors)];
  };

  const getFailedTestsAuthors = (report: any): string[] => {
    if (!report.tests) return [];
    const failedTests = report.tests.filter((test: any) => test.status === 'failed');
    const authors: string[] = failedTests
      .map((test: any) => test.author || test.metadata?.author)
      .filter((author: any): author is string => typeof author === 'string' && author !== 'Unknown');
    return [...new Set(authors)];
  };

  const exportReportAsJSON = (report: any) => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${report.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportReportAsPDF = async (report: any) => {
    try {
      toast.loading('Generating PDF report...', { id: 'pdf-export' });
      await reportService.exportToPDF(report.id);
      toast.success('PDF report downloaded successfully!', { id: 'pdf-export' });
    } catch (error: any) {
      console.error('PDF export failed:', error);
      toast.error(error.message || 'Failed to export PDF report', { id: 'pdf-export' });
    }
  };

  // Export HTML without artifacts (lite version)
  const exportReport = async (report: any) => {
    try {
      toast.loading('Generating HTML report...', { id: 'html-export' });
      
      // Export as lite version (no artifacts)
      const exportResult = await reportService.exportToHTML(report.id, false);
      
      toast.success('HTML report export generated successfully!', { id: 'html-export' });
      
      // Auto-download the export
      await reportService.downloadHTMLExport(report.id, exportResult.exportId);
      
    } catch (error: any) {
      console.error('HTML export failed:', error);
      toast.error(error.message || 'Failed to export HTML report', { id: 'html-export' });
    }
  };

  // Export HTML with artifacts (full version)
  const exportReportWithArtifacts = async (report: any) => {
    try {
      toast.loading('Generating HTML report with artifacts...', { id: 'html-with-artifacts-export' });
      
      // Export with artifacts included
      const exportResult = await reportService.exportToHTML(report.id, true);
      
      toast.success('HTML report with artifacts generated successfully!', { id: 'html-with-artifacts-export' });
      
      // Auto-download the export
      await reportService.downloadHTMLExport(report.id, exportResult.exportId);
      
    } catch (error: any) {
      console.error('HTML with artifacts export failed:', error);
      toast.error(error.message || 'Failed to export HTML report with artifacts', { id: 'html-with-artifacts-export' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Test Reports</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredReports.map((report) => {
          const authors = getUniqueAuthors(report);
          const failedAuthors = getFailedTestsAuthors(report);
          
          return (
            <div key={report.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Link
                      to={`/reports/${report.id}`}
                      className="text-lg font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      {report.testSuite}
                    </Link>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(report.startTime).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-green-600">{report.summary?.passed || 0} passed</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-red-600">{report.summary?.failed || 0} failed</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {report.environment} • {report.framework}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      {report.summary?.passRate || 0}% pass rate
                    </div>
                  </div>

                  {/* Authors Section */}
                  {authors.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-start space-x-2">
                        <User className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Test Authors:</div>
                          <div className="flex flex-wrap gap-1">
                            {authors.map((author, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-700 text-blue-700 dark:text-blue-300 text-xs rounded-md"
                              >
                                {author}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Failed Tests Authors */}
                  {failedAuthors.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                        <div>
                          <div className="text-xs text-red-500 mb-1">Failed Test Authors (requires attention):</div>
                          <div className="flex flex-wrap gap-1">
                            {failedAuthors.map((author, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-red-100 dark:bg-red-700 text-red-700 dark:text-red-300 text-xs rounded-md font-medium"
                              >
                                {author}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => exportReportAsPDF(report)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Export as PDF - Complete test report with formatted layout"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => exportReportAsJSON(report)}
                    className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    title="Export as JSON - Raw test data for programmatic use"
                  >
                    <File className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => exportReport(report)}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Export as HTML - Interactive web report (no artifacts)"
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => exportReportWithArtifacts(report)}
                    className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    title="Export as HTML with Artifacts - Complete report with screenshots, videos, and traces"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              {reports.length === 0 ? 'No reports found' : 'No reports match your filters'}
            </div>
          </div>
        )}
      </div>

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={setFilters}
        currentFilters={filters}
        reports={reports}
      />
    </div>
  );
};

export default Reports;
