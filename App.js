import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import ViewingScreen from './screens/ViewingScreen';
import ProfileScreen from './screens/ProfileScreen';
import AccountSettingsScreen from './screens/AccountSettingsScreen';
import { ActivityIndicator, View } from 'react-native';
import FullViewThesisScreen from './screens/FullViewThesisScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      setIsAuthenticated(!!userData);
    } catch (error) {
      console.error('Error checking authentication:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{
          headerShown: false
        }}
      >
        {isAuthenticated ? (
          // Authenticated screens - ALL screens need onLogout prop
          <>
            <Stack.Screen name="Home">
              {(props) => (
                <HomeScreen 
                  {...props} 
                  onLogout={handleLogout} 
                />
              )}
            </Stack.Screen>
            <Stack.Screen 
              name="QRScanner" 
              component={QRScannerScreen}
              options={{ 
                headerShown: true,
                title: 'Scan QR Code',
                headerStyle: { backgroundColor: '#000' },
                headerTintColor: '#fff'
              }}
            />
            <Stack.Screen 
              name="Viewing" 
              component={ViewingScreen}
              options={{ 
                headerShown: false,
                title: 'Thesis Details'
              }}
            />
            <Stack.Screen name="Profile">
              {(props) => (
                <ProfileScreen 
                  {...props} 
                  onLogout={handleLogout} 
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="AccountSettings">
              {(props) => (
                <AccountSettingsScreen 
                  {...props} 
                  onLogout={handleLogout} 
                />
              )}
            </Stack.Screen>

            <Stack.Screen 
              name="FullViewThesisScreen" 
              component={FullViewThesisScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // Authentication screens
          <>
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
            <Stack.Screen 
              name="Signup" 
              component={SignupScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;