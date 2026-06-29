import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../utils/constants';

const SupportScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('faq'); // faq, contact, report
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'technical',
  });
  const [bugReport, setBugReport] = useState({
    title: '',
    description: '',
    steps: '',
    severity: 'medium',
    category: 'functional',
  });
  const [loading, setLoading] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'How do I sync my data?',
      answer: 'Data sync happens automatically when you have an internet connection. You can also manually sync by going to the Sync tab and tapping "Sync All Data". Make sure you have a stable internet connection for successful sync.',
    },
    {
      id: 2,
      question: 'What happens to my data when I\'m offline?',
      answer: 'All data you enter while offline is saved locally on your device. When you reconnect to the internet, the data will automatically sync to the server. You can check the sync status in the Sync tab.',
    },
    {
      id: 3,
      question: 'How do I reset my password?',
      answer: 'To reset your password, go to the login screen and tap "Forgot Password". Enter your registered email address, and you will receive a password reset link. If you don\'t receive the email, check your spam folder or contact support.',
    },
    {
      id: 4,
      question: 'Can I use the app on multiple devices?',
      answer: 'Yes, you can log in on multiple devices. Your data will sync across all devices when connected to the internet. However, only one device should be used at a time to avoid conflicts.',
    },
    {
      id: 5,
      question: 'How do I report incorrect data?',
      answer: 'To report incorrect data, go to the Support tab and select "Report Bug". Provide details about the incorrect data, including the record ID if available. Our team will investigate and correct the issue.',
    },
    {
      id: 6,
      question: 'What permissions does the app need?',
      answer: 'The app requires camera access for document scanning, location access for GPS tagging of health data, storage access for saving reports, and notification access for alerts. All permissions are used solely for public health operations.',
    },
    {
      id: 7,
      question: 'How secure is my data?',
      answer: 'Your data is protected with industry-standard AES-256 encryption at rest and TLS 1.3 in transit. We use secure local storage, role-based access control, and regular security audits to ensure data protection.',
    },
    {
      id: 8,
      question: 'How do I update the app?',
      answer: 'The app will notify you when updates are available. You can update through the Google Play Store (Android) or App Store (iOS). We recommend keeping the app updated for the latest features and security patches.',
    },
    {
      id: 9,
      question: 'What should I do if the app crashes?',
      answer: 'If the app crashes, try restarting it. If the issue persists, clear the app cache in your device settings. If problems continue, report the issue through the Support tab with details about what you were doing when it crashed.',
    },
    {
      id: 10,
      question: 'How do I contact support?',
      answer: 'You can contact support through the Contact tab in this screen, email us at support@publichealthai.com, or call our helpline. Support hours are Monday-Friday, 8:00 AM to 5:00 PM local time.',
    },
  ];

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert('Success', 'Your message has been sent. We will respond within 24 hours.', [
        { text: 'OK', onPress: () => {
          setContactForm({ name: '', email: '', subject: '', message: '', category: 'technical' });
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBugReport = async () => {
    if (!bugReport.title || !bugReport.description) {
      Alert.alert('Error', 'Please provide a title and description');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert('Thank You', 'Bug report submitted successfully. Our team will investigate.', [
        { text: 'OK', onPress: () => {
          setBugReport({ title: '', description: '', steps: '', severity: 'medium', category: 'functional' });
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="help-outline" size={50} color={COLORS.primary} />
        <Text style={styles.title}>Help & Support</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['faq', 'contact', 'report'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Icon
              name={tab === 'faq' ? 'question-answer' : tab === 'contact' ? 'mail' : 'bug-report'}
              size={20}
              color={activeTab === tab ? COLORS.primary : '#666'}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'faq' ? 'FAQ' : tab === 'contact' ? 'Contact Us' : 'Report Bug'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <View style={styles.faqContainer}>
          {faqs.map((faq) => (
            <View key={faq.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
              >
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Icon
                  name={expandedFAQ === faq.id ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
              
              {expandedFAQ === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Contact Tab */}
      {activeTab === 'contact' && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Send us a message</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={contactForm.name}
              onChangeText={(text) => setContactForm(prev => ({ ...prev, name: text }))}
              placeholder="Your name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={contactForm.email}
              onChangeText={(text) => setContactForm(prev => ({ ...prev, email: text }))}
              placeholder="Your email"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
              {['technical', 'account', 'data', 'other'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, contactForm.category === cat && styles.categoryChipActive]}
                  onPress={() => setContactForm(prev => ({ ...prev, category: cat }))}
                >
                  <Text style={[styles.categoryText, contactForm.category === cat && styles.categoryTextActive]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={contactForm.subject}
              onChangeText={(text) => setContactForm(prev => ({ ...prev, subject: text }))}
              placeholder="Subject"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={contactForm.message}
              onChangeText={(text) => setContactForm(prev => ({ ...prev, message: text }))}
              placeholder="Describe your issue..."
              multiline
              numberOfLines={5}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabled]}
            onPress={handleContactSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="send" size={20} color="#fff" />
                <Text style={styles.submitText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Alternative Contact */}
          <View style={styles.alternativeContact}>
            <Text style={styles.altTitle}>Or reach us directly:</Text>
            
            <TouchableOpacity
              style={styles.altItem}
              onPress={() => Linking.openURL('mailto:support@publichealthai.com')}
            >
              <Icon name="email" size={20} color={COLORS.primary} />
              <Text style={styles.altText}>support@publichealthai.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.altItem}
              onPress={() => Linking.openURL('tel:+234XXXXXXXXXX')}
            >
              <Icon name="phone" size={20} color={COLORS.primary} />
              <Text style={styles.altText}>+234-XXX-XXXX-XXXX</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Report Bug Tab */}
      {activeTab === 'report' && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Report a Bug</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={bugReport.title}
              onChangeText={(text) => setBugReport(prev => ({ ...prev, title: text }))}
              placeholder="Brief description of the bug"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bugReport.description}
              onChangeText={(text) => setBugReport(prev => ({ ...prev, description: text }))}
              placeholder="Detailed description of what happened..."
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Steps to Reproduce</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bugReport.steps}
              onChangeText={(text) => setBugReport(prev => ({ ...prev, steps: text }))}
              placeholder="Step 1: ... Step 2: ... Step 3: ..."
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Severity</Text>
            <View style={styles.severityContainer}>
              {['low', 'medium', 'high', 'critical'].map(sev => (
                <TouchableOpacity
                  key={sev}
                  style={[
                    styles.severityChip,
                    bugReport.severity === sev && styles[`severity${sev.charAt(0).toUpperCase() + sev.slice(1)}`],
                  ]}
                  onPress={() => setBugReport(prev => ({ ...prev, severity: sev }))}
                >
                  <Text style={styles.severityText}>
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: '#f44336' }, loading && styles.disabled]}
            onPress={handleBugReport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="bug-report" size={20} color="#fff" />
                <Text style={styles.submitText}>Submit Bug Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { alignItems: 'center', padding: 25, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 10 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: '#666' },
  activeTabText: { color: COLORS.primary, fontWeight: '600' },
  faqContainer: { padding: 15 },
  faqItem: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 8, overflow: 'hidden', elevation: 1 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333' },
  faqAnswer: { padding: 15, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  faqAnswerText: { fontSize: 14, color: '#555', lineHeight: 20 },
  form: { padding: 15 },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  field: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoryContainer: { flexDirection: 'row', gap: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { fontSize: 13, color: '#666' },
  categoryTextActive: { color: '#fff', fontWeight: '600' },
  severityContainer: { flexDirection: 'row', gap: 8 },
  severityChip: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  severityLow: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  severityMedium: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
  severityHigh: { backgroundColor: '#f44336', borderColor: '#f44336' },
  severityCritical: { backgroundColor: '#d32f2f', borderColor: '#d32f2f' },
  severityText: { fontSize: 13, color: '#666', fontWeight: '600' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, padding: 16, borderRadius: 10, gap: 8, marginTop: 10 },
  disabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  alternativeContact: { marginTop: 25, padding: 20, backgroundColor: '#fff', borderRadius: 10, elevation: 1 },
  altTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 12 },
  altItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  altText: { fontSize: 14, color: COLORS.primary },
});

export default SupportScreen;