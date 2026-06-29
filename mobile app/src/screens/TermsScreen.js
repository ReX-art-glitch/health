import React, { useState } from 'react';
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

const TermsScreen = ({ navigation }) => {
  const [accepted, setAccepted] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const sections = [
    {
      id: 1,
      title: 'Acceptance of Terms',
      content: `By accessing and using the Public Health AI mobile application ("the App"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use the App.

The App is designed for use by authorized public health workers and officials. Unauthorized access or use is strictly prohibited.`
    },
    {
      id: 2,
      title: 'User Responsibilities',
      content: `As a user of the App, you agree to:

• Provide accurate and complete information
• Maintain the confidentiality of your login credentials
• Use the App only for authorized public health purposes
• Comply with all applicable laws and regulations
• Protect patient confidentiality and data privacy
• Report any security vulnerabilities or concerns
• Not share your account with unauthorized users`
    },
    {
      id: 3,
      title: 'Data Collection and Use',
      content: `The App collects and processes public health data including:

• Patient health information
• Vaccination records
• Disease surveillance data
• Drug inventory information
• Facility assessment data
• Location data for field operations

All data collection complies with national health data protection regulations and international standards for health information privacy.`
    },
    {
      id: 4,
      title: 'Data Privacy and Security',
      content: `We implement industry-standard security measures to protect your data:

• End-to-end encryption for data transmission
• Secure local storage with encryption
• Role-based access control
• Regular security audits
• Automatic session timeout
• Biometric authentication support

We do not sell or share personal health information with third parties except as required by law or authorized by relevant health authorities.`
    },
    {
      id: 5,
      title: 'Intellectual Property',
      content: `The App and its original content, features, and functionality are owned by the Public Health AI Platform and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.

You may not:
• Copy, modify, or distribute the App
• Reverse engineer or decompile the App
• Remove any copyright or proprietary notices
• Use the App for any illegal or unauthorized purpose`
    },
    {
      id: 6,
      title: 'Limitation of Liability',
      content: `The App is provided "as is" without any warranties, express or implied. We do not guarantee that:

• The App will be error-free or uninterrupted
• Any errors will be corrected
• The App is free from viruses or harmful components
• The information provided is accurate or complete

We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the App.`
    },
    {
      id: 7,
      title: 'Termination',
      content: `We reserve the right to terminate or suspend your access to the App immediately, without prior notice, for:

• Violation of these Terms
• Unauthorized access or use
• Conduct that may harm other users or third parties
• Legal requirements or government orders
• Extended period of inactivity

Upon termination, your right to use the App will immediately cease.`
    },
    {
      id: 8,
      title: 'Changes to Terms',
      content: `We reserve the right to modify or replace these Terms at any time. We will notify users of any material changes through:

• In-app notifications
• Email notifications
• Updates on our website

Continued use of the App after any changes constitutes acceptance of the new Terms.`
    },
    {
      id: 9,
      title: 'Governing Law',
      content: `These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which the health authority operates, without regard to its conflict of law provisions.

Any disputes arising from these Terms shall be resolved through arbitration in accordance with applicable laws.`
    },
    {
      id: 10,
      title: 'Contact Information',
      content: `For questions about these Terms of Service, please contact:

Email: legal@publichealthai.com
Phone: +234-XXX-XXXX-XXXX
Address: Public Health AI Platform, Health Ministry Complex

Support Hours: Monday - Friday, 8:00 AM - 5:00 PM (Local Time)`
    },
  ];

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleAccept = () => {
    setAccepted(true);
    // Save acceptance to storage
    AsyncStorage.setItem('termsAccepted', new Date().toISOString());
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="description" size={50} color={COLORS.primary} />
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 1, 2024</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.introText}>
          Please read these Terms of Service carefully before using the Public Health AI mobile application.
        </Text>

        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection(section.id)}
            >
              <Text style={styles.sectionNumber}>
                {section.id.toString().padStart(2, '0')}
              </Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Icon
                name={expandedSection === section.id ? 'expand-less' : 'expand-more'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>

            {expandedSection === section.id && (
              <View style={styles.sectionContent}>
                <Text style={styles.sectionText}>{section.content}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Acceptance Section */}
      <View style={styles.acceptanceSection}>
        <TouchableOpacity
          style={[styles.acceptButton, accepted && styles.acceptedButton]}
          onPress={handleAccept}
        >
          <Icon
            name={accepted ? 'check-circle' : 'check-circle-outline'}
            size={24}
            color="#fff"
          />
          <Text style={styles.acceptText}>
            {accepted ? 'Terms Accepted' : 'I Accept the Terms of Service'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.declineText}>Go Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Questions?</Text>
        <TouchableOpacity
          style={styles.contactLink}
          onPress={() => Linking.openURL('mailto:legal@publichealthai.com')}
        >
          <Icon name="email" size={16} color={COLORS.primary} />
          <Text style={styles.contactText}>legal@publichealthai.com</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.contactLink}
          onPress={() => navigation.navigate('Privacy')}
        >
          <Icon name="privacy-tip" size={16} color={COLORS.primary} />
          <Text style={styles.contactText}>View Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

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
  introText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 12,
  },
  sectionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    width: 30,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  sectionContent: {
    padding: 15,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sectionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  acceptanceSection: {
    padding: 20,
    gap: 10,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 10,
    gap: 10,
    elevation: 2,
  },
  acceptedButton: {
    backgroundColor: '#4CAF50',
  },
  acceptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  declineButton: {
    alignItems: 'center',
    padding: 10,
  },
  declineText: {
    color: '#666',
    fontSize: 14,
  },
  contactSection: {
    padding: 20,
    paddingTop: 0,
    alignItems: 'center',
    gap: 10,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  contactLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.primary,
  },
});

export default TermsScreen;