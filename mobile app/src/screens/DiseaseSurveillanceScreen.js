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
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DiseaseAPI } from '../api/diseases';
import { LocationService } from '../services/LocationService';
import { validateDiseaseReport } from '../utils/validators';
import { NOTIFIABLE_DISEASES } from '../utils/constants';

const DiseaseSurveillanceScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('report'); // report, history, hotspots
  const [formData, setFormData] = useState({
    diseaseType: '',
    patientName: '',
    age: '',
    gender: '',
    dateOfOnset: new Date(),
    dateReported: new Date(),
    symptoms: '',
    diagnosis: '',
    cases: '1',
    deaths: '0',
    location: '',
    facility: '',
    reportedBy: '',
    severity: 'moderate',
    status: 'suspected',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateField, setDateField] = useState('');
  const [diseaseHistory, setDiseaseHistory] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const symptomsList = [
    'Fever', 'Cough', 'Headache', 'Diarrhea', 'Vomiting',
    'Rash', 'Fatigue', 'Muscle Pain', 'Joint Pain',
    'Shortness of Breath', 'Loss of Taste/Smell', 'Sore Throat',
    'Abdominal Pain', 'Bleeding', 'Jaundice', 'Convulsions',
  ];

  useEffect(() => {
    getCurrentLocation();
    loadDiseaseHistory();
    loadHotspots();
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
        location: geocode?.address || `${location.latitude}, ${location.longitude}`,
        facility: geocode?.address || '',
      }));
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const loadDiseaseHistory = async () => {
    try {
      const result = await DiseaseAPI.getDiseaseHistory();
      if (result.success) {
        setDiseaseHistory(result.data);
      }
    } catch (error) {
      console.error('Error loading disease history:', error);
    }
  };

  const loadHotspots = async () => {
    try {
      const result = await DiseaseAPI.getHotspots();
      if (result.success) {
        setHotspots(result.data);
      }
    } catch (error) {
      console.error('Error loading hotspots:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const toggleSymptom = (symptom) => {
    setFormData(prev => {
      const symptoms = prev.symptoms ? prev.symptoms.split(', ') : [];
      const newSymptoms = symptoms.includes(symptom)
        ? symptoms.filter(s => s !== symptom)
        : [...symptoms, symptom];
      return { ...prev, symptoms: newSymptoms.join(', ') };
    });
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
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSubmit = async () => {
    const validationErrors = validateDiseaseReport(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert('Validation Error', 'Please fix the errors before submitting.');
      return;
    }

    // Check if disease is notifiable
    if (NOTIFIABLE_DISEASES.includes(formData.diseaseType)) {
      Alert.alert(
        'Notifiable Disease',
        `${formData.diseaseType} is a notifiable disease. This will trigger an immediate alert to health authorities.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit Report', onPress: submitReport },
        ]
      );
    } else {
      submitReport();
    }
  };

  const submitReport = async () => {
    setLoading(true);
    try {
      const result = await DiseaseAPI.reportDisease(formData);
      
      if (result.success) {
        if (result.alertTriggered) {
          Alert.alert(
            'Alert Triggered',
            'Health authorities have been notified about this case.',
            [{ text: 'OK' }]
          );
        }
        
        Alert.alert(
          'Success',
          'Disease report submitted successfully.',
          [
            {
              text: 'View History',
              onPress: () => setActiveTab('history'),
            },
            {
              text: 'Add Another',
              onPress: clearForm,
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit report');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      diseaseType: '',
      patientName: '',
      age: '',
      gender: '',
      dateOfOnset: new Date(),
      dateReported: new Date(),
      symptoms: '',
      diagnosis: '',
      cases: '1',
      deaths: '0',
      location: '',
      facility: '',
      reportedBy: '',
      severity: 'moderate',
      status: 'suspected',
    });
    setErrors({});
  };

  // Render Disease Report Form
  const renderReportForm = () => (
    <ScrollView style={styles.form}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Disease Information</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Disease Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.diseaseType}
              onValueChange={(value) => handleInputChange('diseaseType', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select disease..." value="" />
              {NOTIFIABLE_DISEASES.map(disease => (
                <Picker.Item key={disease} label={disease} value={disease} />
              ))}
            </Picker>
          </View>
          {errors.diseaseType && <Text style={styles.errorText}>{errors.diseaseType}</Text>}
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Number of Cases *</Text>
            <TextInput
              style={[styles.input, errors.cases && styles.inputError]}
              value={formData.cases}
              onChangeText={(text) => handleInputChange('cases', text)}
              keyboardType="numeric"
              placeholder="1"
            />
          </View>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Deaths</Text>
            <TextInput
              style={styles.input}
              value={formData.deaths}
              onChangeText={(text) => handleInputChange('deaths', text)}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Severity</Text>
          <View style={styles.severityButtons}>
            {['mild', 'moderate', 'severe', 'critical'].map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.severityButton,
                  formData.severity === level && styles[`severity${level.charAt(0).toUpperCase() + level.slice(1)}`],
                ]}
                onPress={() => handleInputChange('severity', level)}
              >
                <Text style={[
                  styles.severityText,
                  formData.severity === level && styles.severityTextSelected,
                ]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              style={styles.picker}
            >
              <Picker.Item label="Suspected" value="suspected" />
              <Picker.Item label="Probable" value="probable" />
              <Picker.Item label="Confirmed" value="confirmed" />
              <Picker.Item label="Discarded" value="discarded" />
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Patient Name *</Text>
          <TextInput
            style={[styles.input, errors.patientName && styles.inputError]}
            value={formData.patientName}
            onChangeText={(text) => handleInputChange('patientName', text)}
            placeholder="Enter patient name"
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
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.gender}
                onValueChange={(value) => handleInputChange('gender', value)}
                style={styles.picker}
              >
                <Picker.Item label="Select" value="" />
                <Picker.Item label="Male" value="Male" />
                <Picker.Item label="Female" value="Female" />
                <Picker.Item label="Other" value="Other" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Date of Onset *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => showDatePickerFor('dateOfOnset')}
          >
            <Icon name="calendar-today" size={20} color="#666" />
            <Text style={styles.dateText}>{formatDate(formData.dateOfOnset)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clinical Details</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Symptoms</Text>
          <Text style={styles.sublabel}>Select all that apply:</Text>
          <View style={styles.symptomsGrid}>
            {symptomsList.map(symptom => (
              <TouchableOpacity
                key={symptom}
                style={[
                  styles.symptomChip,
                  formData.symptoms?.includes(symptom) && styles.symptomSelected,
                ]}
                onPress={() => toggleSymptom(symptom)}
              >
                <Text style={[
                  styles.symptomText,
                  formData.symptoms?.includes(symptom) && styles.symptomTextSelected,
                ]}>
                  {symptom}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Diagnosis</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.diagnosis}
            onChangeText={(text) => handleInputChange('diagnosis', text)}
            placeholder="Enter diagnosis details..."
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reporter Information</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Reported By *</Text>
          <TextInput
            style={[styles.input, errors.reportedBy && styles.inputError]}
            value={formData.reportedBy}
            onChangeText={(text) => handleInputChange('reportedBy', text)}
            placeholder="Your name"
          />
          {errors.reportedBy && <Text style={styles.errorText}>{errors.reportedBy}</Text>}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Facility</Text>
          <TextInput
            style={styles.input}
            value={formData.facility}
            onChangeText={(text) => handleInputChange('facility', text)}
            placeholder="Facility name"
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
            <Icon name="send" size={20} color="#fff" />
            <Text style={styles.submitText}>Submit Report</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // Render Disease History
  const renderDiseaseHistory = () => (
    <View style={styles.historyContainer}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by disease or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={diseaseHistory.filter(r =>
          r.diseaseType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.location?.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.diseaseCard, styles[`severity${item.severity?.charAt(0).toUpperCase() + item.severity?.slice(1)}`]]}>
            <View style={styles.diseaseCardHeader}>
              <View>
                <Text style={styles.diseaseName}>{item.diseaseType}</Text>
                <Text style={styles.diseaseLocation}>
                  <Icon name="location-on" size={12} color="#666" />
                  {item.location}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: item.status === 'confirmed' ? '#f44336' : '#FF9800' }
              ]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            
            <View style={styles.diseaseStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.cases}</Text>
                <Text style={styles.statLabel}>Cases</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.deaths || 0}</Text>
                <Text style={styles.statLabel}>Deaths</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDate(item.dateReported)}</Text>
                <Text style={styles.statLabel}>Date</Text>
              </View>
            </View>
            
            {item.symptoms && (
              <View style={styles.symptomsContainer}>
                {item.symptoms.split(', ').map((symptom, index) => (
                  <View key={index} style={styles.symptomTag}>
                    <Text style={styles.symptomTagText}>{symptom}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="history" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No disease reports found</Text>
          </View>
        }
      />
    </View>
  );

  // Render Hotspots
  const renderHotspots = () => (
    <View style={styles.hotspotsContainer}>
      {hotspots.map((hotspot, index) => (
        <View key={index} style={styles.hotspotCard}>
          <View style={styles.hotspotHeader}>
            <Icon name="warning" size={24} color="#f44336" />
            <View style={styles.hotspotInfo}>
              <Text style={styles.hotspotLocation}>{hotspot.location}</Text>
              <Text style={styles.hotspotDisease}>{hotspot.disease}</Text>
            </View>
            <View style={[
              styles.hotspotBadge,
              { backgroundColor: hotspot.riskLevel === 'critical' ? '#f44336' : '#FF9800' }
            ]}>
              <Text style={styles.hotspotBadgeText}>{hotspot.riskLevel}</Text>
            </View>
          </View>
          
          <View style={styles.hotspotStats}>
            <View style={styles.hotspotStat}>
              <Icon name="people" size={16} color="#666" />
              <Text style={styles.hotspotStatText}>{hotspot.cases} cases</Text>
            </View>
            <View style={styles.hotspotStat}>
              <Icon name="trending-up" size={16} color="#f44336" />
              <Text style={styles.hotspotStatText}>{hotspot.trend}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="coronavirus" size={30} color="#fff" />
        <Text style={styles.headerTitle}>Disease Surveillance</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabs}>
        {['report', 'history', 'hotspots'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Icon
              name={tab === 'report' ? 'add-circle' : tab === 'history' ? 'history' : 'place'}
              size={20}
              color={activeTab === tab ? '#FF9800' : '#666'}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'report' && renderReportForm()}
      {activeTab === 'history' && renderDiseaseHistory()}
      {activeTab === 'hotspots' && renderHotspots()}

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
    backgroundColor: '#FF9800',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 5,
  },
  activeTab: {
    borderBottomColor: '#FF9800',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#FF9800',
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
  sublabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
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
  severityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  severityMild: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  severityModerate: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
  severitySevere: { backgroundColor: '#f44336', borderColor: '#f44336' },
  severityCritical: { backgroundColor: '#d32f2f', borderColor: '#d32f2f' },
  severityText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  severityTextSelected: {
    color: '#fff',
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  symptomSelected: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  symptomText: {
    fontSize: 13,
    color: '#666',
  },
  symptomTextSelected: {
    color: '#fff',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
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
  historyContainer: {
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
  diseaseCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  diseaseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  diseaseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  diseaseLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  diseaseStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 3,
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 10,
  },
  symptomTag: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  symptomTagText: {
    fontSize: 11,
    color: '#FF9800',
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
  hotspotsContainer: {
    padding: 15,
  },
  hotspotCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  hotspotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hotspotInfo: {
    flex: 1,
  },
  hotspotLocation: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  hotspotDisease: {
    fontSize: 14,
    color: '#f44336',
  },
  hotspotBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  hotspotBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  hotspotStats: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  hotspotStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hotspotStatText: {
    fontSize: 14,
    color: '#666',
  },
});

export default DiseaseSurveillanceScreen;