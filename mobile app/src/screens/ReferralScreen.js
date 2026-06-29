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
  Modal,
  FlatList,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LocationService } from '../services/LocationService';
import { MaternalAPI } from '../api/maternal';
import { FACILITY_TYPES } from '../utils/constants';

const ReferralScreen = ({ route, navigation }) => {
  const { patientId, type } = route.params;
  
  const [formData, setFormData] = useState({
    patientId: patientId || '',
    patientName: '',
    referralType: type || 'maternal',
    referringFacility: '',
    receivingFacility: '',
    reason: '',
    urgency: 'urgent',
    diagnosis: '',
    treatmentGiven: '',
    transportNeeded: false,
    escortNeeded: false,
    referralDate: new Date(),
    expectedArrival: '',
    referringClinician: '',
    contactPhone: '',
    additionalNotes: '',
    status: 'pending',
  });
  
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFacilityPicker, setShowFacilityPicker] = useState(false);
  const [facilities, setFacilities] = useState([
    { id: 1, name: 'General Hospital Ikot Abasi', type: 'General Hospital', distance: '5 km' },
    { id: 2, name: 'Teaching Hospital Uyo', type: 'Teaching Hospital', distance: '25 km' },
    { id: 3, name: 'Primary Health Centre Eastern Obolo', type: 'PHC', distance: '10 km' },
    { id: 4, name: 'Federal Medical Centre', type: 'Federal Medical Centre', distance: '30 km' },
  ]);
  const [filteredFacilities, setFilteredFacilities] = useState(facilities);

  useEffect(() => {
    getCurrentLocation();
    loadPatientInfo();
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
        referringFacility: geocode?.address || 'Current Location',
      }));
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const loadPatientInfo = async () => {
    try {
      if (type === 'maternal') {
        const result = await MaternalAPI.getPregnancyDetails(patientId);
        if (result.success) {
          setFormData(prev => ({
            ...prev,
            patientName: result.data.patientName || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error loading patient info:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('referralDate', selectedDate);
    }
  };

  const searchFacilities = (query) => {
    if (!query.trim()) {
      setFilteredFacilities(facilities);
      return;
    }
    
    const filtered = facilities.filter(f => 
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.type.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredFacilities(filtered);
  };

  const handleFacilitySelect = (facility) => {
    setFormData(prev => ({
      ...prev,
      receivingFacility: facility.name,
    }));
    setShowFacilityPicker(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.patientName || !formData.reason || !formData.receivingFacility) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (!formData.referringClinician) {
      Alert.alert('Validation Error', 'Referring clinician name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await MaternalAPI.referPatient(formData);
      
      if (result.success) {
        Alert.alert(
          'Referral Submitted',
          `Patient ${formData.patientName} has been referred to ${formData.receivingFacility}.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit referral');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Patient Information */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Patient Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.patientName}
            onChangeText={(text) => handleInputChange('patientName', text)}
            placeholder="Enter patient name"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Referral Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.referralType}
              onValueChange={(value) => handleInputChange('referralType', value)}
              style={styles.picker}
            >
              <Picker.Item label="Maternal" value="maternal" />
              <Picker.Item label="Neonatal" value="neonatal" />
              <Picker.Item label="Pediatric" value="pediatric" />
              <Picker.Item label="Medical" value="medical" />
              <Picker.Item label="Surgical" value="surgical" />
              <Picker.Item label="Emergency" value="emergency" />
            </Picker>
          </View>
        </View>
      </View>

      {/* Referral Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Referral Details</Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Referring Facility</Text>
          <View style={styles.inputWithIcon}>
            <Icon name="local-hospital" size={20} color="#666" />
            <TextInput
              style={styles.iconInput}
              value={formData.referringFacility}
              onChangeText={(text) => handleInputChange('referringFacility', text)}
              placeholder="Referring facility"
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Receiving Facility *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowFacilityPicker(true)}
          >
            <Icon name="local-hospital" size={20} color="#666" />
            <Text style={formData.receivingFacility ? styles.selectedText : styles.placeholderText}>
              {formData.receivingFacility || 'Select receiving facility'}
            </Text>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Urgency Level *</Text>
          <View style={styles.urgencyContainer}>
            {['routine', 'urgent', 'emergency'].map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.urgencyButton,
                  formData.urgency === level && styles[`urgency${level.charAt(0).toUpperCase() + level.slice(1)}`],
                ]}
                onPress={() => handleInputChange('urgency', level)}
              >
                <Icon
                  name={level === 'routine' ? 'schedule' : level === 'urgent' ? 'warning' : 'emergency'}
                  size={16}
                  color={formData.urgency === level ? '#fff' : '#666'}
                />
                <Text style={[
                  styles.urgencyText,
                  formData.urgency === level && styles.urgencyTextSelected,
                ]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Referral Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar-today" size={20} color="#666" />
            <Text style={styles.dateText}>{formatDate(formData.referralDate)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Expected Arrival Time</Text>
          <TextInput
            style={styles.input}
            value={formData.expectedArrival}
            onChangeText={(text) => handleInputChange('expectedArrival', text)}
            placeholder="e.g., 2:00 PM"
          />
        </View>
      </View>

      {/* Clinical Information */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Clinical Information</Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Diagnosis</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.diagnosis}
            onChangeText={(text) => handleInputChange('diagnosis', text)}
            placeholder="Enter diagnosis..."
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Reason for Referral *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.reason}
            onChangeText={(text) => handleInputChange('reason', text)}
            placeholder="Describe reason for referral..."
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Treatment Given</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.treatmentGiven}
            onChangeText={(text) => handleInputChange('treatmentGiven', text)}
            placeholder="Treatment administered before referral..."
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.checkboxGroup}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => handleInputChange('transportNeeded', !formData.transportNeeded)}
          >
            <Icon
              name={formData.transportNeeded ? 'check-box' : 'check-box-outline-blank'}
              size={24}
              color={formData.transportNeeded ? '#FF9800' : '#666'}
            />
            <Text style={styles.checkboxLabel}>Transport Needed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => handleInputChange('escortNeeded', !formData.escortNeeded)}
          >
            <Icon
              name={formData.escortNeeded ? 'check-box' : 'check-box-outline-blank'}
              size={24}
              color={formData.escortNeeded ? '#FF9800' : '#666'}
            />
            <Text style={styles.checkboxLabel}>Escort/Companion Needed</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Clinician Information */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Referring Clinician</Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Clinician Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.referringClinician}
            onChangeText={(text) => handleInputChange('referringClinician', text)}
            placeholder="Your name"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Contact Phone</Text>
          <TextInput
            style={styles.input}
            value={formData.contactPhone}
            onChangeText={(text) => handleInputChange('contactPhone', text)}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Additional Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.additionalNotes}
            onChangeText={(text) => handleInputChange('additionalNotes', text)}
            placeholder="Any additional notes or instructions..."
            multiline
            numberOfLines={3}
          />
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
            <Icon name="send" size={20} color="#fff" />
            <Text style={styles.submitText}>Submit Referral</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.referralDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Facility Picker Modal */}
      <Modal
        visible={showFacilityPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFacilityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Facility</Text>
              <TouchableOpacity onPress={() => setShowFacilityPicker(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search facilities..."
                onChangeText={searchFacilities}
              />
            </View>

            <FlatList
              data={filteredFacilities}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.facilityItem,
                    formData.receivingFacility === item.name && styles.facilityItemSelected,
                  ]}
                  onPress={() => handleFacilitySelect(item)}
                >
                  <View style={styles.facilityInfo}>
                    <Text style={styles.facilityName}>{item.name}</Text>
                    <Text style={styles.facilityDetails}>
                      {item.type} • {item.distance}
                    </Text>
                  </View>
                  {formData.receivingFacility === item.name && (
                    <Icon name="check-circle" size={24} color="#FF9800" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  card: {
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  iconInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
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
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  selectedText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
    color: '#999',
  },
  urgencyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    gap: 5,
  },
  urgencyRoutine: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  urgencyUrgent: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  urgencyEmergency: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  urgencyText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  urgencyTextSelected: {
    color: '#fff',
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
  checkboxGroup: {
    gap: 10,
    marginTop: 5,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
    gap: 8,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 5,
    backgroundColor: '#fafafa',
  },
  facilityItemSelected: {
    backgroundColor: '#FFF3E0',
  },
  facilityInfo: {
    flex: 1,
  },
  facilityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  facilityDetails: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
});

export default ReferralScreen;