import React, { useState, useEffect } from 'react';
import { X, Plus, MessageSquare } from 'lucide-react';
import { reportService } from '../../services/reportService';
import toast from 'react-hot-toast';

interface AnnotationPanelProps {
  reportId: string;
  onClose: () => void;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({ reportId, onClose }) => {
  const [annotations, setAnnotations] = useState([]);
  const [newAnnotation, setNewAnnotation] = useState({
    testName: '',
    message: '',
    type: 'note'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnnotations();
  }, [reportId]);

  const loadAnnotations = async () => {
    try {
      // Note: This would need to be implemented in the report service
      // const response = await reportService.getAnnotations(reportId);
      // setAnnotations(response);
    } catch (error) {
      console.error('Error loading annotations:', error);
    }
  };

  const handleAddAnnotation = async () => {
    if (!newAnnotation.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setLoading(true);
      const annotation = await reportService.addAnnotation(reportId, newAnnotation);
      setAnnotations([...annotations, annotation]);
      setNewAnnotation({ testName: '', message: '', type: 'note' });
      toast.success('Annotation added successfully');
    } catch (error) {
      console.error('Error adding annotation:', error);
      toast.error('Failed to add annotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-lg border-l border-gray-200 dark:border-gray-700 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Annotations
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Add New Annotation Form */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Add Annotation
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Name (Optional)
              </label>
              <input
                type="text"
                value={newAnnotation.testName}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, testName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="Specific test name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={newAnnotation.type}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="note">Note</option>
                <option value="issue">Issue</option>
                <option value="improvement">Improvement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <textarea
                value={newAnnotation.message}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, message: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                rows={3}
                placeholder="Enter your annotation..."
              />
            </div>

            <button
              onClick={handleAddAnnotation}
              disabled={loading || !newAnnotation.message.trim()}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Annotation
            </button>
          </div>
        </div>

        {/* Existing Annotations */}
        <div className="space-y-3">
          {annotations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No annotations yet. Add the first one!
              </p>
            </div>
          ) : (
            annotations.map((annotation: any, index: number) => (
              <div key={index} className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between mb-2">
                  <span className={`px-2 py-1 text-xs rounded ${
                    annotation.type === 'issue' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : annotation.type === 'improvement'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {annotation.type}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(annotation.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {annotation.testName && (
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Test: {annotation.testName}
                  </p>
                )}
                
                <p className="text-sm text-gray-900 dark:text-white">
                  {annotation.message}
                </p>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  by {annotation.userId}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnotationPanel;