import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../utils/constants';

const PrivacyScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="privacy-tip" size={50} color={COLORS.primary} />
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 1, 2024</Text>
      </View>

      <View style={styles.content}>
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.text}>
            This Privacy Policy explains how the Public Health AI Platform ("we", "our", or "us") 
            collects, uses, and protects your personal information. We are committed to protecting 
            the privacy of all users and patients whose data is processed through this application.
          </Text>
        </View>

        {/* Information We Collect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          
          <Text style={styles.subtitle}>Personal Information:</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Name, employee ID, and contact information" />
            <BulletItem text="Login credentials and authentication data" />
            <BulletItem text="Device information and location data" />
            <BulletItem text="Usage patterns and activity logs" />
          </View>

          <Text style={styles.subtitle}>Health Data:</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Patient demographic information" />
            <BulletItem text="Immunization records and schedules" />
            <BulletItem text="Maternal health records" />
            <BulletItem text="Disease surveillance data" />
            <BulletItem text="Drug inventory and supply chain data" />
            <BulletItem text="Facility assessment reports" />
          </View>

          <Text style={styles.subtitle}>Technical Data:</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Device type and operating system" />
            <BulletItem text="App version and usage statistics" />
            <BulletItem text="Network connectivity information" />
            <BulletItem text="Error logs and crash reports" />
          </View>
        </View>

        {/* How We Use Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <View style={styles.bulletList}>
            <BulletItem text="To provide public health monitoring services" />
            <BulletItem text="To generate health intelligence reports" />
            <BulletItem text="To detect disease outbreaks and trends" />
            <BulletItem text="To improve healthcare delivery" />
            <BulletItem text="To ensure data synchronization" />
            <BulletItem text="To comply with legal obligations" />
            <BulletItem text="To improve app functionality" />
            <BulletItem text="To provide technical support" />
          </View>
        </View>

        {/* Data Protection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Protection</Text>
          <Text style={styles.text}>
            We implement robust security measures to protect your data:
          </Text>
          <View style={styles.bulletList}>
            <BulletItem text="AES-256 encryption for data at rest" />
            <BulletItem text="TLS 1.3 encryption for data in transit" />
            <BulletItem text="Secure local storage with encryption" />
            <BulletItem text="Role-based access controls" />
            <BulletItem text="Multi-factor authentication support" />
            <BulletItem text="Regular security audits and penetration testing" />
            <BulletItem text="Automated threat detection" />
            <BulletItem text="Incident response procedures" />
          </View>
        </View>

        {/* Data Retention */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <Text style={styles.text}>
            We retain data for the minimum period necessary to fulfill the purposes 
            outlined in this policy, in accordance with national health data regulations:
          </Text>
          <View style={styles.bulletList}>
            <BulletItem text="Health records: 7 years minimum" />
            <BulletItem text="Usage logs: 1 year" />
            <BulletItem text="System logs: 90 days" />
            <BulletItem text="Error reports: 30 days" />
          </View>
        </View>

        {/* User Rights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.text}>
            You have the following rights regarding your data:
          </Text>
          <View style={styles.bulletList}>
            <BulletItem text="Access your personal data" />
            <BulletItem text="Correct inaccurate data" />
            <BulletItem text="Delete your data (subject to retention requirements)" />
            <BulletItem text="Restrict processing of your data" />
            <BulletItem text="Data portability" />
            <BulletItem text="Object to data processing" />
            <BulletItem text="Withdraw consent at any time" />
          </View>
        </View>

        {/* Third-Party Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Third-Party Services</Text>
          <Text style={styles.text}>
            We use the following third-party services that may collect data:
          </Text>
          <View style={styles.bulletList}>
            <BulletItem text="OpenAI API - For AI-powered analysis and insights" />
            <BulletItem text="Google Maps - For location and mapping services" />
            <BulletItem text="Firebase - For push notifications and analytics" />
            <BulletItem text="SendGrid - For email notifications" />
            <BulletItem text="Twilio - For SMS alerts" />
          </View>
          <Text style={styles.text}>
            Each third-party service has its own privacy policy governing the use of data.
          </Text>
        </View>

        {/* Children's Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.text}>
            Our app processes child health data as part of public health operations. 
            This data is collected by authorized health workers and is protected under 
            the same strict privacy and security measures as all health data. Parental 
            consent for data collection is obtained through standard healthcare procedures.
          </Text>
        </View>

        {/* Changes to Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.text}>
            We may update this privacy policy from time to time. We will notify users 
            of any material changes through the app and via email. Continued use of 
            the app after changes constitutes acceptance of the updated policy.
          </Text>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.text}>
            If you have questions about this Privacy Policy or our data practices:
          </Text>
          
          <View style={styles.contactMethods}>
            <TouchableOpacity
              style={styles.contactMethod}
              onPress={() => Linking.openURL('mailto:privacy@publichealthai.com')}
            >
              <Icon name="email" size={20} color={COLORS.primary} />
              <Text style={styles.contactMethodText}>privacy@publichealthai.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactMethod}
              onPress={() => Linking.openURL('tel:+234XXXXXXXXXX')}
            >
              <Icon name="phone" size={20} color={COLORS.primary} />
              <Text style={styles.contactMethodText}>+234-XXX-XXXX-XXXX</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactMethod}
              onPress={() => Linking.openURL('https://publichealthai.com/privacy')}
            >
              <Icon name="language" size={20} color={COLORS.primary} />
              <Text style={styles.contactMethodText}>www.publichealthai.com/privacy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={20} color="#fff" />
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const BulletItem = ({ text }) => (
  <View style={styles.bulletItem}>
    <Icon name="circle" size={6} color={COLORS.primary} style={styles.bullet} />
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  content: {
    padding: 15,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    marginTop: 12,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 10,
  },
  bulletList: {
    marginLeft: 5,
    marginBottom: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 10,
  },
  bullet: {
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  contactMethods: {
    gap: 12,
    marginTop: 10,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactMethodText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    margin: 20,
    padding: 15,
    borderRadius: 10,
    gap: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrivacyScreen;