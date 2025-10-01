// screens/AccountSettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  ImageBackground,
  Animated,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const AccountSettingsScreen = ({ navigation, onLogout }) => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    student_id: '',
    college: '',
    course: '',
    year_level: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    weekly_recommendations: true,
    thesis_reminders: true
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-300));

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        Alert.alert('Error', 'Please log in to access account settings');
        navigation.navigate('Login');
        return;
      }

      const currentUser = JSON.parse(userData);
      setUser(currentUser);

      const { data: userDataFromDb, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        throw error;
      }

      if (!userDataFromDb) {
        Alert.alert('Error', 'User not found');
        navigation.navigate('Login');
        return;
      }

      setFormData({
        username: userDataFromDb.username || '',
        full_name: userDataFromDb.full_name || '',
        email: userDataFromDb.email || '',
        phone: userDataFromDb.phone || '',
        student_id: userDataFromDb.student_id || '',
        college: userDataFromDb.college || '',
        course: userDataFromDb.course || '',
        year_level: userDataFromDb.year_level || ''
      });

      const savedPreferences = await AsyncStorage.getItem(`user_preferences_${currentUser.id}`);
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameAvailability = async (username) => {
    if (!username || username === user?.username) {
      setUsernameAvailable(true);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .neq('id', user?.id)
        .single();

      setUsernameAvailable(!data);
    } catch (error) {
      setUsernameAvailable(true);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });

    if (field === 'username') {
      checkUsernameAvailability(value);
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData({
      ...passwordData,
      [field]: value
    });
  };

  const handlePreferenceChange = (preference) => {
    setPreferences(prev => ({
      ...prev,
      [preference]: !prev[preference]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    if (!formData.username.trim()) {
      setError('Username is required');
      setSaving(false);
      return;
    }

    if (!usernameAvailable) {
      setError('Username is already taken. Please choose a different one.');
      setSaving(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          college: formData.college,
          course: formData.course,
          year_level: formData.year_level,
        })
        .eq('id', user.id)
        .select();

      if (error) throw error;

      const updatedUser = {
        ...user,
        username: formData.username,
        full_name: formData.full_name,
        email: formData.email
      };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      await AsyncStorage.setItem(`user_preferences_${user.id}`, JSON.stringify(preferences));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    setError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    try {
      const { data: userData, error: verifyError } = await supabase
        .from('users')
        .select('password')
        .eq('id', user.id)
        .single();

      if (verifyError) throw verifyError;

      if (userData.password !== passwordData.currentPassword) {
        setError('Current password is incorrect');
        return;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          password: passwordData.newPassword,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setPasswordSaved(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);

      setTimeout(() => setPasswordSaved(false), 3000);

    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password. Please try again.');
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
            <Text style={styles.loadingText}>Loading your profile...</Text>
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
            <Text style={styles.headerTitle}>Account Settings</Text>
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
          {error ? (
            <View style={styles.errorContainer}>
              <Icon name="alert-octagon" size={20} color="#DC2626" style={styles.errorIcon} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {saved && (
            <View style={styles.successContainer}>
              <Icon name="check-circle" size={20} color="#166534" style={styles.successIcon} />
              <Text style={styles.successText}>✓ Profile updated successfully!</Text>
            </View>
          )}

          {passwordSaved && (
            <View style={styles.successContainer}>
              <Icon name="check-circle" size={20} color="#166534" style={styles.successIcon} />
              <Text style={styles.successText}>✓ Password updated successfully!</Text>
            </View>
          )}

          {/* Personal Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="account" size={20} color="#dc3545" />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            
            <View style={styles.formGrid}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username *</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="account" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input,
                      !usernameAvailable && formData.username !== user?.username && styles.inputError
                    ]}
                    value={formData.username}
                    onChangeText={(value) => handleInputChange('username', value)}
                    placeholder="Choose a username"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                {checkingUsername && (
                  <Text style={styles.helperText}>Checking username availability...</Text>
                )}
                {!usernameAvailable && formData.username !== user?.username && (
                  <Text style={styles.errorHelperText}>Username is already taken</Text>
                )}
                {usernameAvailable && formData.username && formData.username !== user?.username && (
                  <Text style={styles.successHelperText}>Username is available</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.full_name}
                  onChangeText={(value) => handleInputChange('full_name', value)}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address *</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="email" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    placeholder="your.email@cnsc.edu.ph"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="phone" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(value) => handleInputChange('phone', value)}
                    placeholder="+63 912 345 6789"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Student ID *</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={formData.student_id}
                  editable={false}
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.helperText}>Student ID cannot be changed</Text>
              </View>
            </View>
          </View>

          {/* Academic Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="book-open" size={20} color="#dc3545" />
              <Text style={styles.sectionTitle}>Academic Information</Text>
            </View>
            
            <View style={styles.formGrid}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>College *</Text>
                <View style={styles.selectWrapper}>
                  <TextInput
                    style={styles.input}
                    value={formData.college}
                    onChangeText={(value) => handleInputChange('college', value)}
                    placeholder="Select College"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Course/Program *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.course}
                  onChangeText={(value) => handleInputChange('course', value)}
                  placeholder="e.g., Bachelor of Science in Information Technology"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Year Level *</Text>
                <View style={styles.selectWrapper}>
                  <TextInput
                    style={styles.input}
                    value={formData.year_level}
                    onChangeText={(value) => handleInputChange('year_level', value)}
                    placeholder="Select Year Level"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="bell" size={20} color="#dc3545" />
              <Text style={styles.sectionTitle}>Preferences</Text>
            </View>
            
            <View style={styles.preferencesContainer}>
              <TouchableOpacity 
                style={styles.preferenceItem}
                onPress={() => handlePreferenceChange('email_notifications')}
              >
                <View style={[
                  styles.checkbox,
                  preferences.email_notifications && styles.checkboxChecked
                ]}>
                  {preferences.email_notifications && (
                    <Icon name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.preferenceText}>Email notifications for request updates</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.preferenceItem}
                onPress={() => handlePreferenceChange('weekly_recommendations')}
              >
                <View style={[
                  styles.checkbox,
                  preferences.weekly_recommendations && styles.checkboxChecked
                ]}>
                  {preferences.weekly_recommendations && (
                    <Icon name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.preferenceText}>Weekly research recommendations</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.preferenceItem}
                onPress={() => handlePreferenceChange('thesis_reminders')}
              >
                <View style={[
                  styles.checkbox,
                  preferences.thesis_reminders && styles.checkboxChecked
                ]}>
                  {preferences.thesis_reminders && (
                    <Icon name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.preferenceText}>Thesis access reminders</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Security */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="shield-account" size={20} color="#dc3545" />
              <Text style={styles.sectionTitle}>Security</Text>
            </View>
            
            <View style={styles.securityContainer}>
              <TouchableOpacity 
                style={styles.changePasswordButton}
                onPress={() => setShowPasswordForm(!showPasswordForm)}
              >
                <Text style={styles.changePasswordText}>Change Password</Text>
              </TouchableOpacity>

              {showPasswordForm && (
                <View style={styles.passwordForm}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Current Password</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={passwordData.currentPassword}
                        onChangeText={(value) => handlePasswordChange('currentPassword', value)}
                        placeholder="Enter current password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!showCurrentPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={styles.eyeButton}
                      >
                        <Icon 
                          name={showCurrentPassword ? "eye-off" : "eye"} 
                          size={20} 
                          color="#9CA3AF" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={passwordData.newPassword}
                        onChangeText={(value) => handlePasswordChange('newPassword', value)}
                        placeholder="Enter new password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!showNewPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        style={styles.eyeButton}
                      >
                        <Icon 
                          name={showNewPassword ? "eye-off" : "eye"} 
                          size={20} 
                          color="#9CA3AF" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="lock-check" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={passwordData.confirmPassword}
                        onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
                        placeholder="Confirm new password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!showConfirmPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeButton}
                      >
                        <Icon 
                          name={showConfirmPassword ? "eye-off" : "eye"} 
                          size={20} 
                          color="#9CA3AF" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.passwordActions}>
                    <TouchableOpacity 
                      style={styles.updatePasswordButton}
                      onPress={handlePasswordUpdate}
                    >
                      <Text style={styles.updatePasswordText}>Update Password</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.cancelPasswordButton}
                      onPress={() => setShowPasswordForm(false)}
                    >
                      <Text style={styles.cancelPasswordText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.accountInfo}>
                <Text style={styles.accountInfoText}>
                  Account created: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, (saving || !usernameAvailable || checkingUsername) && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving || !usernameAvailable || checkingUsername}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Icon name="content-save" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 14,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  successIcon: {
    marginRight: 8,
  },
  successText: {
    flex: 1,
    color: '#166534',
    fontSize: 14,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5.84,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  formGrid: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    paddingLeft: 40,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#374151',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  selectWrapper: {
    width: '100%',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  errorHelperText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  successHelperText: {
    fontSize: 12,
    color: '#166534',
    marginTop: 4,
  },
  preferencesContainer: {
    gap: 12,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  preferenceText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  securityContainer: {
    gap: 16,
  },
  changePasswordButton: {
    paddingVertical: 12,
  },
  changePasswordText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordForm: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  passwordActions: {
    flexDirection: 'row',
    gap: 12,
  },
  updatePasswordButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  updatePasswordText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelPasswordButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  cancelPasswordText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  accountInfo: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  accountInfoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AccountSettingsScreen;