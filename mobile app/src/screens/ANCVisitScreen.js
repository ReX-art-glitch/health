import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MaternalAPI } from '../api/maternal';

const ANCVisitScreen = ({ route, navigation }) => {
  const { pregnancyId } = route.params;
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    visitDate: new Date(),
    gestationalAge: '',
    bloodPressure: '',
    weight: '',
    fundalHeight: '',
    fetalHeartRate: '',
    fetalPresentation: '',
    edema: 'none',
    urineProtein: '',
    urineGlucose: '',
    hemoglobin: '',
    ironSupplements: false,
    tetanusToxoid: '',
    itnGiven: false,
    deworming: false,
    dangerSigns: '',
    nextVisitDate: '',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!formData.bloodPressure || !formData.weight) {
      Alert.alert('Error', 'Blood pressure and weight are required');
      return;
    }

    setLoading(true);
    try {
      const result = await MaternalAPI.recordANCVisit(pregnancyId, formData);
      if (result.success) {
        Alert.alert('Success', 'ANC visit recorded', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Visit Details</Text>
        
        <View style={styles.field}>
          <Text style={styles.label}>Visit Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar-today" size={20} color="#666" />
            <Text style={styles.dateText}>
              {formData.visitDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Blood Pressure *</Text>
            <TextInput
              style={styles.input}
              value={formData.bloodPressure}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bloodPressure: text }))}
              placeholder="120/80"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Weight (kg) *</Text>
            <TextInput
              style={styles.input}
              value={formData.weight}
              onChangeText={(text) => setFormData(prev => ({ ...prev, weight: text }))}
              placeholder="65"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Fundal Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={formData.fundalHeight}
              onChangeText={(text) => setFormData(prev => ({ ...prev, fundalHeight: text }))}
              placeholder="30"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Fetal HR (bpm)</Text>
            <TextInput
              style={styles.input}
              value={formData.fetalHeartRate}
              onChangeText={(text) => setFormData(prev => ({ ...prev, fetalHeartRate: text }))}
              placeholder="140"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Danger Signs</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.dangerSigns}
            onChangeText={(text) => setFormData(prev => ({ ...prev, dangerSigns: text }))}
            placeholder="Any danger signs observed..."
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Icon name="save" size={20} color="#fff" />
            <Text style={styles.submitText}>Save ANC Visit</Text>
          </>
        )}
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={formData.visitDate}
          mode="date"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setFormData(prev => ({ ...prev, visitDate: date }));
          }}
          maximumDate={new Date()}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
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
  field: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  input: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  dateText: { marginLeft: 10, fontSize: 16, color: '#333' },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E63',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
    gap: 8,
  },
  disabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ANCVisitScreen;