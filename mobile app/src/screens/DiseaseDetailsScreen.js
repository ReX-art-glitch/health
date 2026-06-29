import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DiseaseAPI } from '../api/diseases';
import { formatDate, formatNumber } from '../utils/formatters';
import { NOTIFIABLE_DISEASES, SEVERITY_LEVELS, COLORS } from '../utils/constants';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const DiseaseDetailsScreen = ({ route, navigation }) => {
  const { diseaseId, diseaseType } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [diseaseData, setDiseaseData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [relatedCases, setRelatedCases] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: '',
    outcome: '',
    notes: '',
    resolutionDate: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadDiseaseDetails();
  }, [diseaseId]);

  const loadDiseaseDetails = async () => {
    try {
      setLoading(true);
      
      const result = await DiseaseAPI.getDiseaseHistory({ id: diseaseId, type: diseaseType });
      
      if (result.success) {
        setDiseaseData(result.data?.details || result.data);
        setTimeline(result.data?.timeline || []);
        setRelatedCases(result.data?.relatedCases || []);
      } else {
        Alert.alert('Error', 'Failed to load disease details');
      }
    } catch (error) {
      console.error('Error loading disease details:', error);
      Alert.alert('Error', 'An error occurred while loading details');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setUpdateData(prev => ({ ...prev, resolutionDate: selectedDate }));
    }
  };

  const handleUpdateCase = async () => {
    try {
      // API call to update case
      Alert.alert('Success', 'Case updated successfully', [
        { text: 'OK', onPress: () => {
          setShowUpdateModal(false);
          loadDiseaseDetails();
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const getSeverityColor = (severity) => {
    const level = SEVERITY_LEVELS.find(s => s.value === severity);
    return level?.color || COLORS.gray;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#f44336';
      case 'probable': return '#FF9800';
      case 'suspected': return '#FFC107';
      case 'recovered': return '#4CAF50';
      case 'deceased': return '#000000';
      default: return '#9E9E9E';
    }
  };

  // Chart data for trend
  const trendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [5, 8, 12, 7, 10, 15],
        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Chart data for age distribution
  const ageData = {
    labels: ['0-5', '6-12', '13-18', '19-40', '41-60', '60+'],
    datasets: [
      {
        data: [10, 15, 8, 20, 12, 5],
      },
    ],
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.disease} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Disease Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <Text style={styles.diseaseName}>{diseaseData?.diseaseType || diseaseType}</Text>
            <Text style={styles.diseaseLocation}>
              <Icon name="location-on" size={14} color="#666" />
              {diseaseData?.location || 'Unknown Location'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(diseaseData?.status) }]}>
            <Text style={styles.statusText}>{diseaseData?.status || 'Unknown'}</Text>
          </View>
        </View>
        
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNumber}>{diseaseData?.cases || 0}</Text>
            <Text style={styles.headerStatLabel}>Cases</Text>
          </View>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNumber}>{diseaseData?.deaths || 0}</Text>
            <Text style={styles.headerStatLabel}>Deaths</Text>
          </View>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNumber}>
              {diseaseData?.mortalityRate ? `${diseaseData.mortalityRate}%` : '0%'}
            </Text>
            <Text style={styles.headerStatLabel}>CFR</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      {diseaseData?.status === 'suspected' && (
        <View style={styles.actionsCard}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}>
            <Icon name="verified" size={20} color="#fff" />
            <Text style={styles.actionText}>Confirm Case</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#f44336' }]}>
            <Icon name="cancel" size={20} color="#fff" />
            <Text style={styles.actionText}>Discard Case</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Patient Information */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        
        <InfoRow icon="person" label="Name" value={diseaseData?.patientName} />
        <InfoRow icon="calendar-today" label="Age" value={diseaseData?.age} />
        <InfoRow icon="people" label="Gender" value={diseaseData?.gender} />
        <InfoRow icon="event" label="Date of Onset" value={formatDate(diseaseData?.dateOfOnset)} />
        <InfoRow icon="event-note" label="Date Reported" value={formatDate(diseaseData?.dateReported)} />
      </View>

      {/* Clinical Information */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Clinical Information</Text>
        
        <View style={styles.sectionSubtitle}>Symptoms</View>
        {diseaseData?.symptoms ? (
          <View style={styles.symptomsGrid}>
            {diseaseData.symptoms.split(', ').map((symptom, index) => (
              <View key={index} style={styles.symptomChip}>
                <Text style={styles.symptomText}>{symptom}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>No symptoms recorded</Text>
        )}

        <View style={styles.sectionSubtitle}>Diagnosis</View>
        <Text style={styles.valueText}>{diseaseData?.diagnosis || 'Not specified'}</Text>

        <View style={styles.sectionSubtitle}>Severity</View>
        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(diseaseData?.severity) }]}>
          <Text style={styles.severityText}>
            {(diseaseData?.severity || 'unknown').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Treatment Information */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Treatment</Text>
        
        <InfoRow icon="medication" label="Treatment" value={diseaseData?.treatment || 'Not specified'} />
        <InfoRow icon="local-hospital" label="Facility" value={diseaseData?.facility || 'Not specified'} />
        <InfoRow icon="person" label="Reported By" value={diseaseData?.reportedBy || 'Unknown'} />
      </View>

      {/* Trend Chart */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Case Trend</Text>
        <LineChart
          data={trendData}
          width={screenWidth - 60}
          height={200}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Age Distribution Chart */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Age Distribution</Text>
        <BarChart
          data={ageData}
          width={screenWidth - 60}
          height={200}
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
            barPercentage: 0.6,
          }}
          style={styles.chart}
        />
      </View>

      {/* Timeline */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        {timeline.length > 0 ? (
          timeline.map((event, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              {index < timeline.length - 1 && <View style={styles.timelineLine} />}
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDate}>{formatDate(event.date)}</Text>
                <Text style={styles.timelineEvent}>{event.description}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No timeline events</Text>
        )}
      </View>

      {/* Update Button */}
      <TouchableOpacity
        style={styles.updateButton}
        onPress={() => setShowUpdateModal(true)}
      >
        <Icon name="edit" size={20} color="#fff" />
        <Text style={styles.updateButtonText}>Update Case Status</Text>
      </TouchableOpacity>

      {/* Update Modal */}
      <Modal
        visible={showUpdateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Case</Text>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={updateData.status}
                    onValueChange={(value) => setUpdateData(prev => ({ ...prev, status: value }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select status..." value="" />
                    <Picker.Item label="Suspected" value="suspected" />
                    <Picker.Item label="Probable" value="probable" />
                    <Picker.Item label="Confirmed" value="confirmed" />
                    <Picker.Item label="Discarded" value="discarded" />
                  </Picker>
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Outcome</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={updateData.outcome}
                    onValueChange={(value) => setUpdateData(prev => ({ ...prev, outcome: value }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select outcome..." value="" />
                    <Picker.Item label="Recovered" value="recovered" />
                    <Picker.Item label="Deceased" value="deceased" />
                    <Picker.Item label="Ongoing" value="ongoing" />
                    <Picker.Item label="Unknown" value="unknown" />
                  </Picker>
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Resolution Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar-today" size={20} color="#666" />
                  <Text style={styles.dateText}>
                    {formatDate(updateData.resolutionDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={updateData.notes}
                  onChangeText={(text) => setUpdateData(prev => ({ ...prev, notes: text }))}
                  placeholder="Additional notes..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowUpdateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateCase}
              >
                <Text style={styles.saveButtonText}>Update Case</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={updateData.resolutionDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </Modal>
    </ScrollView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Icon name={icon} size={16} color="#666" style={styles.infoIcon} />
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value || 'N/A'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  headerInfo: { flex: 1 },
  diseaseName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  diseaseLocation: { fontSize: 13, color: '#666', marginTop: 5 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  headerStat: { alignItems: 'center' },
  headerStatNumber: { fontSize: 20, fontWeight: 'bold', color: '#f44336' },
  headerStatLabel: { fontSize: 11, color: '#999', marginTop: 3 },
  actionsCard: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoIcon: { width: 24 },
  infoLabel: { fontSize: 13, color: '#666', width: 80 },
  infoValue: { fontSize: 13, color: '#333', flex: 1 },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  symptomChip: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  symptomText: { fontSize: 12, color: '#E65100' },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  severityText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  valueText: { fontSize: 14, color: '#333', marginBottom: 8 },
  noDataText: { fontSize: 13, color: '#999', fontStyle: 'italic' },
  chart: { borderRadius: 10, marginTop: 10 },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF9800',
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 16,
    width: 2,
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  timelineContent: {
    marginLeft: 15,
    flex: 1,
  },
  timelineDate: { fontSize: 12, color: '#999' },
  timelineEvent: { fontSize: 14, color: '#333', marginTop: 2 },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    gap: 8,
  },
  updateButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalBody: { padding: 20 },
  fieldContainer: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  pickerContainer: { backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' },
  picker: { height: 50 },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  dateText: { marginLeft: 10, fontSize: 16, color: '#333' },
  modalFooter: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#eee', gap: 10 },
  cancelButton: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center' },
  cancelButtonText: { fontSize: 16, color: '#666', fontWeight: '600' },
  saveButton: { flex: 2, padding: 14, borderRadius: 8, backgroundColor: '#FF9800', alignItems: 'center' },
  saveButtonText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});

export default DiseaseDetailsScreen;