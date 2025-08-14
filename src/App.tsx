import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import ReportDetails from './pages/ReportDetails';
import FailureAnalysis from './pages/FailureAnalysis';
import TrendAnalysis from './pages/TrendAnalysis';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import AcceptInvitation from './pages/AcceptInvitation';
import ProtectedRoute from './components/Auth/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <ProjectProvider>
            <WebSocketProvider>
            <Router>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/reports" element={
                    <ProtectedRoute>
                      <Layout>
                        <Reports />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/reports/:reportId" element={
                    <ProtectedRoute>
                      <Layout>
                        <ReportDetails />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/defects" element={
                    <ProtectedRoute>
                      <Layout>
                        <FailureAnalysis />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/trends" element={
                    <ProtectedRoute>
                      <Layout>
                        <TrendAnalysis />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Layout>
                        <Settings />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Layout>
                        <Profile />
                      </Layout>
                    </ProtectedRoute>
                  } />
                </Routes>
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: 'var(--toast-bg)',
                      color: 'var(--toast-text)',
                    },
                  }}
                />
              </div>
            </Router>
          </WebSocketProvider>
        </ProjectProvider>
      </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;