// screens/SignupScreen.js
import React, { useState } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { authService } from '../services/authService';

const SignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    studentId: '',
    college: '',
    course: '',
    yearLevel: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const colleges = [
    'College of Arts and Sciences',
    'College of Business and Public Administration',
    'College of Education',
    'College of Engineering',
    'College of Information and Communications Technology'
  ];

  const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Please enter your full name');
      return false;
    }
    if (!formData.username.trim()) {
      setError('Please enter a username');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return false;
    }
    if (!formData.studentId.trim()) {
      setError('Please enter your student ID');
      return false;
    }
    if (!formData.college) {
      setError('Please select your college');
      return false;
    }
    if (!formData.course.trim()) {
      setError('Please enter your course/program');
      return false;
    }
    if (!formData.yearLevel) {
      setError('Please select your year level');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      await authService.registerUser(formData);
      
      setSuccess('Account created successfully! Redirecting to login...');
      
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);

    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
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
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Signup Card */}
            <View style={styles.signupCard}>
              {/* Header with Logo */}
              <View style={styles.cardHeader}>
                <Image 
                  source={require('../assets/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={styles.cardTitle}>Student Registration</Text>
                <Text style={styles.cardSubtitle}>
                  Create your Thesis Hub account to access research materials
                </Text>
              </View>

              {/* Signup Form */}
              <View style={styles.form}>
                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {success ? (
                  <View style={styles.successContainer}>
                    <Text style={styles.successText}>{success}</Text>
                  </View>
                ) : null}

                {/* Personal Information */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="account" size={20} color="#DC2626" />
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                  </View>
                  
                  <View style={styles.grid}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Full Name *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your full name"
                        placeholderTextColor="#9CA3AF"
                        value={formData.fullName}
                        onChangeText={(value) => handleInputChange('fullName', value)}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Username *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Choose a username"
                        placeholderTextColor="#9CA3AF"
                        value={formData.username}
                        onChangeText={(value) => handleInputChange('username', value)}
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Email Address *</Text>
                      <View style={styles.inputWrapper}>
                        <Icon name="email" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="your.email@cnsc.edu.ph"
                          placeholderTextColor="#9CA3AF"
                          value={formData.email}
                          onChangeText={(value) => handleInputChange('email', value)}
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
                          placeholder="+63 912 345 6789"
                          placeholderTextColor="#9CA3AF"
                          value={formData.phone}
                          onChangeText={(value) => handleInputChange('phone', value)}
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* Academic Information */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="book-open" size={20} color="#DC2626" />
                    <Text style={styles.sectionTitle}>Academic Information</Text>
                  </View>
                  
                  <View style={styles.grid}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Student ID *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., 2023-00123"
                        placeholderTextColor="#9CA3AF"
                        value={formData.studentId}
                        onChangeText={(value) => handleInputChange('studentId', value)}
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>College *</Text>
                      <View style={styles.inputWrapper}>
                        <Icon name="school" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Select College"
                          placeholderTextColor="#9CA3AF"
                          value={formData.college}
                          onChangeText={(value) => handleInputChange('college', value)}
                        />
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Course/Program *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., Bachelor of Science in Information Technology"
                        placeholderTextColor="#9CA3AF"
                        value={formData.course}
                        onChangeText={(value) => handleInputChange('course', value)}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Year Level *</Text>
                      <View style={styles.inputWrapper}>
                        <Icon name="calendar" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Select Year Level"
                          placeholderTextColor="#9CA3AF"
                          value={formData.yearLevel}
                          onChangeText={(value) => handleInputChange('yearLevel', value)}
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* Password */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="shield-account" size={20} color="#DC2626" />
                    <Text style={styles.sectionTitle}>Security</Text>
                  </View>
                  
                  <View style={styles.grid}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Password *</Text>
                      <View style={styles.inputWrapper}>
                        <Icon name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="At least 6 characters"
                          placeholderTextColor="#9CA3AF"
                          value={formData.password}
                          onChangeText={(value) => handleInputChange('password', value)}
                          secureTextEntry={!showPassword}
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

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Confirm Password *</Text>
                      <View style={styles.inputWrapper}>
                        <Icon name="lock-check" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Confirm your password"
                          placeholderTextColor="#9CA3AF"
                          value={formData.confirmPassword}
                          onChangeText={(value) => handleInputChange('confirmPassword', value)}
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
                  </View>
                </View>

                {/* Terms and Conditions */}
                <View style={styles.termsContainer}>
                  <TouchableOpacity 
                    style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
                    onPress={() => setAgreedToTerms(!agreedToTerms)}
                  >
                    {agreedToTerms && <Icon name="check" size={14} color="#FFFFFF" />}
                  </TouchableOpacity>
                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text style={styles.termsLink}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.signupButton,
                    loading && styles.buttonDisabled
                  ]}
                  onPress={handleSignup}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Icon name="account-plus" size={20} color="#FFFFFF" />
                  )}
                  <Text style={styles.signupButtonText}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Text>
                </TouchableOpacity>

                {/* Login Link */}
                <View style={styles.linkContainer}>
                  <Text style={styles.linkText}>
                    Already have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.link}>Sign in here</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Features - Only Access Research Papers */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Icon name="book-open" size={24} color="#FFFFFF" />
                <Text style={styles.featureText}>Access Research Papers</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  signupCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
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
    marginBottom: 24,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  successText: {
    color: '#166534',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  grid: {
    gap: 16,
  },
  inputContainer: {
    width: '100%',
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
    width: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    paddingLeft: 40,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#374151',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    padding: 8,
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
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  termsText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    color: '#DC2626',
    fontWeight: '600',
  },
  signupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
  featuresContainer: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default SignupScreen;