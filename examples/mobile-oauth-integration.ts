/**
 * Mobile OAuth Integration Examples
 * 
 * This file provides complete examples for integrating Google and Apple Sign In
 * with your mobile application using the unified OAuth endpoint.
 */

// ============================================================================
// REACT NATIVE - GOOGLE SIGN IN INTEGRATION
// ============================================================================

/*
1. Install Google Sign In for React Native:
   npm install @react-native-google-signin/google-signin

2. Configure iOS (ios/YourApp/Info.plist):
   Add your REVERSED_CLIENT_ID from GoogleService-Info.plist

3. Configure Android (android/app/build.gradle):
   Add google-services.json to android/app/
*/

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure Google Sign In
GoogleSignin.configure({
    webClientId: 'YOUR_GOOGLE_CLIENT_ID.googleusercontent.com', // From Google Cloud Console
    offlineAccess: true,
});

// Google Sign In Function
export const signInWithGoogle = async () => {
    try {
        // Check if device supports Google Play Services
        await GoogleSignin.hasPlayServices();

        // Sign in and get user info
        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.idToken;

        if (!idToken) {
            throw new Error('No ID token received from Google');
        }

        // Send to your backend
        const response = await fetch('http://localhost:3000/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idToken: idToken,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            // Store the session token
            await AsyncStorage.setItem('auth_token', data.token);
            await AsyncStorage.setItem('user_data', JSON.stringify(data.user));

            console.log('Google Sign In successful:', data.user);
            return data.user;
        } else {
            throw new Error(data.error || 'Google Sign In failed');
        }

    } catch (error) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            console.log('User cancelled Google Sign In');
        } else if (error.code === statusCodes.IN_PROGRESS) {
            console.log('Google Sign In is in progress');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            console.log('Google Play Services not available');
        } else {
            console.error('Google Sign In error:', error);
        }
        throw error;
    }
};

// ============================================================================
// REACT NATIVE - APPLE SIGN IN INTEGRATION
// ============================================================================

/*
1. Install Apple Sign In for React Native:
   npm install @invertase/react-native-apple-authentication

2. Configure iOS capabilities:
   - Enable "Sign In with Apple" in your Apple Developer account
   - Add Sign In with Apple capability in Xcode

3. Apple Sign In is iOS only - add platform checks
*/

import appleAuth, {
    AppleAuthRequestOperation,
    AppleAuthRequestScope,
    AppleAuthCredentialState,
} from '@invertase/react-native-apple-authentication';

// Apple Sign In Function
export const signInWithApple = async () => {
    try {
        // Perform Apple Sign In request
        const appleAuthRequestResponse = await appleAuth.performRequest({
            requestedOperation: AppleAuthRequestOperation.LOGIN,
            requestedScopes: [AppleAuthRequestScope.EMAIL, AppleAuthRequestScope.FULL_NAME],
        });

        const { identityToken, fullName, email } = appleAuthRequestResponse;

        if (!identityToken) {
            throw new Error('No identity token received from Apple');
        }

        // Prepare user info (Apple provides this only on first sign-in)
        const userInfo = fullName ? {
            name: {
                firstName: fullName.givenName,
                lastName: fullName.familyName,
            },
            email: email,
        } : undefined;

        // Send to your backend
        const response = await fetch('http://localhost:3000/auth/apple', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idToken: identityToken,
                user: userInfo, // Include user info for first-time sign-in
            }),
        });

        const data = await response.json();

        if (response.ok) {
            // Store the session token
            await AsyncStorage.setItem('auth_token', data.token);
            await AsyncStorage.setItem('user_data', JSON.stringify(data.user));

            console.log('Apple Sign In successful:', data.user);
            return data.user;
        } else {
            throw new Error(data.error || 'Apple Sign In failed');
        }

    } catch (error) {
        console.error('Apple Sign In error:', error);
        throw error;
    }
};

// Check Apple Sign In availability
export const isAppleSignInAvailable = async () => {
    return await appleAuth.isSupported;
};

// ============================================================================
// UNIFIED AUTHENTICATION HELPERS
// ============================================================================

// Generic OAuth sign in function
export const signInWithProvider = async (provider: 'google' | 'apple') => {
    switch (provider) {
        case 'google':
            return await signInWithGoogle();
        case 'apple':
            return await signInWithApple();
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
};

// Get current user from stored token
export const getCurrentUser = async () => {
    try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) return null;

        const response = await fetch('http://localhost:3000/v1/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            return data.user;
        } else {
            // Token might be expired, clear it
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('user_data');
            return null;
        }
    } catch (error) {
        console.error('Get current user error:', error);
        return null;
    }
};

// Sign out function
export const signOut = async () => {
    try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) return;

        // Sign out from backend
        await fetch('http://localhost:3000/auth/sign-out', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        // Sign out from Google
        try {
            await GoogleSignin.signOut();
        } catch (error) {
            console.log('Google sign out error (might not be signed in):', error);
        }

        // Clear stored data
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_data');

        console.log('Sign out successful');
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
};

// Make authenticated API calls
export const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
        throw new Error('No authentication token found');
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
        },
    });

    if (response.status === 401) {
        // Token expired, clear auth data
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_data');
        throw new Error('Authentication token expired');
    }

    return response;
};

// ============================================================================
// REACT NATIVE COMPONENT EXAMPLE
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert } from 'react-native';

export const AuthComponent = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if user is already signed in
        getCurrentUser().then(setUser);
    }, []);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const userData = await signInWithGoogle();
            setUser(userData);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAppleSignIn = async () => {
        if (Platform.OS !== 'ios') {
            Alert.alert('Error', 'Apple Sign In is only available on iOS');
            return;
        }

        const available = await isAppleSignInAvailable();
        if (!available) {
            Alert.alert('Error', 'Apple Sign In is not available on this device');
            return;
        }

        setLoading(true);
        try {
            const userData = await signInWithApple();
            setUser(userData);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        setLoading(true);
        try {
            await signOut();
            setUser(null);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    if (user) {
        return (
            <View style= {{ padding: 20 }
    }>
        <Text>Welcome, { user.name }! </Text>
        < Text > Email: { user.email } </Text>
            < TouchableOpacity
    onPress = { handleSignOut }
    disabled = { loading }
    style = {{ marginTop: 20, padding: 10, backgroundColor: '#ff4444' }
}
        >
    <Text style={ { color: 'white', textAlign: 'center' } }>
        { loading? 'Signing out...': 'Sign Out' }
        </Text>
        </TouchableOpacity>
        </View>
    );
  }

return (
    <View style= {{ padding: 20 }}>
        <TouchableOpacity 
        onPress={ handleGoogleSignIn }
disabled = { loading }
style = {{ padding: 15, backgroundColor: '#4285f4', marginBottom: 10 }}
      >
    <Text style={ { color: 'white', textAlign: 'center' } }>
        { loading? 'Signing in...': 'Sign In with Google' }
        </Text>
        </TouchableOpacity>

{
    Platform.OS === 'ios' && (
        <TouchableOpacity 
          onPress={ handleAppleSignIn }
    disabled = { loading }
    style = {{ padding: 15, backgroundColor: '#000000' }
}
        >
    <Text style={ { color: 'white', textAlign: 'center' } }>
        { loading? 'Signing in...': 'Sign In with Apple' }
        </Text>
        </TouchableOpacity>
      )}
</View>
  );
};

// ============================================================================
// BACKEND ENDPOINT REFERENCE
// ============================================================================

/*
Available Endpoints:

1. GET /auth/providers
   Returns: { providers: ["google", "apple"], endpoints: {...} }

2. POST /auth/oauth?provider=google
   Body: { idToken: "google_id_token" }
   Returns: { message, provider, user, token, session }

3. POST /auth/oauth?provider=apple
   Body: { idToken: "apple_id_token", user?: { name: {...}, email: "..." } }
   Returns: { message, provider, user, token, session }

4. POST /auth/google (Legacy - backward compatibility)
   Body: { idToken: "google_id_token" }
   Returns: { message, user, token, session }

5. POST /auth/sign-out
   Headers: { Authorization: "Bearer TOKEN" }
   Returns: { message, sessionId }

Protected API endpoints:
- GET /v1/profile (get user profile and session information)
*/
