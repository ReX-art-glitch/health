import React, { useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Button, Card, CardContent,
  TextField, MenuItem, Grid, Alert, Snackbar, CircularProgress
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { CloudUpload, Description, Camera } from '@mui/icons-material';
import api from '../services/api';

const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ p: 3 }}>{children}</Box>}</div>
);

const DataEntry = () => {
  const [tab, setTab] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    child_name: '', vaccine_type: '', dose_number: '', batch_number: '',
    facility: '', location: '', administered_by: '',
  });

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    try {
      const response = await api.post('/upload/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSnackbar({ open: true, message: 'File uploaded and processed successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Upload failed: ' + (error.response?.data?.detail || error.message), severity: 'error' });
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'], 'text/csv': ['.csv'] } });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      await api.post('/data/immunization', formData);
      setSnackbar({ open: true, message: 'Record submitted successfully!', severity: 'success' });
      setFormData({ child_name: '', vaccine_type: '', dose_number: '', batch_number: '', facility: '', location: '', administered_by: '' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Submission failed', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Data Entry</Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Manual Entry" />
          <Tab label="Excel Upload" />
          <Tab label="Paper Form Scan" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Child Name" value={formData.child_name} onChange={(e) => setFormData({...formData, child_name: e.target.value})} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Vaccine Type" value={formData.vaccine_type} onChange={(e) => setFormData({...formData, vaccine_type: e.target.value})} required>
                  {['BCG', 'OPV', 'Penta', 'PCV', 'Measles', 'Yellow Fever'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Dose Number" value={formData.dose_number} onChange={(e) => setFormData({...formData, dose_number: e.target.value})} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Batch Number" value={formData.batch_number} onChange={(e) => setFormData({...formData, batch_number: e.target.value})} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Facility" value={formData.facility} onChange={(e) => setFormData({...formData, facility: e.target.value})} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Administered By" value={formData.administered_by} onChange={(e) => setFormData({...formData, administered_by: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" size="large" disabled={uploading}>
                  {uploading ? <CircularProgress size={24} /> : 'Submit Record'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Card variant="outlined" sx={{ borderStyle: 'dashed', borderColor: isDragActive ? 'primary.main' : 'grey.400', backgroundColor: isDragActive ? 'action.hover' : 'transparent' }}>
            <CardContent {...getRootProps()} sx={{ textAlign: 'center', py: 6, cursor: 'pointer' }}>
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6">Drag & drop Excel file here</Typography>
              <Typography variant="body2" color="textSecondary">or click to browse</Typography>
              <Typography variant="caption" color="textSecondary">Supports .xlsx, .xls, .csv</Typography>
              {uploading && <CircularProgress sx={{ mt: 2 }} />}
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Card variant="outlined" sx={{ borderStyle: 'dashed', borderColor: 'grey.400' }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Camera sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6">Upload Paper Form Image</Typography>
              <Typography variant="body2" color="textSecondary">AI OCR will extract data automatically</Typography>
              <Button variant="contained" component="label" sx={{ mt: 2 }}>
                Select Image
                <input type="file" hidden accept="image/*" />
              </Button>
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({...snackbar, open: false})}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DataEntry;