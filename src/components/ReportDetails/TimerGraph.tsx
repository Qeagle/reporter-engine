import React from 'react';
import { X, Clock, BarChart3 } from 'lucide-react';

interface Step {
  name: string;
  duration: number;
  status: string;
}

interface TimerGraphProps {
  steps: Step[];
  onClose: () => void;
}

const TimerGraph: React.FC<TimerGraphProps> = ({ steps, onClose }) => {
  const maxDuration = Math.max(...steps.map(step => step.duration));
  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'passed':
        return {
          color: 'bg-green-500',
          lightColor: 'bg-green-100 dark:bg-green-900/30',
          borderColor: 'border-green-200 dark:border-green-700',
          textColor: 'text-green-700 dark:text-green-300'
        };
      case 'failed':
        return {
          color: 'bg-red-500',
          lightColor: 'bg-red-100 dark:bg-red-900/30',
          borderColor: 'border-red-200 dark:border-red-700',
          textColor: 'text-red-700 dark:text-red-300'
        };
      default:
        return {
          color: 'bg-yellow-500',
          lightColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          borderColor: 'border-yellow-200 dark:border-yellow-700',
          textColor: 'text-yellow-700 dark:text-yellow-300'
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Test Execution Timeline
              </h3>
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Total: {(totalDuration / 1000).toFixed(2)}s</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Steps: {steps.length}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 group"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
          <div className="space-y-6">
            {/* Timeline visualization */}
            <div className="space-y-4">
              {steps.map((step, index) => {
                const config = getStatusConfig(step.status);
                const percentage = (step.duration / maxDuration) * 100;
                
                return (
                  <div key={index} className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                              #{index + 1}
                            </span>
                            <div className={`w-3 h-3 rounded-full ${config.color} shadow-sm`} />
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {step.name}
                          </h4>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 ml-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.lightColor} ${config.textColor} ${config.borderColor} border`}>
                          {step.status}
                        </span>
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400 tabular-nums min-w-[60px] text-right">
                          {(step.duration / 1000).toFixed(3)}s
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="relative">
                      <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shadow-inner">
                        <div
                          className={`h-full ${config.color} relative transition-all duration-700 ease-out`}
                          style={{ width: `${Math.max(percentage, 2)}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-white/10" />
                          {percentage > 15 && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs font-medium">
                              {percentage.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Time scale */}
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0ms</span>
                        <span className="font-mono">{maxDuration}ms</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary stats */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Fastest Step</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {(Math.min(...steps.map(s => s.duration)) / 1000).toFixed(3)}s
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Slowest Step</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {(maxDuration / 1000).toFixed(3)}s
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Average</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {(totalDuration / steps.length / 1000).toFixed(3)}s
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
                <span className="text-gray-600 dark:text-gray-400">Passed</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
                <span className="text-gray-600 dark:text-gray-400">Failed</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm" />
                <span className="text-gray-600 dark:text-gray-400">Other</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerGraph;
