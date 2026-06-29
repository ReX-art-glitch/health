import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Paper, Typography, Box,
  Card, CardContent, LinearProgress, Chip,
  Button, IconButton, Tooltip
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Warning,
  LocalHospital, People, Vaccines,
  Medication, Assessment, Timeline
} from '@mui/icons-material';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement,
  Title, Tooltip as ChartTooltip, Legend
} from 'chart.js';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement,
  Title, ChartTooltip, Legend
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_facilities: 0,
    vaccination_coverage: 0,
    active_alerts: 0,
    reports_generated: 0,
    children_vaccinated: 0,
    maternal_cases: 0
  });
  
  const [coverageTrend, setCoverageTrend] = useState([]);
  const [diseaseData, setDiseaseData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, coverageRes, diseaseRes, alertsRes] = await Promise.all([
        axios.get('/api/v1/dashboards/stats'),
        axios.get('/api/v1/dashboards/coverage-trend'),
        axios.get('/api/v1/dashboards/disease-surveillance'),
        axios.get('/api/v1/alerts/active-alerts')
      ]);

      setStats(statsRes.data);
      setCoverageTrend(coverageRes.data);
      setDiseaseData(diseaseRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    }
    setLoading(false);
  };

  const coverageChartData = {
    labels: coverageTrend.map(d => d.month),
    datasets: [
      {
        label: 'Vaccination Coverage %',
        data: coverageTrend.map(d => d.coverage),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Target',
        data: coverageTrend.map(() => 90),
        borderColor: '#4CAF50',
        borderDash: [5, 5],
        fill: false
      }
    ]
  };

  return (
    <Container maxWidth="xl" style={{ marginTop: '20px' }}>
      {/* Alert Banner */}
      {alerts.filter(a => a.severity === 'critical').length > 0 && (
        <Paper 
          style={{ 
            padding: '15px', 
            marginBottom: '20px', 
            backgroundColor: '#ffebee',
            border: '2px solid #f44336'
          }}
        >
          <Box display="flex" alignItems="center">
            <Warning style={{ color: '#f44336', marginRight: '10px' }} />
            <Typography variant="h6" color="error">
              {alerts.filter(a => a.severity === 'critical').length} Critical Alerts Require Immediate Attention
            </Typography>
            <Button 
              variant="contained" 
              color="error" 
              style={{ marginLeft: 'auto' }}
              onClick={() => window.location.href='/alerts'}
            >
              View Alerts
            </Button>
          </Box>
        </Paper>
      )}

      {/* Key Metrics */}
      <Grid container spacing={3} style={{ marginBottom: '30px' }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography color="textSecondary" gutterBottom>
                  Vaccination Coverage
                </Typography>
                <Vaccines color="primary" />
              </Box>
              <Typography variant="h4">
                {stats.vaccination_coverage}%
              </Typography>
              <Box display="flex" alignItems="center">
                {stats.coverage_change > 0 ? (
                  <TrendingUp style={{ color: '#4CAF50' }} />
                ) : (
                  <TrendingDown style={{ color: '#f44336' }} />
                )}
                <Typography 
                  variant="body2" 
                  style={{ 
                    color: stats.coverage_change > 0 ? '#4CAF50' : '#f44336',
                    marginLeft: '5px'
                  }}
                >
                  {stats.coverage_change}% from last month
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={stats.vaccination_coverage}
                style={{ marginTop: '10px', height: '8px', borderRadius: '5px' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography color="textSecondary">Active Alerts</Typography>
                <Warning color="error" />
              </Box>
              <Typography variant="h4">{stats.active_alerts}</Typography>
              <Chip 
                label={`${alerts.filter(a => a.severity === 'critical').length} Critical`}
                color="error"
                size="small"
                style={{ marginTop: '10px' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography color="textSecondary">Children Vaccinated</Typography>
                <People color="primary" />
              </Box>
              <Typography variant="h4">
                {stats.children_vaccinated?.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography color="textSecondary">Facilities</Typography>
                <LocalHospital color="primary" />
              </Box>
              <Typography variant="h4">{stats.total_facilities}</Typography>
              <Chip 
                label={`${stats.active_facilities} Active`}
                color="success"
                size="small"
                style={{ marginTop: '10px' }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Coverage Trend */}
        <Grid item xs={12} md={8}>
          <Paper style={{ padding: '20px' }}>
            <Typography variant="h6" gutterBottom>
              Vaccination Coverage Trend
            </Typography>
            <Line 
              data={coverageChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom' },
                  title: {
                    display: true,
                    text: 'Monthly Vaccination Coverage vs Target (90%)'
                  }
                },
                scales: {
                  y: {
                    min: 0,
                    max: 100,
                    ticks: {
                      callback: (value) => `${value}%`
                    }
                  }
                }
              }}
            />
          </Paper>
        </Grid>

        {/* Disease Hotspots */}
        <Grid item xs={12} md={4}>
          <Paper style={{ padding: '20px' }}>
            <Typography variant="h6" gutterBottom>
              Disease Hotspots
            </Typography>
            <List>
              {diseaseData.map((item) => (
                <ListItem key={item.location}>
                  <ListItemText
                    primary={item.location}
                    secondary={`${item.disease}: ${item.cases} cases`}
                  />
                  <Chip
                    label={item.risk_level}
                    color={item.risk_level === 'High' ? 'error' : 'warning'}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Facility Performance */}
        <Grid item xs={12} md={6}>
          <Paper style={{ padding: '20px' }}>
            <Typography variant="h6" gutterBottom>
              Facility Performance
            </Typography>
            <Bar
              data={{
                labels: ['Ikot Abasi', 'E. Obolo', 'Mkpat Enin', 'Uyo', 'Itu'],
                datasets: [{
                  label: 'Coverage %',
                  data: [85, 78, 92, 88, 95],
                  backgroundColor: [
                    'rgba(244, 67, 54, 0.7)',
                    'rgba(244, 67, 54, 0.7)',
                    'rgba(76, 175, 80, 0.7)',
                    'rgba(255, 193, 7, 0.7)',
                    'rgba(76, 175, 80, 0.7)'
                  ]
                }]
              }}
              options={{
                plugins: {
                  title: {
                    display: true,
                    text: 'Vaccination Coverage by LGA'
                  }
                }
              }}
            />
          </Paper>
        </Grid>

        {/* Drug Inventory Status */}
        <Grid item xs={12} md={6}>
          <Paper style={{ padding: '20px' }}>
            <Typography variant="h6" gutterBottom>
              Drug Inventory Status
            </Typography>
            <Doughnut
              data={{
                labels: ['Adequate', 'Low Stock', 'Stockout'],
                datasets: [{
                  data: [65, 25, 10],
                  backgroundColor: [
                    'rgba(76, 175, 80, 0.7)',
                    'rgba(255, 193, 7, 0.7)',
                    'rgba(244, 67, 54, 0.7)'
                  ]
                }]
              }}
            />
          </Paper>
        </Grid>

        {/* AI Insights Panel */}
        <Grid item xs={12}>
          <Paper style={{ padding: '20px', backgroundColor: '#e3f2fd' }}>
            <Box display="flex" alignItems="center" marginBottom="10px">
              <Assessment style={{ marginRight: '10px' }} />
              <Typography variant="h6">AI Insights</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="error" gutterBottom>
                      Critical Finding
                    </Typography>
                    <Typography variant="body1">
                      Coverage dropped 7% in Akwa Ibom. 2,100 children missed vaccination.
                    </Typography>
                    <Button 
                      size="small" 
                      color="primary"
                      style={{ marginTop: '10px' }}
                    >
                      Investigate
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="warning.main" gutterBottom>
                      Early Warning
                    </Typography>
                    <Typography variant="body1">
                      3 facilities at risk of vaccine stockout within 30 days.
                    </Typography>
                    <Button 
                      size="small" 
                      color="primary"
                      style={{ marginTop: '10px' }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="success.main" gutterBottom>
                      Positive Trend
                    </Typography>
                    <Typography variant="body1">
                      ANC attendance improved 15% after community outreach program.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;