import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { fetchDashboardData } from '../store/actions/dataActions';

const screenWidth = Dimensions.get('window').width;

const HomeScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { dashboardData, loading } = useSelector(state => state.data);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    await dispatch(fetchDashboardData());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const QuickActionCard = ({ title, icon, color, onPress, count }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={30} color="#fff" />
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
      {count !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Health Worker'}</Text>
          <Text style={styles.location}>{user?.facility || 'Unknown Facility'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Icon name="account-circle" size={50} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {dashboardData?.todayVaccinations || 0}
          </Text>
          <Text style={styles.statLabel}>Today's Vaccinations</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {dashboardData?.pendingSync || 0}
          </Text>
          <Text style={styles.statLabel}>Pending Sync</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {dashboardData?.activeAlerts || 0}
          </Text>
          <Text style={styles.statLabel}>Active Alerts</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <QuickActionCard
          title="Immunization"
          icon="vaccines"
          color="#4CAF50"
          onPress={() => navigation.navigate('Immunization')}
          count={dashboardData?.dueVaccinations}
        />
        <QuickActionCard
          title="Maternal Health"
          icon="pregnant-woman"
          color="#E91E63"
          onPress={() => navigation.navigate('MaternalHealth')}
          count={dashboardData?.highRiskPregnancies}
        />
        <QuickActionCard
          title="Disease Report"
          icon="coronavirus"
          color="#FF9800"
          onPress={() => navigation.navigate('DiseaseSurveillance')}
        />
        <QuickActionCard
          title="Drug Inventory"
          icon="inventory"
          color="#2196F3"
          onPress={() => navigation.navigate('DrugInventory')}
          count={dashboardData?.lowStockItems}
        />
        <QuickActionCard
          title="Facility Assessment"
          icon="assessment"
          color="#9C27B0"
          onPress={() => navigation.navigate('FacilityAssessment')}
        />
        <QuickActionCard
          title="Sync Data"
          icon="sync"
          color="#607D8B"
          onPress={() => navigation.navigate('Sync')}
          count={dashboardData?.pendingSync}
        />
      </View>

      {/* Coverage Chart */}
      {dashboardData?.coverageTrend && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Vaccination Coverage</Text>
          <LineChart
            data={{
              labels: dashboardData.coverageTrend.labels,
              datasets: [{
                data: dashboardData.coverageTrend.data,
              }],
            }}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#2196F3',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Disease Distribution */}
      {dashboardData?.diseaseDistribution && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Disease Distribution</Text>
          <PieChart
            data={dashboardData.diseaseDistribution}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </View>
      )}

      {/* Recent Alerts */}
      {dashboardData?.recentAlerts?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Alerts</Text>
          {dashboardData.recentAlerts.map((alert, index) => (
            <View key={index} style={styles.alertCard}>
              <Icon
                name={alert.severity === 'critical' ? 'error' : 'warning'}
                size={24}
                color={alert.severity === 'critical' ? '#d32f2f' : '#ff9800'}
              />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    padding: 20,
    paddingTop: 20,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  location: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    margin: 5,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    paddingBottom: 5,
    color: '#333',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  quickAction: {
    width: '30%',
    backgroundColor: '#fff',
    margin: '1.5%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chartSection: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chart: {
    borderRadius: 10,
    marginTop: 10,
  },
  section: {
    margin: 15,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alertContent: {
    flex: 1,
    marginLeft: 10,
  },
  alertTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  alertMessage: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  alertTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 5,
  },
});

export default HomeScreen;