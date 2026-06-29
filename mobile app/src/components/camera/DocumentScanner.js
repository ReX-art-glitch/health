import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../../utils/constants';

const DocumentScanner = ({ onScanComplete, visible, onClose }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleCapture = () => {
    const options = {
      mediaType: 'photo',
      quality: 1,
      maxWidth: 2000,
      maxHeight: 2000,
      includeBase64: false,
      saveToPhotos: false,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.error) {
        Alert.alert('Error', response.error);
      } else if (response.assets && response.assets[0]) {
        setCapturedImage(response.assets[0]);
        processDocument(response.assets[0]);
      }
    });
  };

  const processDocument = async (image) => {
    setProcessing(true);
    try {
      // Here you would call your OCR API
      // const result = await OCREngine.processDocument(image);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onScanComplete({
        image: image,
        // extractedData: result,
        timestamp: new Date().toISOString(),
      });
      
      setCapturedImage(null);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to process document');
    } finally {
      setProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Scan Document</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {processing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.processingText}>Processing document...</Text>
              <Text style={styles.processingSubtext}>
                Extracting health data using AI
              </Text>
            </View>
          ) : capturedImage ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: capturedImage.uri }}
                style={styles.preview}
                resizeMode="contain"
              />
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={handleRetake}
                >
                  <Icon name="camera-alt" size={20} color="#fff" />
                  <Text style={styles.previewButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.previewButton, { backgroundColor: '#4CAF50' }]}
                  onPress={() => processDocument(capturedImage)}
                >
                  <Icon name="check" size={20} color="#fff" />
                  <Text style={styles.previewButtonText}>Use Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.captureContainer}>
              <Icon name="document-scanner" size={80} color="#ccc" />
              <Text style={styles.instructionText}>
                Position the document within the frame
              </Text>
              <Text style={styles.instructionSubtext}>
                Ensure good lighting and a clear background
              </Text>
              
              <View style={styles.frameGuide}>
                <View style={styles.frameCornerTopLeft} />
                <View style={styles.frameCornerTopRight} />
                <View style={styles.frameCornerBottomLeft} />
                <View style={styles.frameCornerBottomRight} />
              </View>

              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleCapture}
              >
                <Icon name="camera" size={30} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Supported: Vaccination cards, ANC cards, Health forms, Lab reports
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureContainer: {
    alignItems: 'center',
    padding: 20,
  },
  instructionText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  instructionSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  frameGuide: {
    width: 280,
    height: 380,
    marginTop: 30,
    position: 'relative',
  },
  frameCornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.primary,
  },
  frameCornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: COLORS.primary,
  },
  frameCornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.primary,
  },
  frameCornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: COLORS.primary,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    borderWidth: 4,
    borderColor: '#fff',
  },
  processingContainer: {
    alignItems: 'center',
    padding: 30,
  },
  processingText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 20,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  previewContainer: {
    flex: 1,
    width: '100%',
    padding: 20,
  },
  preview: {
    flex: 1,
    width: '100%',
    borderRadius: 10,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#666',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default DocumentScanner;