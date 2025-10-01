// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  ImageBackground,
  ActivityIndicator,
  Modal,
  Animated,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const ProfileScreen = ({ navigation, onLogout }) => {
  const [user, setUser] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [stats, setStats] = useState({
    papersViewed: 0,
    downloads: 0,
    bookmarks: 0
  });
  const [loading, setLoading] = useState(true);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-300));

  useEffect(() => {
    fetchUserData();
    fetchRecentActivities();
  }, []);

  const fetchUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUser(user);
        
        const { data: userDataFromDb } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userDataFromDb) {
          setUser(userDataFromDb);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      
      const { data: activities } = await supabase
        .from('scanned_theses')
        .select(`
          scanned_at,
          thesestwo (
            title
          )
        `)
        .eq('user_id', user.id)
        .order('scanned_at', { ascending: false })
        .limit(5);

      if (activities) {
        const formattedActivities = activities.map((activity, index) => ({
          id: index + 1,
          thesisTitle: activity.thesestwo?.title || 'Unknown Thesis',
          action: 'Viewed',
          time: new Date(activity.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(activity.scanned_at).toLocaleDateString()
        }));
        setRecentActivities(formattedActivities);
      }

      const { count: viewedCount } = await supabase
        .from('scanned_theses')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      setStats({
        papersViewed: viewedCount || 0,
        downloads: 0,
        bookmarks: 0
      });

    } catch (error) {
      console.error('Error fetching activities:', error);
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
    if (screen === 'Home') {
      navigation.navigate('Home');
    } else if (screen === 'Profile') {
      navigation.navigate('Profile');
    } else if (screen === 'AccountSettings') {
      navigation.navigate('AccountSettings');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ImageBackground 
          source={require('../assets/origbg1.png')} 
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </ImageBackground>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.headerTitle}>Profile</Text>
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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Header Section */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
            <Text style={styles.college}>{user?.college || 'No college specified'}</Text>
            <Text style={styles.course}>{user?.course || 'No course specified'}</Text>
            <Text style={styles.studentId}>Student ID: {user?.student_id || 'N/A'}</Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsCard}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('QRScanner')}
              >
                <Icon name="qrcode-scan" size={24} color="#dc3545" />
                <Text style={styles.actionText}>Scan QR</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('AccountSettings')}
              >
                <Icon name="account-edit" size={24} color="#dc3545" />
                <Text style={styles.actionText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Home')}
              >
                <Icon name="home" size={24} color="#dc3545" />
                <Text style={styles.actionText}>Home</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.papersViewed}</Text>
              <Text style={styles.statLabel}>Papers Viewed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.downloads}</Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.bookmarks}</Text>
              <Text style={styles.statLabel}>Bookmarks</Text>
            </View>
          </View>

          {/* Recent Activities Section */}
          <View style={styles.recentActivities}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            
            {recentActivities.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="history" size={40} color="#999" />
                <Text style={styles.emptyStateText}>No recent activities</Text>
                <Text style={styles.emptyStateSubtext}>Scan QR codes to see them here</Text>
              </View>
            ) : (
              recentActivities.map((activity) => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityAction}>{activity.action}</Text>
                    <View style={styles.activityTime}>
                      <Text style={styles.timeText}>{activity.time}</Text>
                      <Text style={styles.dateText}>{activity.date}</Text>
                    </View>
                  </View>
                  <Text style={styles.activityThesis} numberOfLines={2}>
                    {activity.thesisTitle}
                  </Text>
                </View>
              ))
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
    shadowOffset: { width: 0, height: 4 },
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
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 25,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5.84,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  college: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  course: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  studentId: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  actionsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5.84,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5.84,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  recentActivities: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5.84,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  activityCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc3545',
    backgroundColor: '#ffe6e6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activityTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  dateText: {
    fontSize: 11,
    color: '#666',
  },
  activityThesis: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
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

export default ProfileScreen;