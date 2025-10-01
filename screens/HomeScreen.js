// screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  Modal,
  Animated,
  ImageBackground,
  Image,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { thesisService } from '../services/thesisService';

const HomeScreen = ({ navigation, onLogout }) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-300));
  const [currentUser, setCurrentUser] = useState(null);
  const [recentTheses, setRecentTheses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadRecentTheses();
    }
  }, [currentUser]);

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

  const loadRecentTheses = async () => {
    try {
      setLoading(true);
      const recentScanned = await thesisService.getRecentScannedTheses(currentUser.id);
      
      const formattedTheses = recentScanned.map(item => ({
        id: item.thesestwo.thesis_id,
        title: item.thesestwo.title,
        url: item.thesestwo.qr_code_url || 'No URL available',
        scannedAt: item.scanned_at
      }));
      
      setRecentTheses(formattedTheses);
    } catch (error) {
      console.error('Error loading recent theses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThesisPress = async (thesis) => {
    try {
      const fullThesis = await thesisService.getThesisById(thesis.id);
      navigation.navigate('Viewing', { thesis: fullThesis });
    } catch (error) {
      console.error('Error loading thesis details:', error);
    }
  };

  const toggleMenu = () => {
    if (isMenuVisible) {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsMenuVisible(false));
    } else {
      setIsMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      
      // Check if onLogout prop exists, if not use navigation as fallback
      if (onLogout) {
        onLogout();
      } else {
        // Fallback: navigate to Login if onLogout prop is not provided
        console.warn('onLogout prop not provided, using navigation fallback');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleNavigation = (screen) => {
    toggleMenu();
    if (screen === 'Profile') {
      navigation.navigate('Profile');
    } else if (screen === 'AccountSettings') {
      navigation.navigate('AccountSettings');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground 
        source={require('../assets/origbg1.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Header with Hamburger Menu and Logo */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
            <Icon name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/logo-small.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>Homepage</Text>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>

        {/* Mobile Navigation Menu Modal */}
        <Modal
          visible={isMenuVisible}
          transparent={true}
          animationType="none"
          onRequestClose={toggleMenu}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={toggleMenu}
          >
            <Animated.View 
              style={[
                styles.mobileMenu,
                {
                  transform: [{ translateX: slideAnim }]
                }
              ]}
            >
              <View style={styles.menuHeader}>
                <Image 
                  source={require('../assets/logo-small.png')} 
                  style={styles.menuLogo}
                  resizeMode="contain"
                />
                <Text style={styles.menuTitle}>Navigation</Text>
                <TouchableOpacity onPress={toggleMenu} style={styles.closeButton}>
                  <Icon name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.menuItems}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleNavigation('Home')}
                >
                  <Icon name="home" size={20} color="#333" />
                  <Text style={styles.menuItemText}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleNavigation('Profile')}
                >
                  <Icon name="account" size={20} color="#333" />
                  <Text style={styles.menuItemText}>Profile</Text>
                </TouchableOpacity>

                {/* Add Account Settings to the menu */}
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleNavigation('AccountSettings')}
                >
                  <Icon name="cog" size={20} color="#333" />
                  <Text style={styles.menuItemText}>Account Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, styles.logoutButton]}
                  onPress={handleLogout}
                >
                  <Icon name="logout" size={20} color="#FFFFFF" />
                  <Text style={[styles.menuItemText, styles.logoutText]}>Log out</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        {/* Main Content */}
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.userName}>{currentUser?.fullName || 'Student'}</Text>
            <Text style={styles.welcomeSubtitle}>Access your research papers and scan QR codes</Text>
          </View>

          {/* QR Scan Button */}
          <TouchableOpacity 
            style={styles.qrButton}
            onPress={() => navigation.navigate('QRScanner')}
          >
            <View style={styles.qrButtonContent}>
              <Icon name="qrcode-scan" size={24} color="#dc3545" />
              <Text style={styles.qrButtonText}>Scan QR Code</Text>
            </View>
          </TouchableOpacity>

          {/* Recent Section */}
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.recentTitle}>Recently Scanned</Text>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#dc3545" />
                <Text style={styles.loadingText}>Loading recent scans...</Text>
              </View>
            ) : (
              <View style={styles.recentList}>
                {recentTheses.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="book-open" size={40} color="#999" />
                    <Text style={styles.emptyStateText}>No recent scans</Text>
                    <Text style={styles.emptyStateSubtext}>Scan QR codes to see them here</Text>
                  </View>
                ) : (
                  recentTheses.map((thesis, index) => (
                    <TouchableOpacity 
                      key={thesis.id}
                      style={styles.thesisItem}
                      onPress={() => handleThesisPress(thesis)}
                    >
                      <View style={styles.thesisNumber}>
                        <Text style={styles.thesisNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.thesisContent}>
                        <Text style={styles.thesisTitle} numberOfLines={2}>
                          {thesis.title}
                        </Text>
                        <Text style={styles.thesisUrl} numberOfLines={1}>
                          {thesis.url}
                        </Text>
                      </View>
                      <View style={styles.arrowContainer}>
                        <Icon name="chevron-right" size={20} color="#dc3545" />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 80,
    backgroundColor: 'rgba(220, 53, 69, 0.95)',
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
  menuButton: {
    padding: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  mobileMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#dc3545',
  },
  menuLogo: {
    width: 25,
    height: 25,
    marginRight: 10,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  menuItems: {
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    marginHorizontal: 20,
    justifyContent: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 25,
    borderRadius: 20,
    marginBottom: 25,
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
  welcomeText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#333',
    marginBottom: 5,
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  qrButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 20,
    borderRadius: 15,
    marginBottom: 30,
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
  qrButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrButtonText: {
    color: '#dc3545',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  recentSection: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  recentTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  recentList: {
    marginBottom: 10,
  },
  thesisItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1.84,
    elevation: 2,
  },
  thesisNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  thesisNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  thesisContent: {
    flex: 1,
  },
  thesisTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
    lineHeight: 18,
  },
  thesisUrl: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  arrowContainer: {
    marginLeft: 10,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default HomeScreen;