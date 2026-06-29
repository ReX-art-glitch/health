import React, { useEffect, useState } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, LinearProgress,
  Chip, IconButton, Tooltip, Paper
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Vaccines, Warning,
  People, LocalHospital, Inventory, Assessment
} from '@mui/icons-material';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip as ChartTooltip,
  Legend, Filler
} from 'chart.js';
import { useApp } from '../context/AppContext';
import MapView from '../components/Dashboard/MapView';
import AlertsWidget from '../components/Dashboard/AlertsWidget';
import LoadingScreen from '../components/common/LoadingScreen';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, ChartTooltip, Legend, Filler);

const StatCard = ({ title, value, change, icon, color, subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="textSecondary">{title}</Typography>
          <Typography variant="h4" sx={{ my: 1, fontWeight: 'bold' }}>{value}</Typography>
          {change && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {change > 0 ? <TrendingUp color="success" fontSize="small" /> : <TrendingDown color="error" fontSize="small" />}
              <Typography variant="body2" color={change > 0 ? 'success.main' : 'error.main'}>
                {Math.abs(change)}% from last month
              </Typography>
            </Box>
          )}
          {subtitle && <Typography variant="caption" color="textSecondary">{subtitle}</Typography>}
        </Box>
        <Box sx={{ backgroundColor: `${color}15`, borderRadius: 2, p: 1 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { dashboardData, fetchDashboardData, loading } = useApp();
  const [coverageData, setCoverageData] = useState(null);
  const [diseaseData, setDiseaseData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (dashboardData) {
      setCoverageData({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Coverage %',
          data: [85, 87, 84, 88, 86, dashboardData.vaccination_coverage || 85],
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33,150,243,0.1)',
          fill: true,
          tension: 0.4,
        }],
      });

      setDiseaseData({
        labels: ['Malaria', 'Measles', 'Cholera', 'TB', 'COVID'],
        datasets: [{
          data: [35, 20, 15, 25, 5],
          backgroundColor: ['#FF9800', '#F44336', '#2196F3', '#4CAF50', '#9C27B0'],
        }],
      });
    }
  }, [dashboardData]);

  if (loading && !dashboardData) return <LoadingScreen />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Vaccination Coverage"
            value={`${dashboardData?.vaccination_coverage || 0}%`}
            change={dashboardData?.coverage_change || -7}
            icon={<Vaccines sx={{ color: '#2196F3' }} />}
            color="#2196F3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Alerts"
            value={dashboardData?.active_alerts || 0}
            icon={<Warning sx={{ color: '#F44336' }} />}
            color="#F44336"
            subtitle={`${dashboardData?.critical_alerts || 0} critical`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Children Vaccinated"
            value={dashboardData?.children_vaccinated?.toLocaleString() || '0'}
            icon={<People sx={{ color: '#4CAF50' }} />}
            color="#4CAF50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Facilities"
            value={dashboardData?.total_facilities || 0}
            icon={<LocalHospital sx={{ color: '#9C27B0' }} />}
            color="#9C27B0"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Vaccination Coverage Trend</Typography>
            {coverageData && <Line data={coverageData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Disease Distribution</Typography>
            {diseaseData && <Pie data={diseaseData} options={{ responsive: true }} />}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Facility Performance</Typography>
            <Bar
              data={{
                labels: ['Ikot Abasi', 'E. Obolo', 'Mkpat Enin', 'Uyo', 'Itu'],
                datasets: [{
                  label: 'Coverage %',
                  data: [85, 78, 92, 88, 95],
                  backgroundColor: ['#F4433666', '#F4433666', '#4CAF5066', '#FF980066', '#4CAF5066'],
                }],
              }}
              options={{ responsive: true }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <AlertsWidget />
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>Health Facility Map</Typography>
            <MapView />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;