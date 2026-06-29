import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Paper, Card, CardContent,
  Chip, LinearProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Alert
} from '@mui/material';
import { TrendingUp, TrendingDown, Warning, CheckCircle, Timeline } from '@mui/icons-material';
import { Bar, Line } from 'react-chartjs-2';
import api from '../services/api';
import LoadingScreen from '../components/common/LoadingScreen';

const AIInsights = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await api.get('/ai/analyze?data_source=vaccination');
      setInsights(response.data);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>AI Insights</Typography>

      {/* Key Findings */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderLeft: '4px solid #F44336' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Warning color="error" sx={{ mr: 1 }} />
                <Typography variant="h6" color="error">Critical Finding</Typography>
              </Box>
              <Typography variant="body1">
                Coverage dropped 7% in Akwa Ibom. 2,100 children missed vaccination.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderLeft: '4px solid #FF9800' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingDown color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="warning.main">Early Warning</Typography>
              </Box>
              <Typography variant="body1">
                3 facilities at risk of vaccine stockout within 30 days.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderLeft: '4px solid #4CAF50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">Positive Trend</Typography>
              </Box>
              <Typography variant="body1">
                ANC attendance improved 15% after community outreach program.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Analysis */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Coverage Drop Analysis</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>LGA</TableCell>
                    <TableCell align="right">Previous</TableCell>
                    <TableCell align="right">Current</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { lga: 'Ikot Abasi', prev: 94, curr: 82, change: -12 },
                    { lga: 'Eastern Obolo', prev: 90, curr: 79, change: -11 },
                    { lga: 'Mkpat Enin', prev: 93, curr: 91, change: -2 },
                    { lga: 'Uyo', prev: 88, curr: 89, change: 1 },
                    { lga: 'Itu', prev: 91, curr: 93, change: 2 },
                  ].map((row) => (
                    <TableRow key={row.lga}>
                      <TableCell>{row.lga}</TableCell>
                      <TableCell align="right">{row.prev}%</TableCell>
                      <TableCell align="right">{row.curr}%</TableCell>
                      <TableCell align="right" sx={{ color: row.change < 0 ? 'error.main' : 'success.main' }}>
                        {row.change > 0 ? '+' : ''}{row.change}%
                      </TableCell>
                      <TableCell>
                        <Chip label={row.change < -5 ? 'Critical' : row.change < 0 ? 'Declining' : 'Stable'} color={row.change < -5 ? 'error' : row.change < 0 ? 'warning' : 'success'} size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>AI Recommendations</Typography>
            {[
              { priority: 'High', action: 'Deploy mobile vaccination teams to Ikot Abasi and Eastern Obolo', impact: 'Expected to recover 1,500+ missed vaccinations' },
              { priority: 'High', action: 'Conduct community sensitization campaigns in low-coverage areas', impact: 'Address vaccine hesitancy in affected communities' },
              { priority: 'Medium', action: 'Strengthen supply chain to remote facilities', impact: 'Prevent stockouts and ensure vaccine availability' },
              { priority: 'Medium', action: 'Partner with community leaders for advocacy', impact: 'Improve community acceptance and uptake' },
            ].map((rec, i) => (
              <Card key={i} sx={{ mb: 1 }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={rec.priority} color={rec.priority === 'High' ? 'error' : 'warning'} size="small" />
                    <Typography variant="body2" sx={{ flex: 1 }}>{rec.action}</Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary">{rec.impact}</Typography>
                </CardContent>
              </Card>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AIInsights;