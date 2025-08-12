import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { reportService } from '../services/reportService';
import { useProject } from '../contexts/ProjectContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import Analytics360Icon from '../components/Brand/Analytics360Icon';
import DashboardStats from '../components/Dashboard/DashboardStats';
import RecentReports from '../components/Dashboard/RecentReports';
import TestMetricsChart from '../components/Dashboard/TestMetricsChart';
import ExecutionTrends from '../components/Dashboard/ExecutionTrends';

interface MetricsData {
  passFailData: {
    labels: string[];
    datasets: Array<{
      data: number[];
      backgroundColor: string[];
    }>;
  };
  trendsData: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension: number;
    }>;
  };
}

const Dashboard: React.FC = () => {
  useDocumentTitle('Dashboard');
  const { getIconClasses } = usePrimaryColor();
  const { currentProject } = useProject();
  const { socket } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReports: 0,
    totalTests: 0,
    passRate: 0,
    avgDuration: 0
  });
  const [recentReports, setRecentReports] = useState([]);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);

  useEffect(() => {
    if (currentProject) {
      loadDashboardData();
    }
  }, [currentProject]);

  // WebSocket listener for real-time updates
  useEffect(() => {
    if (socket && currentProject) {
      console.log('🔄 Setting up WebSocket listeners for dashboard updates');
      
      // Listen for test execution started events (new reports)
      socket.on('test-execution-started', (data: any) => {
        console.log('🚀 Test execution started, refreshing dashboard:', data);
        if (!data.project?.id || data.project.id === currentProject.id) {
          loadDashboardData();
        }
      });

      // Listen for test execution completed events
      socket.on('test-execution-completed', (data: any) => {
        console.log('✅ Test execution completed, refreshing dashboard:', data);
        if (!data.projectId || data.projectId === currentProject.id) {
          loadDashboardData();
        }
      });

      // Cleanup listeners on unmount
      return () => {
        socket.off('test-execution-started');
        socket.off('test-execution-completed');
      };
    }
  }, [socket, currentProject]);

  const loadDashboardData = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);
      
      // Add project filter to report queries
      const projectFilter = { projectId: currentProject.id };
      
      // Fetch recent reports for display (limited to 10)
      const recentReportsResponse = await reportService.getReports({ 
        ...projectFilter,
        limit: 10, 
        sortBy: 'startTime', 
        sortOrder: 'desc' 
      });
      const recentReports = recentReportsResponse.data;
      setRecentReports(recentReports);

      // Fetch ALL reports for accurate statistics (no limit)
      const allReportsResponse = await reportService.getReports({ 
        ...projectFilter,
        sortBy: 'startTime', 
        sortOrder: 'desc' 
      });
      const allReports = allReportsResponse.data;

      // Calculate overall stats from ALL reports, not just recent ones
      const totalTests = allReports.reduce((sum: number, report: any) => sum + (report.summary?.total || 0), 0);
      const totalPassed = allReports.reduce((sum: number, report: any) => sum + (report.summary?.passed || 0), 0);
      const totalDuration = allReports.reduce((sum: number, report: any) => sum + (report.summary?.duration || 0), 0);

      setStats({
        totalReports: allReports.length, // Total number of test reports/runs
        totalTests: totalTests, // Total number of individual tests executed
        passRate: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0,
        avgDuration: allReports.length > 0 ? Math.round(totalDuration / allReports.length) : 0
      });

      // Prepare metrics data for charts using recent reports for visual trends
      setMetricsData({
        passFailData: {
          labels: ['Passed', 'Failed', 'Skipped'],
          datasets: [{
            data: [
              recentReports.reduce((sum: number, r: any) => sum + (r.summary?.passed || 0), 0),
              recentReports.reduce((sum: number, r: any) => sum + (r.summary?.failed || 0), 0),
              recentReports.reduce((sum: number, r: any) => sum + (r.summary?.skipped || 0), 0)
            ],
            backgroundColor: ['#10B981', '#EF4444', '#F59E0B']
          }]
        },
        trendsData: {
          labels: recentReports.slice(0, 7).reverse().map((r: any) => 
            new Date(r.startTime).toLocaleDateString()
          ),
          datasets: [{
            label: 'Pass Rate %',
            data: recentReports.slice(0, 7).reverse().map((r: any) => r.summary?.passRate || 0),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4
          }]
        }
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Analytics360Icon className={`w-8 h-8 ${getIconClasses()}`} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <span>Dashboard</span>
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </h1>
                <p className="text-gray-600 dark:text-gray-400 flex items-center space-x-1">
                  <BarChart3 className="w-4 h-4" />
                  <span>360° view of your test execution metrics and analytics</span>
                </p>
              </div>
            </div>
          </div>  
        </div>      {/* Stats Cards */}
      <DashboardStats stats={stats} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TestMetricsChart data={metricsData?.passFailData} />
        <ExecutionTrends data={metricsData?.trendsData} />
      </div>

      {/* Recent Reports */}
      <RecentReports reports={recentReports} />
    </div>
  );
};

export default Dashboard;