import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { thesisService } from '../services/thesisService';

const BookshelfScannerScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);

  const handleBorrowScan = async ({ data }) => {
    if (processing) return;

    setProcessing(true);
    try {
      const qrData = JSON.parse(data);
      
      if (qrData.type === 'borrow' && qrData.transaction_id) {
        const result = await thesisService.processBorrow(qrData.transaction_id);
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Invalid QR', 'This is not a valid borrow QR code.');
      }
    } catch (error) {
      console.error('Borrow processing error:', error);
      Alert.alert('Error', error.message || 'Failed to process borrow request.');
    } finally {
      setProcessing(false);
    }
  };

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
              onPress={() => setScanned(false)}
            >
              <Icon name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.rescanButtonText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  };