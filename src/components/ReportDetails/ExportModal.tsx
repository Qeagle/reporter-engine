import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Package, Zap, Clock, HardDrive, ChevronRight } from 'lucide-react';
import { reportService } from '../../services/reportService';
import toast from 'react-hot-toast';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportName?: string;
}

interface SizeEstimates {
  lite: {
    size: number;
    formattedSize: string;
    description: string;
    artifactCount: number;
  };
  full: {
    size: number;
    formattedSize: string;
    description: string;
    artifactCount: number;
  };
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, reportId, reportName }) => {
  const [sizeEstimates, setSizeEstimates] = useState<SizeEstimates | null>(null);
  const [loadingEstimates, setLoadingEstimates] = useState(false);
  const [exportingLite, setExportingLite] = useState(false);
  const [exportingFull, setExportingFull] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSizeEstimates();
    }
  }, [isOpen, reportId]);

  const loadSizeEstimates = async () => {
    try {
      setLoadingEstimates(true);
      const estimates = await reportService.getExportSizeEstimates(reportId);
      setSizeEstimates(estimates);
    } catch (error) {
      console.error('Failed to load size estimates:', error);
      toast.error('Failed to calculate export sizes');
    } finally {
      setLoadingEstimates(false);
    }
  };

  const handleExport = async (includeArtifacts: boolean) => {
    const setLoading = includeArtifacts ? setExportingFull : setExportingLite;
    const exportType = includeArtifacts ? 'full' : 'lite';
    
    try {
      setLoading(true);
      const toastId = `export-${exportType}`;
      
      toast.loading(
        `Generating ${includeArtifacts ? 'full' : 'lite'} report export...`, 
        { id: toastId }
      );

      const exportResult = await reportService.exportToHTML(reportId, includeArtifacts);

      toast.success(
        `${includeArtifacts ? 'Full' : 'Lite'} report export generated successfully!`, 
        { id: toastId }
      );

      // Auto-download the export
      await reportService.downloadHTMLExport(reportId, exportResult.exportId);
      
      // Close modal after successful download
      onClose();
      
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(
        error.message || `Failed to export ${exportType} report`, 
        { id: `export-${exportType}` }
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Export HTML Report
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {reportName || `Report ${reportId}`}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Choose your export option based on your needs:
            </p>
          </div>

          {loadingEstimates ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">
                Calculating export sizes...
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Lite Export Option */}
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Lite Export
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        HTML report only - perfect for quick sharing and review
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <HardDrive className="w-4 h-4 mr-1" />
                          {sizeEstimates?.lite.formattedSize || '~50KB'}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          ~5 seconds
                        </div>
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          HTML only
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleExport(false)}
                    disabled={exportingLite || exportingFull}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {exportingLite ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download Lite
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Full Export Option */}
              <div className={`border-2 rounded-lg p-6 transition-colors ${
                sizeEstimates?.full.artifactCount === 0 
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-75' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${
                      sizeEstimates?.full.artifactCount === 0
                        ? 'bg-gray-100 dark:bg-gray-700'
                        : 'bg-blue-100 dark:bg-blue-900'
                    }`}>
                      <Package className={`w-6 h-6 ${
                        sizeEstimates?.full.artifactCount === 0
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-blue-600 dark:text-blue-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-lg font-medium mb-2 ${
                        sizeEstimates?.full.artifactCount === 0
                          ? 'text-gray-500 dark:text-gray-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        Full Export
                      </h4>
                      <p className={`mb-3 ${
                        sizeEstimates?.full.artifactCount === 0
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {sizeEstimates?.full.artifactCount === 0
                          ? 'No artifacts available for this report'
                          : 'Complete package with all artifacts - screenshots, videos, traces'
                        }
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <HardDrive className="w-4 h-4 mr-1" />
                          {sizeEstimates?.full.formattedSize || 'Calculating...'}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          ~30 seconds
                        </div>
                        <div className="flex items-center">
                          <Package className="w-4 h-4 mr-1" />
                          {sizeEstimates?.full.artifactCount || 0} artifacts
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative group">
                    <button
                      onClick={() => handleExport(true)}
                      disabled={exportingLite || exportingFull || sizeEstimates?.full.artifactCount === 0}
                      className={`inline-flex items-center px-4 py-2 rounded-md transition-colors ${
                        sizeEstimates?.full.artifactCount === 0
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {exportingFull ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download Full
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </button>
                    {/* Custom tooltip for disabled button */}
                    {sizeEstimates?.full.artifactCount === 0 && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 dark:bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        No artifacts available in this report
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-900"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Comparison */}
              {sizeEstimates && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-6">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                    Quick Comparison
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Lite:</span>
                      <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                        {sizeEstimates.lite.formattedSize}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Full:</span>
                      <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
                        {sizeEstimates.full.formattedSize}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 Choose Lite for quick sharing, Full for complete analysis
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
