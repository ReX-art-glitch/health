import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LocationService } from '../services/LocationService';
import { validateFacilityAssessment } from '../utils/validators';
import { FACILITY_TYPES } from '../utils/constants';

const FacilityAssessmentScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    facilityName: '',
    facilityType: '',
    lga: '',
    state: '',
    assessmentDate: new Date(),
    assessorName: '',
    assessorTitle: '',
    infrastructure: 3,
    equipment: 3,
    staffing: 3,
    supplies: 3,
    sanitation: 3,
    powerSupply: '',
    waterSupply: '',
    internetAccess: false,
    coldChainFunctional: false,
    emergencyTransport: false,
    staffCount: '',
    beds: '',
    dailyPatients: '',
    services: [],
    challenges: '',
    recommendations: '',
    photos: [],
    location: '',
    gpsCoordinates: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentRating, setCurrentRating] = useState(null);

  const servicesList = [
    'Outpatient', 'Inpatient', 'Maternity', 'Immunization',
    'Family Planning', 'Laboratory', 'Pharmacy', 'Emergency',
    'Surgery', 'Pediatrics', 'Antenatal', 'HIV Testing',
    'TB Treatment', 'Malaria Treatment', 'Nutrition',
  ];

  const powerOptions = [
    'National Grid', 'Generator', 'Solar', 'None',
  ];

  const waterOptions = [
    'Piped Water', 'Borehole', 'Well', 'Rainwater', 'Tanker', 'None',
  ];

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const location = await LocationService.getCurrentPosition();
      const geocode = await LocationService.reverseGeocode(
        location.latitude,
        location.longitude
      );
      
      setFormData(prev => ({
        ...prev,
        gpsCoordinates: `${location.latitude}, ${location.longitude}`,
        lga: geocode?.lga || '',
        state: geocode?.state || '',
      }));
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('assessmentDate', selectedDate);
    }
  };

  const toggleService = (service) => {
    setFormData(prev => {
      const services = prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service];
      return { ...prev, services };
    });
  };

  const takePhoto = () => {
    Alert.alert(
      'Add Photo',
      'Choose photo source',
      [
        {
          text: 'Camera',
          onPress: () => {
            launchCamera({
              mediaType: 'photo',
              quality: 0.8,
              maxWidth: 1920,
              maxHeight: 1080,
            }, (response) => {
              if (!response.didCancel && !response.error) {
                setFormData(prev => ({
                  ...prev,
                  photos: [...prev.photos, response.assets[0]],
                }));
              }
            });
          },
        },
        {
          text: 'Gallery',
          onPress: () => {
            launchImageLibrary({
              mediaType: 'photo',
              quality: 0.8,
              maxWidth: 1920,
              maxHeight: 1080,
              selectionLimit: 5,
            }, (response) => {
              if (!response.didCancel && !response.error) {
                setFormData(prev => ({
                  ...prev,
                  photos: [...prev.photos, ...response.assets],
                }));
              }
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    const validationErrors = validateFacilityAssessment(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert('Validation Error', 'Please fix the errors before submitting.');
      return;
    }

    setLoading(true);
    try {
      // Create FormData for multipart upload (photos)
      const fd = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'photos') {
          formData.photos.forEach((photo, index) => {
            fd.append(`photo_${index}`, {
              uri: photo.uri,
              type: photo.type,
              name: photo.fileName,
            });
          });
        } else if (key === 'services') {
          fd.append(key, JSON.stringify(formData[key]));
        } else {
          fd.append(key, formData[key]?.toString() || '');
        }
      });

      // Submit assessment
      const API = require('../api/client').default;
      const response = await API.upload('/data/facility-assessment', fd);

      Alert.alert(
        'Success',
        'Facility assessment submitted successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit assessment');
    } finally {
      setLoading(false);
    }
  };

  const renderStarRating = (field, label) => {
    const rating = formData[field];
    return (
      <View style={styles.ratingContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity
              key={star}
              onPress={() => handleInputChange(field, star)}
            >
              <Icon
                name={star <= rating ? 'star' : 'star-border'}
                size={32}
                color={star <= rating ? '#FFD700' : '#ccc'}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>
          {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Average' : rating === 4 ? 'Good' : 'Excellent'}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="assessment" size={30} color="#fff" />
        <Text style={styles.headerTitle}>Facility Assessment</Text>
      </View>

      <View style={styles.form}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Facility Name *</Text>
            <TextInput
              style={[styles.input, errors.facilityName && styles.inputError]}
              value={formData.facilityName}
              onChangeText={(text) => handleInputChange('facilityName', text)}
              placeholder="Enter facility name"
            />
            {errors.facilityName && <Text style={styles.errorText}>{errors.facilityName}</Text>}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Facility Type *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.facilityType}
                onValueChange={(value) => handleInputChange('facilityType', value)}
                style={styles.picker}
              >
                <Picker.Item label="Select facility type..." value="" />
                {FACILITY_TYPES.map(type => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.label}>LGA</Text>
              <TextInput
                style={styles.input}
                value={formData.lga}
                onChangeText={(text) => handleInputChange('lga', text)}
                placeholder="LGA"
              />
            </View>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={formData.state}
                onChangeText={(text) => handleInputChange('state', text)}
                placeholder="State"
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Assessment Date *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar-today" size={20} color="#666" />
              <Text style={styles.dateText}>
                {formData.assessmentDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.label}>Assessor Name *</Text>
              <TextInput
                style={[styles.input, errors.assessorName && styles.inputError]}
                value={formData.assessorName}
                onChangeText={(text) => handleInputChange('assessorName', text)}
                placeholder="Your name"
              />
            </View>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={formData.assessorTitle}
                onChangeText={(text) => handleInputChange('assessorTitle', text)}
                placeholder="Your title"
              />
            </View>
          </View>
        </View>

        {/* Ratings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facility Ratings</Text>
          <Text style={styles.sectionSubtitle}>Rate each category from 1 (Poor) to 5 (Excellent)</Text>
          
          {renderStarRating('infrastructure', 'Infrastructure')}
          {renderStarRating('equipment', 'Equipment')}
          {renderStarRating('staffing', 'Staffing')}
          {renderStarRating('supplies', 'Supplies')}
          {renderStarRating('sanitation', 'Sanitation')}
        </View>

        {/* Utilities & Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Utilities & Infrastructure</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Power Supply</Text>
            <View style={styles.chipContainer}>
              {powerOptions.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.chip,
                    formData.powerSupply === option && styles.chipSelected,
                  ]}
                  onPress={() => handleInputChange('powerSupply', option)}
                >
                  <Text style={[
                    styles.chipText,
                    formData.powerSupply === option && styles.chipTextSelected,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Water Supply</Text>
            <View style={styles.chipContainer}>
              {waterOptions.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.chip,
                    formData.waterSupply === option && styles.chipSelected,
                  ]}
                  onPress={() => handleInputChange('waterSupply', option)}
                >
                  <Text style={[
                    styles.chipText,
                    formData.waterSupply === option && styles.chipTextSelected,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.checkboxGroup}>
            <TouchableOpacity
              style={styles.checkboxItem}
              onPress={() => handleInputChange('internetAccess', !formData.internetAccess)}
            >
              <Icon
                name={formData.internetAccess ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={formData.internetAccess ? '#2196F3' : '#666'}
              />
              <Text style={styles.checkboxLabel}>Internet Access Available</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxItem}
              onPress={() => handleInputChange('coldChainFunctional', !formData.coldChainFunctional)}
            >
              <Icon
                name={formData.coldChainFunctional ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={formData.coldChainFunctional ? '#2196F3' : '#666'}
              />
              <Text style={styles.checkboxLabel}>Cold Chain Functional</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxItem}
              onPress={() => handleInputChange('emergencyTransport', !formData.emergencyTransport)}
            >
              <Icon
                name={formData.emergencyTransport ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={formData.emergencyTransport ? '#2196F3' : '#666'}
              />
              <Text style={styles.checkboxLabel}>Emergency Transport Available</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Capacity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Capacity & Services</Text>
          
          <View style={styles.row}>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.label}>Staff Count</Text>
              <TextInput
                style={styles.input}
                value={formData.staffCount}
                onChangeText={(text) => handleInputChange('staffCount', text)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.label}>Beds</Text>
              <TextInput
                style={styles.input}
                value={formData.beds}
                onChangeText={(text) => handleInputChange('beds', text)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.label}>Daily Patients</Text>
              <TextInput
                style={styles.input}
                value={formData.dailyPatients}
                onChangeText={(text) => handleInputChange('dailyPatients', text)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Services Provided</Text>
            <View style={styles.chipContainer}>
              {servicesList.map(service => (
                <TouchableOpacity
                  key={service}
                  style={[
                    styles.chip,
                    formData.services.includes(service) && styles.chipSelected,
                  ]}
                  onPress={() => toggleService(service)}
                >
                  <Text style={[
                    styles.chipText,
                    formData.services.includes(service) && styles.chipTextSelected,
                  ]}>
                    {service}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          
          <View style={styles.photoGrid}>
            {formData.photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => removePhoto(index)}
                >
                  <Icon name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPhoto} onPress={takePhoto}>
              <Icon name="add-a-photo" size={30} color="#666" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comments & Recommendations</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Challenges</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.challenges}
              onChangeText={(text) => handleInputChange('challenges', text)}
              placeholder="Describe challenges faced by the facility..."
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Recommendations</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.recommendations}
              onChangeText={(text) => handleInputChange('recommendations', text)}
              placeholder="Your recommendations for improvement..."
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* GPS Coordinates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>GPS Coordinates</Text>
            <View style={styles.gpsContainer}>
              <Icon name="gps-fixed" size={20} color="#4CAF50" />
              <Text style={styles.gpsText}>{formData.gpsCoordinates || 'Fetching location...'}</Text>
              <TouchableOpacity onPress={getCurrentLocation}>
                <Icon name="refresh" size={20} color="#2196F3" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="cloud-upload" size={20} color="#fff" />
              <Text style={styles.submitText}>Submit Assessment</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.assessmentDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  form: {
    padding: 15,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
  },
  fieldContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 5,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerContainer: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  ratingContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 5,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  chipSelected: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  chipText: {
    fontSize: 13,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
  },
  checkboxGroup: {
    gap: 10,
    marginTop: 10,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  gpsText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    padding: 15,
    borderRadius: 8,
    marginVertical: 20,
    gap: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FacilityAssessmentScreen;