import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Button,
  MenuItem, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Description, PictureAsPdf, TableChart, Download,
  Visibility, Share
} from '@mui/icons-material';
import api from '../services/api';
import { useSnackbar } from 'notistack';

const Reports = () => {
  const [reportType, setReportType] = useState('weekly');
  const [format, setFormat] = useState('docx');
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const reports = [
    { id: 1, title: 'Weekly Report - Week 24', type: 'weekly', date: '2024-06-14', status: 'generated', author: 'System' },
    { id: 2, title: 'Monthly Report - May 2024', type: 'monthly', date: '2024-06-01', status: 'approved', author: 'Dr. Smith' },
    { id: 3, title: 'Donor Report - Q2 2024', type: 'donor', date: '2024-06-10', status: 'draft', author: 'Admin' },
    { id: 4, title: 'Field Report - Ikot Abasi', type: 'field', date: '2024-06-12', status: 'generated', author: 'Field Worker' },
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await api.post(`/reports/generate-${reportType}`, { format });
      enqueueSnackbar('Report generated successfully!', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Report generation failed', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (reportId, format) => {
    try {
      const response = await api.get(`/reports/download/${reportId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      enqueueSnackbar('Download started', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Download failed', { variant: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Reports</Typography>

      {/* Generate New Report */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Generate New Report</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth label="Report Type" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <MenuItem value="weekly">Weekly Report</MenuItem>
              <MenuItem value="monthly">Monthly Report</MenuItem>
              <MenuItem value="donor">Donor Report</MenuItem>
              <MenuItem value="field">Field Report</MenuItem>
              <MenuItem value="evaluation">Evaluation Report</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth label="Format" value={format} onChange={(e) => setFormat(e.target.value)}>
              <MenuItem value="docx">Word Document (.docx)</MenuItem>
              <MenuItem value="pdf">PDF (.pdf)</MenuItem>
              <MenuItem value="html">HTML</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button variant="contained" fullWidth onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Reports List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Generated Reports</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Author</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Description color="primary" />
                      {report.title}
                    </Box>
                  </TableCell>
                  <TableCell><Chip label={report.type} size="small" /></TableCell>
                  <TableCell>{report.date}</TableCell>
                  <TableCell>
                    <Chip
                      label={report.status}
                      color={report.status === 'approved' ? 'success' : report.status === 'draft' ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{report.author}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Preview"><IconButton size="small" onClick={() => setPreviewOpen(true)}><Visibility /></IconButton></Tooltip>
                    <Tooltip title="Download PDF"><IconButton size="small" onClick={() => handleDownload(report.id, 'pdf')}><PictureAsPdf /></IconButton></Tooltip>
                    <Tooltip title="Download Word"><IconButton size="small" onClick={() => handleDownload(report.id, 'docx')}><TableChart /></IconButton></Tooltip>
                    <Tooltip title="Share"><IconButton size="small"><Share /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Reports;