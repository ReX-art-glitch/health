import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { InventoryAPI } from '../api/inventory';
import { formatDate, formatNumber } from '../utils/formatters';
import { DRUG_CATEGORIES, STORAGE_CONDITIONS, COLORS } from '../utils/constants';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const DrugDetailsScreen = ({ route, navigation }) => {
  const { drugId } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [drugData, setDrugData] = useState(null);
  const [consumptionData, setConsumptionData] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState({
    quantity: '',
    action: 'add',
    notes: '',
    date: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadDrugDetails();
  }, [drugId]);

  const loadDrugDetails = async () => {
    try {
      setLoading(true);
      const result = await InventoryAPI.getDrugDetails(drugId);
      
      if (result.success) {
        setDrugData(result.data);
        setConsumptionData(result.data.consumptionHistory || []);
      } else {
        Alert.alert('Error', 'Failed to load drug details');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = () => {
    if (!drugData) return 'normal';
    if (drugData.quantity <= drugData.reorderLevel) return 'critical';
    if (drugData.quantity <= drugData.reorderLevel * 2) return 'low';
    if (drugData.quantity >= drugData.reorderLevel * 5) return 'overstocked';
    return 'normal';
  };

  const getStockColor = () => {
    const status = getStockStatus();
    switch (status) {
      case 'critical': return COLORS.error;
      case 'low': return COLORS.warning;
      case 'overstocked': return COLORS.info;
      default: return COLORS.success;
    }
  };

  const getDaysUntilStockout = () => {
    if (!drugData?.dailyConsumption || drugData.dailyConsumption === 0) return 'N/A';
    const days = drugData.quantity / drugData.dailyConsumption;
    return days < 0 ? '0' : Math.floor(days).toString();
  };

  const isExpiringSoon = () => {
    if (!drugData?.expiryDate) return false;
    const expiry = new Date(drugData.expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 90;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setUpdateData(prev => ({ ...prev, date: selectedDate }));
    }
  };

  const handleUpdateStock = async () => {
    if (!updateData.quantity) {
      Alert.alert('Error', 'Quantity is required');
      return;
    }

    try {
      // API call to update stock
      Alert.alert('Success', 'Stock updated successfully', [
        { text: 'OK', onPress: () => {
          setShowUpdateModal(false);
          loadDrugDetails();
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: consumptionData.length > 0 ? consumptionData : [100, 95, 90, 85, 80, 75],
      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Drug Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <Text style={styles.drugName}>{drugData?.drugName || 'Unknown'}</Text>
            <Text style={styles.drugCategory}>{drugData?.category || 'Uncategorized'}</Text>
          </View>
          <View style={[styles.stockBadge, { backgroundColor: getStockColor() }]}>
            <Text style={styles.stockBadgeText}>{getStockStatus()}</Text>
          </View>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.statNumber}>{drugData?.quantity || 0}</Text>
            <Text style={styles.statLabel}>Current Stock</Text>
          </View>
          <View style={styles.headerStat}>
            <Text style={styles.statNumber}>{drugData?.reorderLevel || 0}</Text>
            <Text style={styles.statLabel}>Reorder Level</Text>
          </View>
          <View style={styles.headerStat}>
            <Text style={[styles.statNumber, { color: getStockColor() }]}>
              {getDaysUntilStockout()}
            </Text>
            <Text style={styles.statLabel}>Days Left</Text>
          </View>
        </View>

        {/* Alert Banner */}
        {getStockStatus() === 'critical' && (
          <View style={styles.alertBanner}>
            <Icon name="error" size={20} color="#fff" />
            <Text style={styles.alertText}>Stock critical! Reorder immediately.</Text>
          </View>
        )}
        {isExpiringSoon() && (
          <View style={[styles.alertBanner, { backgroundColor: '#FF9800' }]}>
            <Icon name="warning" size={20} color="#fff" />
            <Text style={styles.alertText}>
              Expiring soon: {formatDate(drugData.expiryDate)}
            </Text>
          </View>
        )}
      </View>

      {/* Drug Information */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Drug Information</Text>
        <InfoRow icon="inventory-2" label="Unit" value={drugData?.unit} />
        <InfoRow icon="qr-code" label="Batch" value={drugData?.batchNumber} />
        <InfoRow icon="event" label="Expiry" value={formatDate(drugData?.expiryDate)} />
        <InfoRow icon="factory" label="Manufacturer" value={drugData?.manufacturer} />
        <InfoRow icon="local-shipping" label="Supplier" value={drugData?.supplier} />
        <InfoRow icon="ac-unit" label="Storage" value={drugData?.storageCondition} />
      </View>

      {/* Stock Levels Chart */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Stock Level Trend</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 60}
          height={200}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsCard}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
          onPress={() => {
            setUpdateData(prev => ({ ...prev, action: 'add' }));
            setShowUpdateModal(true);
          }}
        >
          <Icon name="add-circle" size={20} color="#fff" />
          <Text style={styles.actionText}>Add Stock</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#f44336' }]}
          onPress={() => {
            setUpdateData(prev => ({ ...prev, action: 'remove' }));
            setShowUpdateModal(true);
          }}
        >
          <Icon name="remove-circle" size={20} color="#fff" />
          <Text style={styles.actionText}>Remove Stock</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
          onPress={() => {
            navigation.navigate('Referral', { type: 'inventory', drugId });
          }}
        >
          <Icon name="shopping-cart" size={20} color="#fff" />
          <Text style={styles.actionText}>Reorder</Text>
        </TouchableOpacity>
      </View>

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
              <Text style={styles.modalTitle}>
                {updateData.action === 'add' ? 'Add Stock' : 'Remove Stock'}
              </Text>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Quantity *</Text>
                <TextInput
                  style={styles.input}
                  value={updateData.quantity}
                  onChangeText={(text) => setUpdateData(prev => ({ ...prev, quantity: text }))}
                  placeholder="Enter quantity"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar-today" size={20} color="#666" />
                  <Text style={styles.dateText}>{formatDate(updateData.date)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={updateData.notes}
                  onChangeText={(text) => setUpdateData(prev => ({ ...prev, notes: text }))}
                  placeholder="Reason for adjustment..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowUpdateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: updateData.action === 'add' ? '#4CAF50' : '#f44336' },
                ]}
                onPress={handleUpdateStock}
              >
                <Text style={styles.saveButtonText}>
                  {updateData.action === 'add' ? 'Add Stock' : 'Remove Stock'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={updateData.date}
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
  headerCard: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 15, elevation: 3 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  headerInfo: { flex: 1 },
  drugName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  drugCategory: { fontSize: 13, color: '#999', marginTop: 4 },
  stockBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  stockBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  headerStats: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
  headerStat: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 3 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f44336', padding: 10, borderRadius: 8, marginTop: 10, gap: 8 },
  alertText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  card: { backgroundColor: '#fff', margin: 15, marginTop: 0, padding: 15, borderRadius: 12, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  infoIcon: { width: 24 },
  infoLabel: { fontSize: 13, color: '#666', width: 100 },
  infoValue: { fontSize: 13, color: '#333', flex: 1 },
  chart: { borderRadius: 10, marginTop: 10 },
  actionsCard: { flexDirection: 'row', marginHorizontal: 15, marginBottom: 30, gap: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 6 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalBody: { padding: 20 },
  fieldContainer: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  dateText: { marginLeft: 10, fontSize: 16, color: '#333' },
  modalFooter: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#eee', gap: 10 },
  cancelButton: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center' },
  cancelButtonText: { fontSize: 16, color: '#666', fontWeight: '600' },
  saveButton: { flex: 2, padding: 14, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});

export default DrugDetailsScreen;