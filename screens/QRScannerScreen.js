import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { thesisService } from '../services/thesisService';

const { width } = Dimensions.get('window');

const QRScannerScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const isFocused = useIsFocused();
  const cameraRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false); // Additional ref to prevent concurrent processing

  useEffect(() => {
    loadUserData();
    
    // Cleanup timeout on unmount
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  // Reset scanned state when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      setScanned(false);
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [isFocused]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleBarCodeScanned = useCallback(async ({ data }) => {
    // Prevent multiple scans - check both state and ref
    if (scanned || !currentUser || isProcessingRef.current) {
      console.log('Scan prevented - already processing or scanned');
      return;
    }

    // Immediately set flags to prevent additional scans
    setScanned(true);
    isProcessingRef.current = true;
    setLoading(true);

    try {
      console.log('Raw QR data:', data);
      
      let thesis;
      let scanIdentifier;
      let scanType = 'thesis_id';

      try {
        // First, try to parse as JSON (for thesis ID format)
        const qrData = JSON.parse(data);
        console.log('Parsed QR data (JSON):', qrData);
        
        if (qrData.type === 'thesis') {
          thesis = await thesisService.getThesisById(qrData.thesis_id);
          scanIdentifier = qrData.thesis_id;
        } else {
          throw new Error('Not a thesis QR code');
        }
      } catch (e) {
        // If JSON parsing fails, check if it's a file URL
        console.log('Not JSON, checking if file URL...');
        
        if (data.includes('supabase.co/storage') && data.includes('.pdf')) {
          console.log('Detected Supabase PDF file URL');
          thesis = await thesisService.getThesisByFileUrl(data);
          scanIdentifier = data;
          scanType = 'file_url';
        } else {
          // Try as raw thesis ID
          console.log('Trying as raw thesis ID');
          thesis = await thesisService.getThesisById(data);
          scanIdentifier = data;
        }
      }

      if (thesis) {
        console.log('Thesis found:', thesis.title);
        // Record the scan in history
        await thesisService.recordScan(currentUser.id, scanIdentifier, scanType);
        
        // Navigate to ViewingScreen and prevent further scans
        navigation.navigate('Viewing', { thesis });
        
        // Reset scan state after navigation with delay
        scanTimeoutRef.current = setTimeout(() => {
          setScanned(false);
          setLoading(false);
          isProcessingRef.current = false;
        }, 2000);
      } else {
        throw new Error('No thesis found for this QR code');
      }

    } catch (error) {
      console.error('Error processing QR code:', error);
      
      let errorTitle = 'Scan Error';
      let errorMessage = 'Could not process the QR code. Please try again.';
      let resetDelay = 2000;

      if (error.message.includes('No thesis found for this file URL')) {
        errorTitle = 'Thesis Not Found';
        errorMessage = 'This PDF file is not linked to any thesis in our system. Please contact the administrator.';
      } else if (error.message.includes('Thesis not found') || error.message.includes('No thesis found for this QR code')) {
        errorTitle = 'Thesis Not Found';
        errorMessage = 'No thesis found for this QR code. The thesis may have been removed or the QR code is invalid.';
      } else if (error.message.includes('Not a thesis QR code')) {
        errorTitle = 'Invalid QR Code';
        errorMessage = 'This QR code is not a valid thesis QR code. Please scan a thesis QR code.';
      }

      Alert.alert(errorTitle, errorMessage, [
        {
          text: 'OK',
          onPress: () => {
            // Reset scan after a delay to prevent immediate re-scan
            scanTimeoutRef.current = setTimeout(() => {
              setScanned(false);
              setLoading(false);
              isProcessingRef.current = false;
            }, resetDelay);
          }
        }
      ]);
    }
  }, [scanned, currentUser, navigation]);

  const handleRescan = () => {
    setScanned(false);
    setLoading(false);
    isProcessingRef.current = false;
  };

  // Permission states
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.permissionText}>Checking camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Icon name="camera-off" size={64} color="#999" />
          <Text style={styles.permissionText}>No access to camera</Text>
          <Text style={styles.permissionSubtext}>
            Please grant camera permission to scan QR codes
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Only render camera if screen is focused
  if (!isFocused) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.cameraContainer}>
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.placeholderText}>Camera paused</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        {isFocused && (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                {/* Top Left Corner */}
                <View style={[styles.corner, styles.cornerTL]} />
                {/* Top Right Corner */}
                <View style={[styles.corner, styles.cornerTR]} />
                {/* Bottom Left Corner */}
                <View style={[styles.corner, styles.cornerBL]} />
                {/* Bottom Right Corner */}
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              
              <Text style={styles.scanText}>
                Align QR code within the frame
              </Text>
            </View>
          </CameraView>
        )}

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Point your camera at a QR code to scan
        </Text>
        
        {scanned && !loading && (
          <TouchableOpacity
            style={styles.rescanButton}
            onPress={handleRescan}
          >
            <Icon name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.rescanButtonText}>Tap to Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 34,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#dc3545',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanText: {
    marginTop: 30,
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
  },
  footerText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 10,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  rescanButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionSubtext: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default QRScannerScreen;