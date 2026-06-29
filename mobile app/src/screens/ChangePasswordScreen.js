import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch } from 'react-redux';
import { changePassword } from '../store/actions/authActions';
import { validatePasswordStrength } from '../utils/validators';
import { COLORS } from '../utils/constants';

const ChangePasswordScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Check password strength when typing new password
    if (field === 'newPassword' && value) {
      const strength = validatePasswordStrength(value);
      setPasswordStrength(strength);
    }
  };

  const toggleShowPassword = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async () => {
    // Validate current password
    if (!formData.currentPassword) {
      Alert.alert('Error', 'Current password is required');
      return;
    }

    // Validate new password
    if (!formData.newPassword) {
      Alert.alert('Error', 'New password is required');
      return;
    }

    // Check password strength
    const strength = validatePasswordStrength(formData.newPassword);
    if (!strength.isValid) {
      Alert.alert('Weak Password', strength.errors.join('\n'));
      return;
    }

    // Check passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    // Check if new password is same as current
    if (formData.currentPassword === formData.newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      const result = await dispatch(changePassword(
        formData.currentPassword,
        formData.newPassword
      ));

      if (result.success) {
        Alert.alert(
          'Success',
          'Your password has been changed successfully.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to change password');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (!passwordStrength) return COLORS.gray;
    
    switch (passwordStrength.strength) {
      case 'strong': return COLORS.success;
      case 'moderate': return COLORS.warning;
      case 'weak': return COLORS.error;
      default: return COLORS.gray;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="lock" size={60} color={COLORS.primary} />
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.subtitle}>
          Enter your current password and choose a new one
        </Text>
      </View>

      <View style={styles.form}>
        {/* Current Password */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock-outline" size={20} color="#666" />
            <TextInput
              style={styles.input}
              value={formData.currentPassword}
              onChangeText={(text) => handleInputChange('currentPassword', text)}
              placeholder="Enter current password"
              secureTextEntry={!showPasswords.current}
            />
            <TouchableOpacity onPress={() => toggleShowPassword('current')}>
              <Icon
                name={showPasswords.current ? 'visibility-off' : 'visibility'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#666" />
            <TextInput
              style={styles.input}
              value={formData.newPassword}
              onChangeText={(text) => handleInputChange('newPassword', text)}
              placeholder="Enter new password"
              secureTextEntry={!showPasswords.new}
            />
            <TouchableOpacity onPress={() => toggleShowPassword('new')}>
              <Icon
                name={showPasswords.new ? 'visibility-off' : 'visibility'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Password Strength Indicator */}
          {formData.newPassword.length > 0 && passwordStrength && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: passwordStrength.strength === 'strong' ? '100%' :
                             passwordStrength.strength === 'moderate' ? '66%' : '33%',
                      backgroundColor: getStrengthColor(),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
                {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
              </Text>
            </View>
          )}

          {/* Password Requirements */}
          <View style={styles.requirements}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            {[
              'At least 8 characters',
              'At least one uppercase letter',
              'At least one lowercase letter',
              'At least one number',
              'At least one special character',
            ].map((req, index) => (
              <View key={index} style={styles.requirement}>
                <Icon
                  name={formData.newPassword.length > 0 ? 
                    (index < (passwordStrength?.errors?.length ? 5 - passwordStrength.errors.length : 0) ? 
                      'check-circle' : 'radio-button-unchecked') : 
                    'radio-button-unchecked'}
                  size={16}
                  color={formData.newPassword.length > 0 && index < 3 ? '#4CAF50' : '#ccc'}
                />
                <Text style={[
                  styles.requirementText,
                  formData.newPassword.length > 0 && index < 3 && { color: '#4CAF50' },
                ]}>
                  {req}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#666" />
            <TextInput
              style={[
                styles.input,
                formData.confirmPassword.length > 0 && 
                formData.newPassword !== formData.confirmPassword && 
                styles.inputError,
              ]}
              value={formData.confirmPassword}
              onChangeText={(text) => handleInputChange('confirmPassword', text)}
              placeholder="Confirm new password"
              secureTextEntry={!showPasswords.confirm}
            />
            <TouchableOpacity onPress={() => toggleShowPassword('confirm')}>
              <Icon
                name={showPasswords.confirm ? 'visibility-off' : 'visibility'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {formData.confirmPassword.length > 0 && 
           formData.newPassword !== formData.confirmPassword && (
            <Text style={styles.errorText}>Passwords do not match</Text>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.submitText}>Change Password</Text>
            </>
          )}
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
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    width: 70,
  },
  requirements: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  requirementText: {
    fontSize: 12,
    color: '#999',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChangePasswordScreen;