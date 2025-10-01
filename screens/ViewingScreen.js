// screens/ViewingScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { thesisService } from '../services/thesisService';

const ViewingScreen = ({ navigation, route }) => {
  const { thesis } = route.params;
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [thesisData, setThesisData] = useState(thesis);

  useEffect(() => {
    loadUserData();
    console.log('Received thesis data:', thesis); // Debug log
  }, [thesis]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        console.log('Current user:', user); // Debug log
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleRequestAccess = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please log in to request access.');
      return;
    }

    // Get the correct thesis ID (handle different property names)
    const thesisId = thesisData.thesis_id || thesisData.id;
    
    if (!thesisId) {
      Alert.alert('Error', 'Thesis ID not found.');
      return;
    }

    setLoading(true);
    try {
      await thesisService.requestAccess(currentUser.id, thesisId);
      Alert.alert(
        'Request Submitted', 
        'Your request for access has been submitted to the administrator. You will be notified when it is approved.',
        [{ 
          text: 'OK'
        }]
      );
    } catch (error) {
      console.error('Error requesting access:', error);
      
      let errorMessage = 'Failed to submit request. Please try again.';
      if (error.message.includes('already have a pending request')) {
        errorMessage = 'You already have a pending request for this thesis.';
      }
      
      Alert.alert('Request Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async () => {
  if (!currentUser) {
    Alert.alert('Error', 'Please log in to borrow from smart bookshelf.');
    return;
  }

  // Get the correct thesis ID
  const thesisId = thesis.thesis_id || thesis.id;
  
  if (!thesisId) {
    Alert.alert('Error', 'Thesis ID not found. Cannot generate borrow QR.');
    return;
  }

  // Check if thesis is available (with safe fallback)
  const availableCopies = thesis.available_copies !== undefined ? thesis.available_copies : 1;
  if (availableCopies <= 0) {
    Alert.alert(
      'Not Available',
      'Sorry, all copies of this thesis are currently borrowed. Please try again later.'
    );
    return;
  }

  setLoading(true);
  try {
    const qrInfo = await thesisService.createBorrowQR(currentUser.id, thesisId);
    setQrData(qrInfo);
    setShowQRModal(true);
  } catch (error) {
    console.error('Error creating borrow QR:', error);
    Alert.alert(
      'Borrow Error', 
      error.message || 'Failed to generate borrow QR code. Please try again.'
    );
  } finally {
    setLoading(false);
  }
};

  // Safe data access with fallbacks
  const getThesisTitle = () => {
    return thesisData?.title || 'No Title Available';
  };

  const getThesisAuthor = () => {
    return thesisData?.author || 'Unknown Author';
  };

  const getThesisCollege = () => {
    return thesisData?.college || 'Unknown College';
  };

  const getThesisBatch = () => {
    return thesisData?.batch || thesisData?.year || 'N/A';
  };

  const getThesisAbstract = () => {
    return thesisData?.abstract || thesisData?.description || 'No abstract available for this thesis.';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#dc3545" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thesis Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.welcomeText}>Welcome, {currentUser?.fullName || currentUser?.name || 'Student'}</Text>
        <Text style={styles.viewingText}>Viewing Thesis</Text>

        {/* Thesis Details */}
        <View style={styles.thesisContainer}>
          <Text style={styles.thesisTitle}>{getThesisTitle()}</Text>
          
          {/* Thesis Metadata */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataItem}>
              <Icon name="account" size={16} color="#666" />
              <Text style={styles.metadataText}>Author: {getThesisAuthor()}</Text>
            </View>
            <View style={styles.metadataItem}>
              <Icon name="school" size={16} color="#666" />
              <Text style={styles.metadataText}>College: {getThesisCollege()}</Text>
            </View>
            <View style={styles.metadataItem}>
              <Icon name="calendar" size={16} color="#666" />
              <Text style={styles.metadataText}>Batch: {getThesisBatch()}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Abstract</Text>
          <ScrollView style={styles.abstractContainer}>
            <Text style={styles.abstractText}>
              {getThesisAbstract()}
            </Text>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={[styles.requestButton, loading && styles.buttonDisabled]}
              onPress={handleRequestAccess}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Icon name="lock-open" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.requestButtonText}>
                {loading ? 'Requesting...' : 'Request Access'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.borrowButton, loading && styles.buttonDisabled]}
              onPress={handleBorrow}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Icon name="bookshelf" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.borrowButtonText}>
                {loading ? 'Generating...' : 'Borrow from Smart Bookshelf'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Borrow QR Code</Text>
              <TouchableOpacity 
                onPress={() => setShowQRModal(false)}
                style={styles.closeModalButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrContainer}>
              {qrData && (
                <>
                  <QRCode
                    value={JSON.stringify(qrData)}
                    size={200}
                  />
                  <Text style={styles.qrInstruction}>
                    Present this QR code to the Smart Bookshelf camera
                  </Text>
                  <Text style={styles.qrDetails}>
                    User: {currentUser?.fullName || currentUser?.name || 'Unknown'}{'\n'}
                    Thesis: {getThesisTitle()}
                  </Text>
                  <Text style={styles.qrExpiry}>
                    Expires in 15 minutes
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity 
              style={styles.doneButton}
              onPress={() => setShowQRModal(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 80,
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingTop: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5.84,
    elevation: 8,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  viewingText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 30,
    color: '#666',
    textAlign: 'center',
  },
  thesisContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5.84,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  thesisTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    lineHeight: 28,
    textAlign: 'center',
  },
  metadataContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#dc3545',
  },
  abstractContainer: {
    marginBottom: 20,
    maxHeight: 200,
  },
  abstractText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'justify',
  },
  buttonsContainer: {
    marginTop: 20,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  borrowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  borrowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeModalButton: {
    padding: 5,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrInstruction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  qrDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  qrExpiry: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  doneButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ViewingScreen;