import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ImageBackground,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { authService } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [success, setSuccess] = useState('');
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      setIsCheckingUser(true);
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        setError(`You are currently logged in as ${user.fullName}. Please log out first or enter your password to continue.`);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    } finally {
      setIsCheckingUser(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    if (!username || !password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    try {
      const user = await authService.loginUser(username, password);
      
      // Store user data
      await AsyncStorage.setItem('user', JSON.stringify(user));
      setCurrentUser(user);
      
      setSuccess('Login successful!');
      
      // Call the parent's login handler instead of navigating directly
      setTimeout(() => {
        if (onLogin) {
          onLogin();
        }
      }, 1000);

    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReauthenticate = async () => {
    if (!currentUser || !password) {
      setError('Please enter your password to continue');
      return;
    }

    setLoading(true);
    try {
      // Verify the password for the current user
      const user = await authService.loginUser(currentUser.username, password);
      
      // Password is correct, proceed to home
      setSuccess('Authentication successful!');
      
      setTimeout(() => {
        if (onLogin) {
          onLogin();
        }
      }, 1000);

    } catch (err) {
      setError('Invalid password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setCurrentUser(null);
      setUsername('');
      setPassword('');
      setError('');
      setSuccess('Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      setError('Error during logout');
    }
  };

  // Show loading while checking user status
  if (isCheckingUser) {
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
            <Text style={styles.loadingText}>Checking authentication...</Text>
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
        {/* Main Content */}
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            {/* Login Card */}
            <View style={styles.loginCard}>
              {/* Header with Logo */}
              <View style={styles.cardHeader}>
                <Image 
                  source={require('../assets/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={styles.cardTitle}>
                  {currentUser ? 'Welcome Back' : 'Student Login'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {currentUser 
                    ? `Continue as ${currentUser.fullName}`
                    : 'Access your Thesis Hub account'
                  }
                </Text>
              </View>

              {/* Login Form */}
              <View style={styles.form}>
                {error ? (
                  <View style={[
                    styles.errorContainer,
                    currentUser && styles.warningContainer
                  ]}>
                    <Icon 
                      name={currentUser ? "alert-circle" : "alert-octagon"} 
                      size={20} 
                      color={currentUser ? "#D97706" : "#DC2626"} 
                      style={styles.errorIcon}
                    />
                    <Text style={[
                      styles.errorText,
                      currentUser && styles.warningText
                    ]}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                {success ? (
                  <View style={styles.successContainer}>
                    <Icon name="check-circle" size={20} color="#166534" style={styles.successIcon} />
                    <Text style={styles.successText}>{success}</Text>
                  </View>
                ) : null}

                {/* Username Field - Only show if not already logged in */}
                {!currentUser && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Username</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="account" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your username"
                        placeholderTextColor="#9CA3AF"
                        value={username}
                        onChangeText={setUsername}
                        editable={!loading}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                )}

                {/* Password Field - Always show */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {currentUser ? 'Enter Password to Continue' : 'Password'}
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={currentUser ? "Enter your password" : "Enter your password"}
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Icon 
                        name={showPassword ? "eye-off" : "eye"} 
                        size={20} 
                        color="#9CA3AF" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action Buttons */}
                {currentUser ? (
                  // User is already logged in - show reauthentication options
                  <View style={styles.authButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.continueButton, loading && styles.buttonDisabled]}
                      onPress={handleReauthenticate}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Icon name="lock-open" size={20} color="#FFFFFF" />
                      )}
                      <Text style={styles.continueButtonText}>
                        {loading ? 'Verifying...' : 'Continue with Password'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.logoutButton}
                      onPress={handleLogout}
                      disabled={loading}
                    >
                      <Icon name="logout" size={20} color="#6B7280" />
                      <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // User is not logged in - show normal login
                  <View>
                    <TouchableOpacity
                      style={[styles.loginButton, loading && styles.buttonDisabled]}
                      onPress={handleLogin}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Icon name="login" size={20} color="#FFFFFF" />
                      )}
                      <Text style={styles.loginButtonText}>
                        {loading ? 'Signing In...' : 'Sign In'}
                      </Text>
                    </TouchableOpacity>

                    {/* Signup Link */}
                    <View style={styles.linkContainer}>
                      <Text style={styles.linkText}>
                        Don't have an account?{' '}
                      </Text>
                      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                        <Text style={styles.link}>Create account</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
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
  loginCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  warningContainer: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 14,
  },
  warningText: {
    color: '#D97706',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  successIcon: {
    marginRight: 8,
  },
  successText: {
    flex: 1,
    color: '#166534',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 24,
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
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  authButtonsContainer: {
    gap: 12,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  quickContinueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: 8,
    padding: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickContinueButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  linkText: {
    color: '#6B7280',
    fontSize: 14,
  },
  link: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;