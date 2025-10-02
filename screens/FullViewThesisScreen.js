import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  AppState,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFetchBlob from 'rn-fetch-blob';
import FileViewer from 'react-native-file-viewer';
import { thesisService } from '../services/thesisService';

const { width, height } = Dimensions.get('window');

const FullViewThesisScreen = ({ navigation, route }) => {
  const { thesis } = route.params;
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [localPdfPath, setLocalPdfPath] = useState(null);
  const [accessStatus, setAccessStatus] = useState('pending');
  const [requestData, setRequestData] = useState(null);
  const [securityActive, setSecurityActive] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  
  const webViewRef = useRef(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    loadUserData();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
      setSecurityActive(false);
      // Clean up downloaded file when component unmounts
      if (localPdfPath) {
        cleanupLocalFile();
      }
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      checkAccessStatus();
    }
  }, [currentUser]);

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      setSecurityActive(true);
    } else if (nextAppState.match(/inactive|background/)) {
      setSecurityActive(false);
      // Hide PDF when app goes to background
      setShowPdfViewer(false);
    }
    appState.current = nextAppState;
  };

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const checkAccessStatus = async () => {
    if (!currentUser) {
      console.log('No current user, skipping access check');
      setLoading(false);
      return;
    }

    try {
      console.log('Checking access status for user:', currentUser.id);
      const thesisId = thesis.thesis_id || thesis.id;
      
      if (!thesisId) {
        console.error('No thesis ID found');
        setAccessStatus('none');
        setLoading(false);
        return;
      }

      const userBorrowingStatus = await thesisService.getUserBorrowingStatus(currentUser.id, thesisId);
      console.log('User borrowing status:', userBorrowingStatus);
      
      setRequestData(userBorrowingStatus);
      
      if (userBorrowingStatus.status === 'approved' && !userBorrowingStatus.isExpired) {
        console.log('Access approved, setting up PDF');
        setAccessStatus('approved');
        // Don't auto-download, let user choose when to view
      } else if (userBorrowingStatus.status === 'approved' && userBorrowingStatus.isExpired) {
        console.log('Access expired');
        setAccessStatus('expired');
      } else if (userBorrowingStatus.status === 'pending') {
        console.log('Access pending');
        setAccessStatus('pending');
      } else if (userBorrowingStatus.status === 'denied') {
        console.log('Access denied');
        setAccessStatus('denied');
      } else {
        console.log('No access request found');
        setAccessStatus('none');
      }
    } catch (error) {
      console.error('Error checking access status:', error);
      setAccessStatus('none');
    } finally {
      setLoading(false);
    }
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission Required',
            message: 'This app needs access to your storage to download thesis files',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Permission error:', error);
        return false;
      }
    }
    return true; // iOS doesn't need this permission for app-specific directories
  };

  const downloadAndViewPdf = async () => {
    if (!thesis.file_url) {
      Alert.alert('Error', 'No PDF file available for this thesis.');
      return;
    }

    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Storage permission is required to download the thesis.');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setPdfLoadError(false);

    try {
      console.log('Starting PDF download:', thesis.file_url);
      
      // Get a secure URL for download
      let downloadUrl = thesis.file_url;
      
      // If it's a Supabase URL, try to get a signed URL
      if (thesis.file_url.includes('supabase.co')) {
        try {
          downloadUrl = await thesisService.getSecurePdfUrl(thesis.file_url);
          console.log('Using secure download URL');
        } catch (error) {
          console.log('Using original URL for download');
        }
      }

      // Create a safe filename
      const fileName = `thesis_${thesis.thesis_id || thesis.id}_${Date.now()}.pdf`;
      const dirs = RNFetchBlob.fs.dirs;
      const path = `${dirs.DocumentDir}/${fileName}`;

      // Download the file
      const result = await RNFetchBlob.config({
        fileCache: true,
        path: path,
        addAndroidDownloads: {
          useDownloadManager: false,
          notification: false,
          path: path,
          description: 'Downloading thesis PDF'
        }
      }).fetch('GET', downloadUrl, {
        // Add any required headers here
      });

      // Track download progress
      result.progress((received, total) => {
        const progress = (received / total) * 100;
        setDownloadProgress(Math.round(progress));
      });

      const response = await result;
      
      if (response.respInfo.status === 200) {
        console.log('PDF downloaded successfully:', response.path());
        setLocalPdfPath(response.path());
        setShowPdfViewer(true);
        
        // Record that user viewed the thesis
        await recordThesisView();
      } else {
        throw new Error(`Download failed with status: ${response.respInfo.status}`);
      }

    } catch (error) {
      console.error('PDF download error:', error);
      setPdfLoadError(true);
      Alert.alert(
        'Download Failed',
        'Could not download the thesis PDF. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const recordThesisView = async () => {
    try {
      if (currentUser && thesis.thesis_id) {
        await thesisService.recordThesisView(currentUser.id, thesis.thesis_id);
      }
    } catch (error) {
      console.error('Error recording thesis view:', error);
      // Don't show error to user as this is not critical
    }
  };

  const cleanupLocalFile = async () => {
    try {
      if (localPdfPath) {
        await RNFetchBlob.fs.unlink(localPdfPath);
        console.log('Cleaned up local PDF file');
        setLocalPdfPath(null);
      }
    } catch (error) {
      console.error('Error cleaning up local file:', error);
    }
  };

  const handleClosePdfViewer = () => {
    setShowPdfViewer(false);
    cleanupLocalFile();
  };

  const openPdfExternally = async () => {
    if (!localPdfPath) {
      Alert.alert('Error', 'PDF not available. Please download first.');
      return;
    }

    try {
      await FileViewer.open(localPdfPath, {
        showOpenWithDialog: true,
        showAppsSuggestions: true,
      });
    } catch (error) {
      console.error('Error opening PDF externally:', error);
      Alert.alert('Error', 'Could not open PDF. Make sure you have a PDF reader app installed.');
    }
  };

  // Enhanced security JavaScript for WebView
  const injectedJavaScript = `
    (function() {
      // Disable right-click context menu
      document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
      });
      
      // Disable text selection and copying
      document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
      });
      
      // Disable drag and drop
      document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
      });
      
      // Disable keyboard shortcuts
      document.addEventListener('keydown', function(e) {
        // Block Ctrl+S, Ctrl+P, Ctrl+C, Ctrl+A, Ctrl+Shift+I, F12
        if (e.ctrlKey && (e.keyCode === 83 || e.keyCode === 80 || e.keyCode === 67 || e.keyCode === 65 || e.keyCode === 73)) {
          e.preventDefault();
          return false;
        }
        
        // Block F12 and other function keys
        if ([123, 116, 117, 122].includes(e.keyCode)) {
          e.preventDefault();
          return false;
        }
      });
      
      // Remove download links and buttons periodically
      function removeDownloadElements() {
        const selectors = [
          '[class*="download"]',
          '[id*="download"]', 
          '[title*="Download"]',
          '[aria-label*="download"]',
          '[href*="download"]',
          'a[download]'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            el.style.display = 'none';
            el.remove();
          });
        });
      }
      
      // Run removal periodically
      setInterval(removeDownloadElements, 1000);
      
      // Prevent iframe embedding
      if (window !== window.top) {
        window.top.location = window.location;
      }
      
      // Add security overlay
      const style = document.createElement('style');
      style.textContent = \`
        body::before {
          content: "SECURE VIEW - DOWNLOADS DISABLED";
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(220, 53, 69, 0.9);
          color: white;
          padding: 5px 10px;
          font-size: 12px;
          font-weight: bold;
          border-radius: 4px;
          z-index: 9999;
          pointer-events: none;
        }
        
        /* Disable user selection */
        * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
      \`;
      document.head.appendChild(style);
      
      // Initial cleanup
      setTimeout(removeDownloadElements, 500);
    })();
    
    true;
  `;

  const handleRequestAccess = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please log in to request access.');
      return;
    }

    const thesisId = thesis.thesis_id || thesis.id;
    
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
        [{ text: 'OK' }]
      );
      setTimeout(() => checkAccessStatus(), 1000);
    } catch (error) {
      console.error('Error requesting access:', error);
      
      let errorMessage = 'Failed to submit request. Please try again.';
      if (error.message.includes('already have a pending request')) {
        errorMessage = 'You already have a pending request for this thesis. Please wait for administrator approval.';
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

    const thesisId = thesis.thesis_id || thesis.id;
    
    if (!thesisId) {
      Alert.alert('Error', 'Thesis ID not found. Cannot generate borrow QR.');
      return;
    }

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
      navigation.navigate('BorrowQR', { 
        qrData: qrInfo, 
        thesis: thesis,
        user: currentUser 
      });
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

  const getStatusMessage = () => {
    switch (accessStatus) {
      case 'approved':
        return {
          title: 'Access Granted',
          message: 'You can now view the full thesis.',
          color: '#28a745',
          icon: 'check-circle'
        };
      case 'pending':
        return {
          title: 'Pending Approval',
          message: 'Your access request is pending administrator approval.',
          color: '#ffc107',
          icon: 'clock'
        };
      case 'expired':
        return {
          title: 'Access Expired',
          message: 'Your access to this thesis has expired. Please request access again.',
          color: '#dc3545',
          icon: 'clock-alert'
        };
      case 'denied':
        return {
          title: 'Access Denied',
          message: 'Your access request was denied. Please contact administrator for more information.',
          color: '#dc3545',
          icon: 'cancel'
        };
      default:
        return {
          title: 'Access Required',
          message: 'You need to request access to view this thesis.',
          color: '#6c757d',
          icon: 'lock'
        };
    }
  };

  const statusInfo = getStatusMessage();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#dc3545" />
          <Text style={styles.loadingText}>Checking access permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Full Thesis View</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Security Warning */}
      <View style={styles.securityWarning}>
        <Icon name="shield-lock" size={16} color="#fff" />
        <Text style={styles.securityText}>Protected Content - Downloading & Screenshots are disabled</Text>
      </View>

      {/* Access Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: statusInfo.color }]}>
        <Icon name={statusInfo.icon} size={20} color="#FFFFFF" />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>{statusInfo.title}</Text>
          <Text style={styles.statusMessage}>{statusInfo.message}</Text>
        </View>
      </View>

      {/* PDF Viewer Modal */}
      <Modal
        visible={showPdfViewer}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleClosePdfViewer}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={handleClosePdfViewer}
            >
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Secure Thesis Viewer</Text>
            <TouchableOpacity 
              style={styles.externalViewButton}
              onPress={openPdfExternally}
            >
              <Icon name="open-in-app" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.securityStatus}>
            <Icon name="shield-check" size={16} color="#28a745" />
            <Text style={styles.securityStatusText}>Secure Local View - File will be deleted when closed</Text>
          </View>

          {localPdfPath && (
            <WebView
              ref={webViewRef}
              source={{ uri: `file://${localPdfPath}` }}
              style={styles.webview}
              injectedJavaScript={injectedJavaScript}
              javaScriptEnabled={true}
              domStorageEnabled={false}
              allowFileAccess={true}
              allowUniversalAccessFromFileURLs={false}
              allowFileAccessFromFileURLs={false}
              setBuiltInZoomControls={false}
              setDisplayZoomControls={false}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.pdfLoading}>
                  <ActivityIndicator size="large" color="#dc3545" />
                  <Text style={styles.pdfLoadingText}>Loading secure thesis document...</Text>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        <View style={styles.thesisContainer}>
          <Text style={styles.thesisTitle}>{thesis?.title || 'No Title Available'}</Text>
          
          {/* Thesis Metadata */}
          <View style={styles.metadataContainer}>
            <View key="author" style={styles.metadataItem}>
              <Icon name="account" size={16} color="#666" />
              <Text style={styles.metadataText}>Author: {thesis?.author || 'Unknown Author'}</Text>
            </View>
            <View key="college" style={styles.metadataItem}>
              <Icon name="school" size={16} color="#666" />
              <Text style={styles.metadataText}>College: {thesis?.college || 'Unknown College'}</Text>
            </View>
            <View key="batch" style={styles.metadataItem}>
              <Icon name="calendar" size={16} color="#666" />
              <Text style={styles.metadataText}>Batch: {thesis?.batch || thesis?.year || 'N/A'}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Abstract</Text>
          <ScrollView style={styles.abstractContainer}>
            <Text style={styles.abstractText}>
              {thesis?.abstract || thesis?.description || 'No abstract available for this thesis.'}
            </Text>
          </ScrollView>

          {/* Download Progress */}
          {isDownloading && (
            <View style={styles.downloadContainer}>
              <Text style={styles.downloadTitle}>Downloading Thesis...</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${downloadProgress}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{downloadProgress}%</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            {accessStatus === 'approved' ? (
              <>
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={downloadAndViewPdf}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Icon name="file-download" size={20} color="#FFFFFF" />
                  )}
                  <Text style={styles.viewButtonText}>
                    {isDownloading ? 'Downloading...' : 'Download & View Thesis'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.securityNote}>
                  <Icon name="shield-check" size={14} color="#28a745" />
                  {' '}Thesis will be downloaded securely and deleted when you close the viewer
                </Text>
              </>
            ) : accessStatus === 'pending' ? (
              <TouchableOpacity 
                style={[styles.requestButton, styles.buttonDisabled]}
                disabled={true}
              >
                <Icon name="clock" size={20} color="#FFFFFF" />
                <Text style={styles.requestButtonText}>Request Pending</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.requestButton}
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
            )}

            {/* Borrow Button - Only enabled when approved */}
            <TouchableOpacity 
              style={[
                styles.borrowButton, 
                (accessStatus !== 'approved' || loading) && styles.buttonDisabled
              ]}
              onPress={handleBorrow}
              disabled={accessStatus !== 'approved' || loading}
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

            {/* Request Status Info */}
            {requestData && (accessStatus === 'pending' || accessStatus === 'approved' || accessStatus === 'denied') && (
              <View style={styles.requestInfo}>
                <Text style={styles.requestInfoTitle}>Request Details:</Text>
                <Text style={styles.requestInfoText}>
                  Submitted: {new Date(requestData.request_date).toLocaleDateString()}
                </Text>
                <Text style={styles.requestInfoText}>
                  Status: {requestData.status.toUpperCase()}
                </Text>
                {accessStatus === 'approved' && requestData.expiryDate && (
                  <Text style={styles.requestInfoText}>
                    Expires: {new Date(requestData.expiryDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    shadowOffset: { width: 0, height: 4 },
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
  securityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#343a40',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  securityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  statusTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusMessage: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 80,
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  modalCloseButton: {
    padding: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  externalViewButton: {
    padding: 10,
  },
  securityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d4edda',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  securityStatusText: {
    color: '#155724',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  webview: {
    flex: 1,
  },
  pdfLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  pdfLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  thesisContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
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
  // Download Styles
  downloadContainer: {
    backgroundColor: '#e7f3ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0056b3',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#dee2e6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#0056b3',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonsContainer: {
    marginTop: 20,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 10,
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
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  securityNote: {
    fontSize: 12,
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  requestInfo: {
    backgroundColor: '#e9ecef',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  requestInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  requestInfoText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
});

export default FullViewThesisScreen;