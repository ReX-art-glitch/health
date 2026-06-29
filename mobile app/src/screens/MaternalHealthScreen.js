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
  FlatList,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MaternalAPI } from '../api/maternal';
import { LocationService } from '../services/LocationService';
import { validateMaternalHealth } from '../utils/validators';

const MaternalHealthScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('register'); // register, records, high-risk
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    lmp: new Date(),
    edd: new Date(),
    gravida: '',
    para: '',
    livingChildren: '',
    bloodPressure: '',
    hemoglobin: '',
    bloodGroup: '',
    hivStatus: '',
    riskFactors: [],
    previousComplications: '',
    currentMedications: '',
    allergies: '',
    facility: '',
    location: '',
    healthWorker: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateField, setDateField] = useState('');
  const [records, setRecords] = useState([]);
  const [highRiskCases, setHighRiskCases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getCurrentLocation();
    loadRecords();
    loadHighRiskCases();
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

  const loadRecords = async () => {
    try {
      const result = await MaternalAPI.getRecords();
      if (result.success) {
        setRecords(result.data);
      }
    } catch (error) {
      console.error('Error loading records:', error);
    }
  };

  const loadHighRiskCases = async () => {
    try {
      const result = await MaternalAPI.getHighRiskPregnancies(formData.location);
      if (result.success) {
        setHighRiskCases(result.data);
      }
    } catch (error) {
      console.error('Error loading high-risk cases:', error);
    }
  };

  const calculateEDD = (lmpDate) => {
    const lmp = new Date(lmpDate);
    const edd = new Date(lmp);
    edd.setDate(edd.getDate() + 280); // 40 weeks
    return edd;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate EDD when LMP changes
      if (field === 'lmp') {
        updated.edd = calculateEDD(value);
      }
      
      return updated;
    });
    
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

  const toggleRiskFactor = (factor) => {
    setFormData(prev => {
      const factors = prev.riskFactors.includes(factor)
        ? prev.riskFactors.filter(f => f !== factor)
        : [...prev.riskFactors, factor];
      return { ...prev, riskFactors: factors };
    });
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateGestationalAge = (lmpDate) => {
    const lmp = new Date(lmpDate);
    const today = new Date();
    const diffTime = Math.abs(today - lmp);
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    const diffDays = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 7)) / (1000 * 60 * 60 * 24));
    
    return `${diffWeeks} weeks, ${diffDays} days`;
  };

  const handleSubmit = async () => {
    const validationErrors = validateMaternalHealth(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert('Validation Error', 'Please fix the errors before submitting.');
      return;
    }

    setLoading(true);
    try {
      const result = await MaternalAPI.registerPregnancy(formData);
      
      if (result.success) {
        Alert.alert(
          'Success',
          result.synced
            ? 'Pregnancy registered successfully.'
            : 'Record saved offline. Will sync when connected.',
          [
            {
              text: 'View Records',
              onPress: () => setActiveTab('records'),
            },
            {
              text: 'Add Another',
              onPress: clearForm,
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to register pregnancy');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      patientName: '',
      age: '',
      lmp: new Date(),
      edd: new Date(),
      gravida: '',
      para: '',
      livingChildren: '',
      bloodPressure: '',
      hemoglobin: '',
      bloodGroup: '',
      hivStatus: '',
      riskFactors: [],
      previousComplications: '',
      currentMedications: '',
      allergies: '',
      facility: '',
      location: '',
      healthWorker: '',
    });
    setErrors({});
  };

  const handleRecordANC = (recordId) => {
    navigation.navigate('ANCVisit', { pregnancyId: recordId });
  };

  const handleReferPatient = (recordId) => {
    navigation.navigate('Referral', { patientId: recordId, type: 'maternal' });
  };

  const riskFactorsList = [
    'Previous C-section',
    'Multiple pregnancy',
    'Age < 18 or > 35',
    'Hypertension',
    'Diabetes',
    'Anemia',
    'Previous preterm birth',
    'Previous stillbirth',
    'Malpresentation',
    'APH',
    'PIH',
    'Other',
  ];

  // Render Registration Form
  const renderRegistrationForm = () => (
    <ScrollView style={styles.form}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Patient Name *</Text>
          <TextInput
            style={[styles.input, errors.patientName && styles.inputError]}
            value={formData.patientName}
            onChangeText={(text) => handleInputChange('patientName', text)}
            placeholder="Enter patient's full name"
          />
          {errors.patientName && <Text style={styles.errorText}>{errors.patientName}</Text>}
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={formData.age}
              onChangeText={(text) => handleInputChange('age', text)}
              placeholder="Age"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Blood Group</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.bloodGroup}
                onValueChange={(value) => handleInputChange('bloodGroup', value)}
                style={styles.picker}
              >
                <Picker.Item label="Select" value="" />
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <Picker.Item key={bg} label={bg} value={bg} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pregnancy Details</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Last Menstrual Period (LMP) *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => showDatePickerFor('lmp')}
          >
            <Icon name="calendar-today" size={20} color="#666" />
            <Text style={styles.dateText}>{formatDate(formData.lmp)}</Text>
          </TouchableOpacity>
          {errors.lmp && <Text style={styles.errorText}>{errors.lmp}</Text>}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Expected Delivery Date (EDD)</Text>
          <TouchableOpacity style={styles.dateButton} disabled>
            <Icon name="event" size={20} color="#666" />
            <Text style={styles.dateText}>{formatDate(formData.edd)}</Text>
          </TouchableOpacity>
          {formData.lmp && (
            <Text style={styles.gestationalAge}>
              Gestational Age: {calculateGestationalAge(formData.lmp)}
            </Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Gravida</Text>
            <TextInput
              style={styles.input}
              value={formData.gravida}
              onChangeText={(text) => handleInputChange('gravida', text)}
              placeholder="G"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Para</Text>
            <TextInput
              style={styles.input}
              value={formData.para}
              onChangeText={(text) => handleInputChange('para', text)}
              placeholder="P"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Living</Text>
            <TextInput
              style={styles.input}
              value={formData.livingChildren}
              onChangeText={(text) => handleInputChange('livingChildren', text)}
              placeholder="L"
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clinical Information</Text>
        
        <View style={styles.row}>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Blood Pressure</Text>
            <TextInput
              style={[styles.input, errors.bloodPressure && styles.inputError]}
              value={formData.bloodPressure}
              onChangeText={(text) => handleInputChange('bloodPressure', text)}
              placeholder="120/80"
            />
            {errors.bloodPressure && <Text style={styles.errorText}>{errors.bloodPressure}</Text>}
          </View>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Hemoglobin (g/dL)</Text>
            <TextInput
              style={[styles.input, errors.hemoglobin && styles.inputError]}
              value={formData.hemoglobin}
              onChangeText={(text) => handleInputChange('hemoglobin', text)}
              placeholder="12.0"
              keyboardType="decimal-pad"
            />
            {errors.hemoglobin && <Text style={styles.errorText}>{errors.hemoglobin}</Text>}
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>HIV Status</Text>
          <View style={styles.radioGroup}>
            {['Positive', 'Negative', 'Unknown'].map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.radioButton,
                  formData.hivStatus === status && styles.radioSelected,
                ]}
                onPress={() => handleInputChange('hivStatus', status)}
              >
                <Text style={[
                  styles.radioText,
                  formData.hivStatus === status && styles.radioTextSelected,
                ]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Risk Factors</Text>
        <Text style={styles.label}>Select all that apply:</Text>
        <View style={styles.riskFactorsGrid}>
          {riskFactorsList.map(factor => (
            <TouchableOpacity
              key={factor}
              style={[
                styles.riskFactorChip,
                formData.riskFactors.includes(factor) && styles.riskFactorSelected,
              ]}
              onPress={() => toggleRiskFactor(factor)}
            >
              <Text style={[
                styles.riskFactorText,
                formData.riskFactors.includes(factor) && styles.riskFactorTextSelected,
              ]}>
                {factor}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Previous Complications</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.previousComplications}
            onChangeText={(text) => handleInputChange('previousComplications', text)}
            placeholder="Describe any previous complications..."
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Current Medications</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.currentMedications}
            onChangeText={(text) => handleInputChange('currentMedications', text)}
            placeholder="List current medications..."
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Allergies</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.allergies}
            onChangeText={(text) => handleInputChange('allergies', text)}
            placeholder="List any allergies..."
            multiline
            numberOfLines={2}
          />
        </View>
      </View>

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
            <Text style={styles.submitText}>Register Pregnancy</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // Render Records List
  const renderRecords = () => (
    <View style={styles.recordsContainer}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={records.filter(r => 
          r.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.id?.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.recordCard}
            onPress={() => navigation.navigate('PregnancyDetails', { id: item.id })}
          >
            <View style={styles.recordHeader}>
              <View>
                <Text style={styles.recordName}>{item.patientName}</Text>
                <Text style={styles.recordId}>ID: {item.id}</Text>
              </View>
              <View style={[
                styles.riskBadge,
                { backgroundColor: item.riskLevel === 'high' ? '#f44336' : '#4CAF50' }
              ]}>
                <Text style={styles.riskBadgeText}>
                  {item.riskLevel === 'high' ? 'High Risk' : 'Normal'}
                </Text>
              </View>
            </View>
            
            <View style={styles.recordDetails}>
              <View style={styles.detailItem}>
                <Icon name="event" size={16} color="#666" />
                <Text style={styles.detailText}>LMP: {formatDate(item.lmp)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Icon name="baby-changing-station" size={16} color="#666" />
                <Text style={styles.detailText}>EDD: {formatDate(item.edd)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Icon name="local-hospital" size={16} color="#666" />
                <Text style={styles.detailText}>ANC Visits: {item.ancVisits || 0}</Text>
              </View>
            </View>

            <View style={styles.recordActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleRecordANC(item.id)}
              >
                <Icon name="add-circle" size={16} color="#fff" />
                <Text style={styles.actionText}>Record ANC</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.referButton]}
                onPress={() => handleReferPatient(item.id)}
              >
                <Icon name="forward" size={16} color="#fff" />
                <Text style={styles.actionText}>Refer</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No records found</Text>
          </View>
        }
      />
    </View>
  );

  // Render High Risk Cases
  const renderHighRiskCases = () => (
    <View style={styles.highRiskContainer}>
      <View style={styles.highRiskHeader}>
        <Icon name="warning" size={24} color="#f44336" />
        <Text style={styles.highRiskTitle}>High Risk Pregnancies</Text>
        <Text style={styles.highRiskCount}>{highRiskCases.length} cases</Text>
      </View>

      <FlatList
        data={highRiskCases}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.highRiskCard}>
            <View style={styles.highRiskCardHeader}>
              <Text style={styles.highRiskName}>{item.patientName}</Text>
              <View style={styles.emergencyBadge}>
                <Text style={styles.emergencyText}>
                  {item.emergency ? 'EMERGENCY' : 'HIGH RISK'}
                </Text>
              </View>
            </View>
            
            <View style={styles.riskDetails}>
              {item.riskFactors?.map((factor, index) => (
                <View key={index} style={styles.riskFactorTag}>
                  <Icon name="error" size={12} color="#f44336" />
                  <Text style={styles.riskFactorTagText}>{factor}</Text>
                </View>
              ))}
            </View>

            <View style={styles.riskActions}>
              <TouchableOpacity style={styles.emergencyButton}>
                <Icon name="phone" size={16} color="#fff" />
                <Text style={styles.emergencyButtonText}>Call Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.referEmergencyButton}>
                <Icon name="ambulance" size={16} color="#fff" />
                <Text style={styles.emergencyButtonText}>Emergency Referral</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="pregnant-woman" size={30} color="#fff" />
        <Text style={styles.headerTitle}>Maternal Health</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'register' && styles.activeTab]}
          onPress={() => setActiveTab('register')}
        >
          <Text style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>
            Register
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'records' && styles.activeTab]}
          onPress={() => setActiveTab('records')}
        >
          <Text style={[styles.tabText, activeTab === 'records' && styles.activeTabText]}>
            Records
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'high-risk' && styles.activeTab]}
          onPress={() => setActiveTab('high-risk')}
        >
          <View style={styles.tabWithBadge}>
            <Text style={[styles.tabText, activeTab === 'high-risk' && styles.activeTabText]}>
              High Risk
            </Text>
            {highRiskCases.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{highRiskCases.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'register' && renderRegistrationForm()}
      {activeTab === 'records' && renderRecords()}
      {activeTab === 'high-risk' && renderHighRiskCases()}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={formData[dateField]}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
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
    backgroundColor: '#E91E63',
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#E91E63',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#E91E63',
    fontWeight: 'bold',
  },
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBadge: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  form: {
    flex: 1,
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
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
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
  gestationalAge: {
    fontSize: 14,
    color: '#E91E63',
    marginTop: 5,
    fontWeight: '600',
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
  radioGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  radioButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  radioSelected: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
  },
  radioTextSelected: {
    color: '#fff',
  },
  riskFactorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  riskFactorChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  riskFactorSelected: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
  },
  riskFactorText: {
    fontSize: 13,
    color: '#666',
  },
  riskFactorTextSelected: {
    color: '#fff',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E63',
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
  recordsContainer: {
    flex: 1,
    padding: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    fontSize: 16,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  recordId: {
    fontSize: 12,
    color: '#999',
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  riskBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recordDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  recordActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E63',
    padding: 10,
    borderRadius: 8,
    gap: 5,
  },
  referButton: {
    backgroundColor: '#FF9800',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  highRiskContainer: {
    flex: 1,
    padding: 15,
  },
  highRiskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  highRiskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f44336',
    marginLeft: 10,
  },
  highRiskCount: {
    fontSize: 14,
    color: '#666',
  },
  highRiskCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    elevation: 2,
  },
  highRiskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  highRiskName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emergencyBadge: {
    backgroundColor: '#f44336',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  emergencyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  riskDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  riskFactorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  riskFactorTagText: {
    fontSize: 11,
    color: '#f44336',
  },
  riskActions: {
    flexDirection: 'row',
    gap: 10,
  },
  emergencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 8,
    gap: 5,
  },
  referEmergencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    padding: 10,
    borderRadius: 8,
    gap: 5,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default MaternalHealthScreen;