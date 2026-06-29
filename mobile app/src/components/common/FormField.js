import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  required,
  keyboardType,
  multiline,
  numberOfLines,
  secureTextEntry,
  editable = true,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            error && styles.inputError,
            multiline && styles.multiline,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={secureTextEntry}
          editable={editable}
          placeholderTextColor="#999"
        />
        
        {rightIcon && (
          <TouchableOpacity style={styles.rightIcon} onPress={onRightIconPress}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
  },
  required: {
    color: '#f44336',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#f44336',
  },
  multiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  rightIcon: {
    padding: 10,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 5,
  },
});

export default FormField;