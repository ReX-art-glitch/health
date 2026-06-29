import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataEntry from './pages/DataEntry';
import AIInsights from './pages/AIInsights';
import Reports from './pages/Reports';
import Copilot from './pages/Copilot';
import FacilityAssessment from './pages/FacilityAssessment';
import AlertsPanel from './pages/AlertsPanel';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import LoadingScreen from './components/common/LoadingScreen';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" /> : <Login />
        } />
        
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="data-entry" element={<DataEntry />} />
          <Route path="ai-insights" element={<AIInsights />} />
          <Route path="reports" element={<Reports />} />
          <Route path="copilot" element={<Copilot />} />
          <Route path="facility-assessment" element={<FacilityAssessment />} />
          <Route path="alerts" element={<AlertsPanel />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Box>
  );
}

export default App;