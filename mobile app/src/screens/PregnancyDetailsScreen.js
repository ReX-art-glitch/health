import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MaternalAPI } from '../api/maternal';
import { formatDate } from '../utils/formatters';

const PregnancyDetailsScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [pregnancy, setPregnancy] = useState(null);
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    loadPregnancyDetails();
  }, []);

  const loadPregnancyDetails = async () => {
    try {
      const result = await MaternalAPI.getPregnancyDetails(id);
      if (result.success) {
        setPregnancy(result.data);
        setVisits(result.data.ancVisits || []);
      } else {
        Alert.alert('Error', 'Failed to load pregnancy details');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  if (!pregnancy) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={60} color="#f44336" />
        <Text style={styles.errorText}>Pregnancy record not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Patient Info Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        <InfoRow icon="person" label="Name" value={pregnancy.patientName} />
        <InfoRow icon="calendar-today" label="Age" value={pregnancy.age} />
        <InfoRow icon="bloodtype" label="Blood Group" value={pregnancy.bloodGroup} />
        <InfoRow icon="phone" label="Phone" value={pregnancy.phone} />
      </View>

      {/* Pregnancy Details Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Pregnancy Details</Text>
        <InfoRow icon="event" label="LMP" value={formatDate(pregnancy.lmp)} />
        <InfoRow icon="baby-changing-station" label="EDD" value={formatDate(pregnancy.edd)} />
        <InfoRow icon="info" label="Gravida" value={pregnancy.gravida} />
        <InfoRow icon="info" label="Para" value={pregnancy.para} />
        
        {pregnancy.riskFactors?.length > 0 && (
          <View style={styles.riskSection}>
            <Text style={styles.riskTitle}>Risk Factors</Text>
            {pregnancy.riskFactors.map((factor, index) => (
              <View key={index} style={styles.riskFactor}>
                <Icon name="warning" size={16} color="#f44336" />
                <Text style={styles.riskFactorText}>{factor}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ANC Visits Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ANC Visits ({visits.length}/4)</Text>
        {visits.map((visit, index) => (
          <View key={index} style={styles.visitItem}>
            <View style={styles.visitHeader}>
              <Text style={styles.visitNumber}>Visit {index + 1}</Text>
              <Text style={styles.visitDate}>{formatDate(visit.date)}</Text>
            </View>
            <InfoRow icon="favorite" label="BP" value={visit.bloodPressure} />
            <InfoRow icon="monitor-weight" label="Weight" value={`${visit.weight} kg`} />
            <InfoRow icon="height" label="Fundal Height" value={`${visit.fundalHeight} cm`} />
          </View>
        ))}
        
        {visits.length < 4 && (
          <TouchableOpacity
            style={styles.addVisitButton}
            onPress={() => navigation.navigate('ANCVisit', { pregnancyId: id })}
          >
            <Icon name="add-circle" size={20} color="#fff" />
            <Text style={styles.addVisitText}>Record ANC Visit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.referButton]}
          onPress={() => navigation.navigate('Referral', { patientId: id, type: 'maternal' })}
        >
          <Icon name="forward" size={20} color="#fff" />
          <Text style={styles.actionText}>Refer Patient</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.emergencyButton]}
          onPress={() => {/* Emergency protocol */}}
        >
          <Icon name="emergency" size={20} color="#fff" />
          <Text style={styles.actionText}>Emergency</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Icon name={icon} size={18} color="#666" />
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value || 'N/A'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#666', marginTop: 10 },
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  infoLabel: { fontSize: 14, color: '#666', width: 80 },
  infoValue: { fontSize: 14, color: '#333', flex: 1 },
  riskSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  riskTitle: { fontSize: 14, fontWeight: '600', color: '#f44336', marginBottom: 8 },
  riskFactor: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  riskFactorText: { fontSize: 13, color: '#f44336' },
  visitItem: {
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  visitNumber: { fontSize: 14, fontWeight: '600', color: '#E91E63' },
  visitDate: { fontSize: 13, color: '#666' },
  addVisitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E63',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  addVisitText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 8,
  },
  referButton: { backgroundColor: '#FF9800' },
  emergencyButton: { backgroundColor: '#f44336' },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default PregnancyDetailsScreen;