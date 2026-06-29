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
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ImmunizationAPI } from '../api/immunization';
import { formatDate, formatNumber } from '../utils/formatters';
import { VACCINATION_SCHEDULE, COLORS } from '../utils/constants';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const VaccinationDetailsScreen = ({ route, navigation }) => {
  const { childId, childName } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [childData, setChildData] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [upcomingVaccines, setUpcomingVaccines] = useState([]);
  const [missedVaccines, setMissedVaccines] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    missed: 0,
    upcoming: 0,
    coverageRate: 0,
  });
  const [activeTab, setActiveTab] = useState('all'); // all, completed, missed, upcoming
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVaccination, setNewVaccination] = useState({
    vaccineType: '',
    doseNumber: '',
    batchNumber: '',
    dateAdministered: new Date(),
    administeredBy: '',
    facility: '',
    notes: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadVaccinationDetails();
  }, [childId]);

  const loadVaccinationDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch child records
      const result = await ImmunizationAPI.getChildRecords(childId);
      
      if (result.success) {
        const records = result.data || [];
        setVaccinations(records);
        setChildData(result.data.child || { name: childName });
        
        // Calculate statistics
        calculateStats(records);
        
        // Determine upcoming and missed vaccines
        determineVaccineStatus(records);
      } else {
        Alert.alert('Error', 'Failed to load vaccination records');
      }
    } catch (error) {
      console.error('Error loading vaccination details:', error);
      Alert.alert('Error', 'An error occurred while loading records');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records) => {
    const completed = records.filter(r => r.status === 'administered').length;
    const missed = records.filter(r => r.status === 'missed').length;
    const upcoming = records.filter(r => r.status === 'upcoming').length;
    const total = completed + missed + upcoming;
    
    setStats({
      total,
      completed,
      missed,
      upcoming,
      coverageRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
    });
  };

  const determineVaccineStatus = (records) => {
    const administeredVaccines = records
      .filter(r => r.status === 'administered')
      .map(r => r.vaccineType);
    
    const upcomingList = [];
    const missedList = [];
    const today = new Date();
    
    // Check against vaccination schedule
    Object.entries(VACCINATION_SCHEDULE).forEach(([period, schedule]) => {
      schedule.vaccines.forEach(vaccine => {
        // If not administered
        if (!administeredVaccines.some(v => v.includes(vaccine) || vaccine.includes(v))) {
          const ageWeeks = calculateAgeInWeeks(childData?.dateOfBirth);
          const { min, max } = schedule.ageRange;
          
          if (ageWeeks > max + 8) {
            // Missed - more than 8 weeks past due
            missedList.push({
              vaccine,
              period: schedule.description,
              dueAge: `${min}-${max} weeks`,
              status: 'missed',
              priority: 'high',
            });
          } else if (ageWeeks >= min - 2) {
            // Upcoming - within 2 weeks of minimum age
            upcomingList.push({
              vaccine,
              period: schedule.description,
              dueAge: `${min}-${max} weeks`,
              status: ageWeeks >= min ? 'due_now' : 'upcoming',
              priority: ageWeeks >= min ? 'high' : 'normal',
            });
          }
        }
      });
    });
    
    setUpcomingVaccines(upcomingList);
    setMissedVaccines(missedList);
  };

  const calculateAgeInWeeks = (birthDate) => {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const today = new Date();
    const diffTime = Math.abs(today - birth);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  };

  const handleAddVaccination = () => {
    setNewVaccination({
      vaccineType: '',
      doseNumber: '',
      batchNumber: '',
      dateAdministered: new Date(),
      administeredBy: '',
      facility: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleSaveVaccination = async () => {
    if (!newVaccination.vaccineType || !newVaccination.batchNumber) {
      Alert.alert('Error', 'Vaccine type and batch number are required');
      return;
    }

    try {
      const result = await ImmunizationAPI.submitRecord({
        childId: childId,
        childName: childData?.name || childName,
        vaccineType: newVaccination.vaccineType,
        doseNumber: newVaccination.doseNumber,
        batchNumber: newVaccination.batchNumber,
        dateAdministered: newVaccination.dateAdministered,
        administeredBy: newVaccination.administeredBy,
        facility: newVaccination.facility,
        notes: newVaccination.notes,
        dateOfBirth: childData?.dateOfBirth,
      });

      if (result.success) {
        setShowAddModal(false);
        Alert.alert('Success', 'Vaccination record added', [
          { text: 'OK', onPress: () => loadVaccinationDetails() }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to save record');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNewVaccination(prev => ({ ...prev, dateAdministered: selectedDate }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'administered': return COLORS.success;
      case 'missed': return COLORS.error;
      case 'due_now': return COLORS.warning;
      case 'upcoming': return COLORS.info;
      default: return COLORS.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'administered': return 'check-circle';
      case 'missed': return 'cancel';
      case 'due_now': return 'warning';
      case 'upcoming': return 'schedule';
      default: return 'help-outline';
    }
  };

  const getFilteredRecords = () => {
    switch (activeTab) {
      case 'completed':
        return vaccinations.filter(v => v.status === 'administered');
      case 'missed':
        return [...missedVaccines, ...vaccinations.filter(v => v.status === 'missed')];
      case 'upcoming':
        return [...upcomingVaccines, ...vaccinations.filter(v => v.status === 'upcoming')];
      default:
        return vaccinations;
    }
  };

  // Chart data for coverage
  const chartData = {
    labels: ['0', '6w', '10w', '14w', '9m', '15m', '18m', '5y'],
    datasets: [
      {
        data: [100, 90, 85, 80, 75, 70, 65, 60],
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading records...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Child Info Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerInfo}>
          <Text style={styles.childName}>{childData?.name || childName || 'Unknown'}</Text>
          {childData?.dateOfBirth && (
            <Text style={styles.childDetail}>
              DOB: {formatDate(childData.dateOfBirth)}
            </Text>
          )}
          {childData?.motherName && (
            <Text style={styles.childDetail}>
              Mother: {childData.motherName}
            </Text>
          )}
        </View>
        <View style={styles.coverageCircle}>
          <Text style={styles.coverageRate}>{stats.coverageRate}%</Text>
          <Text style={styles.coverageLabel}>Coverage</Text>
        </View>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Icon name="check-circle" size={24} color={COLORS.success} />
          <Text style={[styles.statNumber, { color: COLORS.success }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
          <Icon name="cancel" size={24} color={COLORS.error} />
          <Text style={[styles.statNumber, { color: COLORS.error }]}>{stats.missed}</Text>
          <Text style={styles.statLabel}>Missed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Icon name="schedule" size={24} color={COLORS.warning} />
          <Text style={[styles.statNumber, { color: COLORS.warning }]}>{stats.upcoming}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Icon name="trending-up" size={24} color={COLORS.info} />
          <Text style={[styles.statNumber, { color: COLORS.info }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Coverage Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Vaccination Coverage Trend</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 60}
          height={200}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#4CAF50',
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabs}>
        {['all', 'completed', 'missed', 'upcoming'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Missed Vaccines Alert */}
      {activeTab === 'missed' && missedVaccines.length > 0 && (
        <View style={styles.alertBanner}>
          <Icon name="warning" size={20} color="#fff" />
          <Text style={styles.alertText}>
            {missedVaccines.length} missed vaccination{missedVaccines.length > 1 ? 's' : ''} need attention
          </Text>
        </View>
      )}

      {/* Vaccination List */}
      <View style={styles.listContainer}>
        {getFilteredRecords().length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="event-busy" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No records found</Text>
          </View>
        ) : (
          getFilteredRecords().map((item, index) => (
            <View key={index} style={styles.vaccineCard}>
              <View style={styles.vaccineHeader}>
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                <View style={styles.vaccineInfo}>
                  <Text style={styles.vaccineName}>
                    {item.vaccineType || item.vaccine}
                  </Text>
                  <Text style={styles.vaccinePeriod}>
                    {item.period || item.doseNumber || 'N/A'}
                  </Text>
                </View>
                <Icon
                  name={getStatusIcon(item.status)}
                  size={24}
                  color={getStatusColor(item.status)}
                />
              </View>
              
              {item.status === 'administered' && (
                <View style={styles.vaccineDetails}>
                  <View style={styles.detailRow}>
                    <Icon name="calendar-today" size={14} color="#666" />
                    <Text style={styles.detailText}>
                      Administered: {formatDate(item.dateAdministered)}
                    </Text>
                  </View>
                  {item.batchNumber && (
                    <View style={styles.detailRow}>
                      <Icon name="qr-code" size={14} color="#666" />
                      <Text style={styles.detailText}>Batch: {item.batchNumber}</Text>
                    </View>
                  )}
                  {item.administeredBy && (
                    <View style={styles.detailRow}>
                      <Icon name="person" size={14} color="#666" />
                      <Text style={styles.detailText}>By: {item.administeredBy}</Text>
                    </View>
                  )}
                </View>
              )}

              {item.status === 'missed' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.catchUpButton}
                    onPress={handleAddVaccination}
                  >
                    <Icon name="add-circle" size={16} color="#fff" />
                    <Text style={styles.catchUpText}>Catch Up Now</Text>
                  </TouchableOpacity>
                </View>
              )}

              {item.status === 'due_now' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.dueNowButton}
                    onPress={handleAddVaccination}
                  >
                    <Icon name="notification-important" size={16} color="#fff" />
                    <Text style={styles.dueNowText}>Administer Now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* Add Vaccination FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddVaccination}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Add Vaccination Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Vaccination</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Vaccine Type *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newVaccination.vaccineType}
                    onValueChange={(value) => setNewVaccination(prev => ({ ...prev, vaccineType: value }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select vaccine..." value="" />
                    {Object.values(VACCINATION_SCHEDULE).map(schedule =>
                      schedule.vaccines.map(vaccine => (
                        <Picker.Item key={vaccine} label={vaccine} value={vaccine} />
                      ))
                    )}
                  </Picker>
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Dose Number</Text>
                <TextInput
                  style={styles.input}
                  value={newVaccination.doseNumber}
                  onChangeText={(text) => setNewVaccination(prev => ({ ...prev, doseNumber: text }))}
                  placeholder="e.g., 1st dose"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Batch Number *</Text>
                <TextInput
                  style={styles.input}
                  value={newVaccination.batchNumber}
                  onChangeText={(text) => setNewVaccination(prev => ({ ...prev, batchNumber: text }))}
                  placeholder="Enter batch number"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Date Administered</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar-today" size={20} color="#666" />
                  <Text style={styles.dateText}>
                    {formatDate(newVaccination.dateAdministered)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Administered By</Text>
                <TextInput
                  style={styles.input}
                  value={newVaccination.administeredBy}
                  onChangeText={(text) => setNewVaccination(prev => ({ ...prev, administeredBy: text }))}
                  placeholder="Health worker name"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Facility</Text>
                <TextInput
                  style={styles.input}
                  value={newVaccination.facility}
                  onChangeText={(text) => setNewVaccination(prev => ({ ...prev, facility: text }))}
                  placeholder="Facility name"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newVaccination.notes}
                  onChangeText={(text) => setNewVaccination(prev => ({ ...prev, notes: text }))}
                  placeholder="Any additional notes..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveVaccination}
              >
                <Icon name="save" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={newVaccination.dateAdministered}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  headerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  childDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  coverageCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  coverageRate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  coverageLabel: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 8,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 3,
  },
  chartCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  chart: {
    borderRadius: 10,
    marginTop: 10,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 10,
    padding: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f44336',
    margin: 15,
    marginBottom: 0,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  alertText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  listContainer: {
    padding: 15,
  },
  vaccineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  vaccineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  vaccineInfo: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  vaccinePeriod: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  vaccineDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  actionRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  catchUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  catchUpText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dueNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  dueNowText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
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
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default VaccinationDetailsScreen;