import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, TextField,
  Button, MenuItem, Rating, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress,
  FormControlLabel, Switch, Slider, Alert
} from '@mui/material';
import {
  LocalHospital, Add, Edit, Delete, Visibility,
  LocationOn, Phone, Email, PhotoCamera
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';
import { useSnackbar } from 'notistack';

const FacilityAssessment = () => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [formData, setFormData] = useState({
    name: '', type: '', lga: '', state: '', address: '',
    coordinates: '', phone: '', email: '',
    infrastructure: 3, equipment: 3, staffing: 3,
    supplies: 3, sanitation: 3,
    services: [], challenges: '', recommendations: '',
  });
  const [photos, setPhotos] = useState([]);
  const { enqueueSnackbar } = useSnackbar();

  const facilityTypes = [
    'Primary Health Centre', 'Secondary Health Centre', 'General Hospital',
    'Teaching Hospital', 'Private Clinic', 'Maternity Home', 'Dispensary', 'Health Post'
  ];

  const services = [
    'Outpatient', 'Inpatient', 'Maternity', 'Immunization',
    'Family Planning', 'Laboratory', 'Pharmacy', 'Emergency',
    'Surgery', 'Pediatrics', 'Antenatal', 'HIV Testing'
  ];

  const ratingLabels = {
    1: 'Poor', 2: 'Fair', 3: 'Average', 4: 'Good', 5: 'Excellent'
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      const response = await api.get('/dashboards/facility-performance');
      setFacilities(response.data || []);
    } catch (error) {
      console.error('Error fetching facilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (facility = null) => {
    if (facility) {
      setSelectedFacility(facility);
      setFormData(facility);
    } else {
      setSelectedFacility(null);
      setFormData({
        name: '', type: '', lga: '', state: '', address: '',
        coordinates: '', phone: '', email: '',
        infrastructure: 3, equipment: 3, staffing: 3,
        supplies: 3, sanitation: 3,
        services: [], challenges: '', recommendations: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedFacility(null);
    setPhotos([]);
  };

  const handleSubmit = async () => {
    try {
      if (selectedFacility) {
        await api.put(`/data/facility-assessment/${selectedFacility.id}`, formData);
        enqueueSnackbar('Facility updated successfully', { variant: 'success' });
      } else {
        const fd = new FormData();
        Object.keys(formData).forEach(key => {
          fd.append(key, typeof formData[key] === 'object' ? JSON.stringify(formData[key]) : formData[key]);
        });
        photos.forEach((photo, i) => fd.append(`photo_${i}`, photo));
        await api.post('/data/facility-assessment', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        enqueueSnackbar('Facility assessment submitted', { variant: 'success' });
      }
      handleCloseDialog();
      fetchFacilities();
    } catch (error) {
      enqueueSnackbar('Failed to save facility', { variant: 'error' });
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => setPhotos(prev => [...prev, ...acceptedFiles]),
    accept: { 'image/*': [] },
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Facility Assessments</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          New Assessment
        </Button>
      </Box>

      <Grid container spacing={3}>
        {facilities.map((facility) => (
          <Grid item xs={12} md={6} lg={4} key={facility.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalHospital color="primary" />
                    <Typography variant="h6">{facility.name || facility.facility_name}</Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog(facility)}><Edit /></IconButton>
                    <IconButton size="small" color="error"><Delete /></IconButton>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip label={facility.type || facility.facility_type} size="small" sx={{ mr: 1 }} />
                  <Chip 
                    label={facility.status || 'Active'} 
                    color={facility.status === 'Good' ? 'success' : 'warning'} 
                    size="small" 
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="body2" color="textSecondary">
                    {facility.lga}, {facility.state}
                  </Typography>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Ratings</Typography>
                {['infrastructure', 'equipment', 'staffing', 'supplies', 'sanitation'].map((item) => (
                  <Box key={item} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{item}</Typography>
                    <Rating value={facility[item] || 3} readOnly size="small" />
                  </Box>
                ))}

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Services</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(facility.services || []).slice(0, 4).map((service, i) => (
                      <Chip key={i} label={service} size="small" variant="outlined" />
                    ))}
                    {(facility.services || []).length > 4 && (
                      <Chip label={`+${facility.services.length - 4} more`} size="small" />
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Assessment Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedFacility ? 'Edit Facility Assessment' : 'New Facility Assessment'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Facility Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Facility Type" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                {facilityTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="LGA" value={formData.lga} onChange={(e) => setFormData({...formData, lga: e.target.value})} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="State" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} multiline rows={2} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>Ratings</Typography>
            </Grid>
            {['infrastructure', 'equipment', 'staffing', 'supplies', 'sanitation'].map((item) => (
              <Grid item xs={12} key={item}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize', width: 120 }}>{item}</Typography>
                  <Rating
                    value={formData[item]}
                    onChange={(e, v) => setFormData({...formData, [item]: v})}
                  />
                  <Typography variant="body2" color="textSecondary">{ratingLabels[formData[item]]}</Typography>
                </Box>
              </Grid>
            ))}

            <Grid item xs={12}>
              <TextField fullWidth label="Challenges" value={formData.challenges} onChange={(e) => setFormData({...formData, challenges: e.target.value})} multiline rows={3} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Recommendations" value={formData.recommendations} onChange={(e) => setFormData({...formData, recommendations: e.target.value})} multiline rows={3} />
            </Grid>

            <Grid item xs={12}>
              <Box {...getRootProps()} sx={{ border: '2px dashed #ccc', borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer' }}>
                <input {...getInputProps()} />
                <PhotoCamera sx={{ fontSize: 40, color: 'action.active', mb: 1 }} />
                <Typography>Drag & drop photos or click to select</Typography>
              </Box>
              {photos.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  {photos.map((photo, i) => (
                    <Chip key={i} label={photo.name} onDelete={() => setPhotos(prev => prev.filter((_, j) => j !== i))} />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {selectedFacility ? 'Update' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FacilityAssessment;