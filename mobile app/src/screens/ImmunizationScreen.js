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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ImmunizationAPI } from '../api/immunization';
import { LocationService } from '../services/LocationService';
import { validateImmunization } from '../utils/validators';

const ImmunizationScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    childName: '',
    dateOfBirth: new Date(),
    gender: '',
    motherName: '',
    fatherName: '',
    address: '',
    phone: '',
    vaccineType: '',
    doseNumber: '',
    batchNumber: '',
    dateAdministered: new Date(),
    administeredBy: '',
    facility: '',
    location: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateField, setDateField] = useState('');
  const [vaccineList] = useState([
    'BCG', 'OPV-0', 'OPV-1', 'OPV-2', 'OPV-3',
    'Penta-1', 'Penta-2', 'Penta-3',
    'PCV-1', 'PCV-2', 'PCV-3',
    'Measles-1', 'Measles-2',
    'Yellow Fever', 'Vitamin A',
  ]);

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
        location: `${location.latitude}, ${location.longitude}`,
        facility: geocode?.address || '',
      }));
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange(dateField, selectedDate);
    }
  };

  const showDatePickerFor = (field) => {
    setDateField(field);
    setShowDatePicker(true);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSubmit = async () => {
    // Validate form
    const validationErrors = validateImmunization(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert('Validation Error', 'Please fix the errors before submitting.');
      return;
    }

    setLoading(true);
    try {
      const result = await ImmunizationAPI.submitRecord(formData);
      
      if (result.success) {
        Alert.alert(
          'Success',
          result.synced
            ? 'Immunization record submitted successfully.'
            : 'Record saved offline. Will sync when connected.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (result.synced) {
                  navigation.goBack();
                } else {
                  // Clear form for next entry
                  clearForm();
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit record');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      childName: '',
      dateOfBirth: new Date(),
      gender: '',
      motherName: '',
      fatherName: '',
      address: '',
      phone: '',
      vaccineType: '',
      doseNumber: '',
      batchNumber: '',
      dateAdministered: new Date(),
      administeredBy: '',
      facility: '',
      location: '',
    });
  };

  const FormField = ({ label, field, required, children }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      {children}
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="vaccines" size={30} color="#fff" />
        <Text style={styles.headerTitle}>Immunization Record</Text>
      </View>

      <View style={styles.form}>
        {/* Child Information */}
        <Text style={styles.sectionTitle}>Child Information</Text>
        
        <FormField label="Child's Full Name" field="childName" required>
          <TextInput
            style={[styles.input, errors.childName && styles.inputError]}
            value={formData.childName}
            onChangeText={(text) => handleInputChange('childName', text)}
            placeholder="Enter child's full name"
          />
        </FormField>

        <FormField label="Date of Birth" field="dateOfBirth" required>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => showDatePickerFor('dateOfBirth')}
          >
            <Icon name="calendar-today" size={20} color="#666" />
            <Text style={styles.dateText}>{formatDate(formData.dateOfBirth)}</Text>
          </TouchableOpacity>
        </FormField>

        <FormField label="Gender" field="gender" required>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                formData.gender === 'Male' && styles.genderSelected,
              ]}
              onPress={() => handleInputChange('gender', 'Male')}
            >
              <Icon
                name="male"
                size={20}
                color={formData.gender === 'Male' ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.genderText,
                  formData.gender === 'Male' && styles.genderTextSelected,
                ]}
              >
                Male
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderButton,
                formData.gender === 'Female' && styles.genderSelected,
              ]}
              onPress={() => handleInputChange('gender', 'Female')}
            >
              <Icon
                name="female"
                size={20}
                color={formData.gender === 'Female' ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.genderText,
                  formData.gender === 'Female' && styles.genderTextSelected,
                ]}
              >
                Female
              </Text>
            </TouchableOpacity>
          </View>
        </FormField>

        <FormField label="Mother's Name" field="motherName">
          <TextInput
            style={styles.input}
            value={formData.motherName}
            onChangeText={(text) => handleInputChange('motherName', text)}
            placeholder="Enter mother's name"
          />
        </FormField>

        <FormField label="Phone Number" field="phone">
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => handleInputChange('phone', text)}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
        </FormField>

        {/* Vaccination Details */}
        <Text style={styles.sectionTitle}>Vaccination Details</Text>

        <FormField label="Vaccine Type" field="vaccineType" required>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.vaccineType}
              onValueChange={(value) => handleInputChange('vaccineType', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select vaccine..." value="" />
              {vaccineList.map((vaccine) => (
                <Picker.Item key={vaccine} label={vaccine} value={vaccine} />
              ))}
            </Picker>
          </View>
        </FormField>

        <FormField label="Dose Number" field="doseNumber" required>
          <TextInput
            style={[styles.input, errors.doseNumber && styles.inputError]}
            value={formData.doseNumber}
            onChangeText={(text) => handleInputChange('doseNumber', text)}
            placeholder="e.g., 1st dose, 2nd dose"
          />
        </FormField>

        <FormField label="Batch Number" field="batchNumber" required>
          <TextInput
            style={[styles.input, errors.batchNumber && styles.inputError]}
            value={formData.batchNumber}
            onChangeText={(text) => handleInputChange('batchNumber', text)}
            placeholder="Enter vaccine batch number"
          />
        </FormField>

        <FormField label="Date Administered" field="dateAdministered" required>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => showDatePickerFor('dateAdministered')}
          >
            <Icon name="calendar-today" size={20} color="#666" />
            <Text style={styles.dateText}>
              {formatDate(formData.dateAdministered)}
            </Text>
          </TouchableOpacity>
        </FormField>

        <FormField label="Administered By" field="administeredBy" required>
          <TextInput
            style={[styles.input, errors.administeredBy && styles.inputError]}
            value={formData.administeredBy}
            onChangeText={(text) => handleInputChange('administeredBy', text)}
            placeholder="Name of health worker"
          />
        </FormField>

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
              <Icon name="save" size={20} color="#fff" />
              <Text style={styles.submitText}>Submit Record</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={formData[dateField]}
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
    backgroundColor: '#4CAF50',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
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
  required: {
    color: '#f44336',
  },
  input: {
    backgroundColor: '#fff',
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  genderSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  genderText: {
    marginLeft: 5,
    fontSize: 16,
    color: '#666',
  },
  genderTextSelected: {
    color: '#fff',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
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

export default ImmunizationScreen;