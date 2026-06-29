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
import { InventoryAPI } from '../api/inventory';
import { LocationService } from '../services/LocationService';
import { validateInventory } from '../utils/validators';
import { DRUG_CATEGORIES } from '../utils/constants';

const DrugInventoryScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('add'); // add, list, alerts
  const [formData, setFormData] = useState({
    drugName: '',
    category: '',
    quantity: '',
    unit: 'doses',
    batchNumber: '',
    expiryDate: new Date(),
    manufacturer: '',
    supplier: '',
    receivedDate: new Date(),
    storageCondition: 'room_temperature',
    facility: '',
    location: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateField, setDateField] = useState('');
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const units = ['doses', 'vials', 'tablets', 'capsules', 'bottles', 'ampoules', 'tubes', 'packs', 'kits'];
  const storageConditions = [
    'room_temperature',
    'refrigerated',
    'frozen',
    'cold_chain',
    'cool_dry_place',
    'protected_from_light',
  ];

  useEffect(() => {
    getCurrentLocation();
    loadInventory();
    loadAlerts();
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
        location: geocode?.address || '',
        facility: geocode?.address || '',
      }));
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const loadInventory = async () => {
    try {
      const result = await InventoryAPI.getInventory();
      if (result.success) {
        setInventory(result.data);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const result = await InventoryAPI.getAlerts();
      if (result.success) {
        setAlerts(result.data);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
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
    const validationErrors = validateInventory(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert('Validation Error', 'Please fix the errors before submitting.');
      return;
    }

    setLoading(true);
    try {
      const result = await InventoryAPI.updateInventory(formData);
      
      if (result.success) {
        Alert.alert(
          'Success',
          result.synced
            ? 'Inventory updated successfully.'
            : 'Saved offline. Will sync when connected.',
          [
            {
              text: 'View Inventory',
              onPress: () => setActiveTab('list'),
            },
            {
              text: 'Add Another',
              onPress: clearForm,
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update inventory');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      drugName: '',
      category: '',
      quantity: '',
      unit: 'doses',
      batchNumber: '',
      expiryDate: new Date(),
      manufacturer: '',
      supplier: '',
      receivedDate: new Date(),
      storageCondition: 'room_temperature',
      facility: '',
      location: '',
      notes: '',
    });
    setErrors({});
  };

  const getStockStatus = (item) => {
    if (item.quantity <= item.reorderLevel) return 'critical';
    if (item.quantity <= item.reorderLevel * 2) return 'low';
    if (item.quantity >= item.reorderLevel * 5) return 'overstocked';
    return 'normal';
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'critical': return '#f44336';
      case 'low': return '#FF9800';
      case 'overstocked': return '#2196F3';
      default: return '#4CAF50';
    }
  };

  const isExpiringSoon = (expiryDate) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 90;
  };

  // Render Add Inventory Form
  const renderAddForm = () => (
    <ScrollView style={styles.form}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Drug Information</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Drug Name *</Text>
          <TextInput
            style={[styles.input, errors.drugName && styles.inputError]}
            value={formData.drugName}
            onChangeText={(text) => handleInputChange('drugName', text)}
            placeholder="Enter drug name"
          />
          {errors.drugName && <Text style={styles.errorText}>{errors.drugName}</Text>}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select category..." value="" />
              {DRUG_CATEGORIES.map(cat => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={[styles.input, errors.quantity && styles.inputError]}
              value={formData.quantity}
              onChangeText={(text) => handleInputChange('quantity', text)}
              placeholder="0"
              keyboardType="numeric"
            />
            {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
          </View>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Unit</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.unit}
                onValueChange={(value) => handleInputChange('unit', value)}
                style={styles.picker}
              >
                {units.map(unit => (
                  <Picker.Item key={unit} label={unit} value={unit} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Batch Number</Text>
          <TextInput
            style={[styles.input, errors.batchNumber && styles.inputError]}
            value={formData.batchNumber}
            onChangeText={(text) => handleInputChange('batchNumber', text)}
            placeholder="Enter batch number"
          />
          {errors.batchNumber && <Text style={styles.errorText}>{errors.batchNumber}</Text>}
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Expiry Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => showDatePickerFor('expiryDate')}
            >
              <Icon name="calendar-today" size={20} color="#666" />
              <Text style={styles.dateText}>{formatDate(formData.expiryDate)}</Text>
            </TouchableOpacity>
            {errors.expiryDate && <Text style={styles.errorText}>{errors.expiryDate}</Text>}
          </View>
          <View style={[styles.fieldContainer, { flex: 1 }]}>
            <Text style={styles.label}>Received Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => showDatePickerFor('receivedDate')}
            >
              <Icon name="event" size={20} color="#666" />
              <Text style={styles.dateText}>{formatDate(formData.receivedDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Manufacturer</Text>
          <TextInput
            style={styles.input}
            value={formData.manufacturer}
            onChangeText={(text) => handleInputChange('manufacturer', text)}
            placeholder="Manufacturer name"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Supplier</Text>
          <TextInput
            style={styles.input}
            value={formData.supplier}
            onChangeText={(text) => handleInputChange('supplier', text)}
            placeholder="Supplier name"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Storage Condition</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.storageCondition}
              onValueChange={(value) => handleInputChange('storageCondition', value)}
              style={styles.picker}
            >
              {storageConditions.map(condition => (
                <Picker.Item 
                  key={condition} 
                  label={condition.replace(/_/g, ' ')} 
                  value={condition} 
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => handleInputChange('notes', text)}
            placeholder="Any additional notes..."
            multiline
            numberOfLines={3}
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
            <Icon name="inventory" size={20} color="#fff" />
            <Text style={styles.submitText}>Add to Inventory</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // Render Inventory List
  const renderInventoryList = () => (
    <View style={styles.listContainer}>
      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search drugs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilters}>
          {['all', ...DRUG_CATEGORIES.slice(0, 5)].map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, filterCategory === cat && styles.categoryChipActive]}
              onPress={() => setFilterCategory(cat)}
            >
              <Text style={[styles.categoryChipText, filterCategory === cat && styles.categoryChipTextActive]}>
                {cat === 'all' ? 'All' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={inventory.filter(item => {
          const matchesSearch = item.drugName?.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
          return matchesSearch && matchesCategory;
        })}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => {
          const stockStatus = getStockStatus(item);
          const expiring = isExpiringSoon(item.expiryDate);
          
          return (
            <View style={[styles.inventoryCard, { borderLeftColor: getStockStatusColor(stockStatus) }]}>
              <View style={styles.inventoryHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drugName}>{item.drugName}</Text>
                  <Text style={styles.drugCategory}>{item.category}</Text>
                </View>
                <View style={[styles.stockBadge, { backgroundColor: getStockStatusColor(stockStatus) }]}>
                  <Text style={styles.stockBadgeText}>{stockStatus}</Text>
                </View>
              </View>
              
              <View style={styles.inventoryDetails}>
                <View style={styles.detailItem}>
                  <Icon name="inventory-2" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Icon name="event" size={16} color="#666" />
                  <Text style={[styles.detailText, expiring && styles.expiringText]}>
                    Exp: {formatDate(item.expiryDate)}
                  </Text>
                  {expiring && <Icon name="warning" size={14} color="#FF9800" />}
                </View>
                <View style={styles.detailItem}>
                  <Icon name="location-on" size={16} color="#666" />
                  <Text style={styles.detailText}>{item.facility}</Text>
                </View>
              </View>

              <View style={styles.inventoryActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUpdateStock(item)}
                >
                  <Icon name="edit" size={16} color="#fff" />
                  <Text style={styles.actionText}>Update</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.orderButton]}
                  onPress={() => handleReorder(item)}
                >
                  <Icon name="shopping-cart" size={16} color="#fff" />
                  <Text style={styles.actionText}>Reorder</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="inventory" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No inventory items found</Text>
          </View>
        }
      />
    </View>
  );

  // Render Alerts
  const renderAlerts = () => (
    <View style={styles.alertsContainer}>
      <View style={styles.alertsSummary}>
        <View style={[styles.alertSummaryCard, { backgroundColor: '#ffebee' }]}>
          <Text style={styles.alertSummaryNumber}>
            {alerts.filter(a => a.severity === 'critical').length}
          </Text>
          <Text style={styles.alertSummaryLabel}>Critical</Text>
        </View>
        <View style={[styles.alertSummaryCard, { backgroundColor: '#fff3e0' }]}>
          <Text style={styles.alertSummaryNumber}>
            {alerts.filter(a => a.severity === 'low').length}
          </Text>
          <Text style={styles.alertSummaryLabel}>Low Stock</Text>
        </View>
        <View style={[styles.alertSummaryCard, { backgroundColor: '#e8f5e9' }]}>
          <Text style={styles.alertSummaryNumber}>
            {alerts.filter(a => a.type === 'expiring').length}
          </Text>
          <Text style={styles.alertSummaryLabel}>Expiring</Text>
        </View>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <View style={[styles.alertCard, { borderLeftColor: item.severity === 'critical' ? '#f44336' : '#FF9800' }]}>
            <View style={styles.alertHeader}>
              <Icon 
                name={item.severity === 'critical' ? 'error' : 'warning'} 
                size={20} 
                color={item.severity === 'critical' ? '#f44336' : '#FF9800'} 
              />
              <Text style={styles.alertDrugName}>{item.drugName}</Text>
              <View style={[styles.alertBadge, { backgroundColor: item.severity === 'critical' ? '#f44336' : '#FF9800' }]}>
                <Text style={styles.alertBadgeText}>{item.severity}</Text>
              </View>
            </View>
            
            <Text style={styles.alertMessage}>{item.message}</Text>
            
            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertActionButton}>
                <Text style={styles.alertActionText}>Order Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertDismissButton}>
                <Text style={styles.alertDismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="check-circle" size={50} color="#4CAF50" />
            <Text style={styles.emptyText}>No active alerts</Text>
          </View>
        }
      />
    </View>
  );

  const handleUpdateStock = (item) => {
    setFormData({
      ...formData,
      drugName: item.drugName,
      category: item.category,
      quantity: item.quantity.toString(),
      unit: item.unit,
      batchNumber: item.batchNumber,
      expiryDate: new Date(item.expiryDate),
      facility: item.facility,
    });
    setActiveTab('add');
  };

  const handleReorder = (item) => {
    Alert.alert(
      'Reorder',
      `Order more ${item.drugName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Order', onPress: () => {
          // Handle reorder logic
          Alert.alert('Order Placed', `Reorder for ${item.drugName} has been placed.`);
        }},
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="inventory" size={30} color="#fff" />
        <Text style={styles.headerTitle}>Drug Inventory</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabs}>
        {['add', 'list', 'alerts'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Icon
              name={tab === 'add' ? 'add-circle' : tab === 'list' ? 'list' : 'notifications'}
              size={20}
              color={activeTab === tab ? '#2196F3' : '#666'}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {tab === 'alerts' && alerts.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{alerts.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'add' && renderAddForm()}
      {activeTab === 'list' && renderInventoryList()}
      {activeTab === 'alerts' && renderAlerts()}

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
    backgroundColor: '#2196F3',
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
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  tabBadge: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
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
  listContainer: {
    flex: 1,
    padding: 15,
  },
  filterContainer: {
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    fontSize: 16,
  },
  categoryFilters: {
    flexGrow: 0,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: '#2196F3',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  inventoryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    borderLeftWidth: 4,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  drugName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  drugCategory: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  stockBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  inventoryDetails: {
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
    fontSize: 13,
    color: '#666',
  },
  expiringText: {
    color: '#FF9800',
  },
  inventoryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    gap: 5,
  },
  orderButton: {
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
  alertsContainer: {
    flex: 1,
    padding: 15,
  },
  alertsSummary: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  alertSummaryCard: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  alertSummaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  alertSummaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  alertDrugName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  alertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  alertBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 10,
  },
  alertActionButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  alertDismissButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertDismissText: {
    color: '#666',
    fontSize: 14,
  },
});

export default DrugInventoryScreen;