/**
 * Mobile App Integration Example (React Native with Google Sign In)
 * 
 * This file demonstrates how to integrate with the authentication backend
 * from a React Native mobile application using Google Sign In.
 * 
 * Required packages:
 * - @react-native-async-storage/async-storage
 * - @react-native-google-signin/google-signin
 * 
 * Installation:
 * npm install @react-native-async-storage/async-storage @react-native-google-signin/google-signin
 */

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // Change to your production URL
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Authentication Service
 * 
 * Example usage in React Native:
 * 
 * // Configure Google Sign In in your App.tsx
 * import { GoogleSignin } from '@react-native-google-signin/google-signin';
 * 
 * GoogleSignin.configure({
 *   webClientId: 'your-google-client-id.googleusercontent.com',
 *   offlineAccess: true,
 * });
 * 
 * // Sign in with Google
 * const handleGoogleSignIn = async () => {
 *   try {
 *     await GoogleSignin.hasPlayServices();
 *     const userInfo = await GoogleSignin.signIn();
 *     const idToken = userInfo.idToken;
 *     
 *     // Send to backend
 *     const response = await fetch('http://localhost:3000/auth/google', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ idToken }),
 *     });
 *     
 *     const data = await response.json();
 *     
 *     // Store session token
 *     await AsyncStorage.setItem('auth_token', data.token);
 *     
 *     return data.user;
 *   } catch (error) {
 *     console.error('Google Sign In error:', error);
 *     throw error;
 *   }
 * };
 * 
 * // Sign out
 * const handleSignOut = async () => {
 *   try {
 *     const token = await AsyncStorage.getItem('auth_token');
 *     
 *     if (token) {
 *       await fetch('http://localhost:3000/auth/sign-out', {
 *         method: 'POST',
 *         headers: { 'Authorization': `Bearer ${token}` },
 *       });
 *     }
 *     
 *     await AsyncStorage.removeItem('auth_token');
 *     await GoogleSignin.signOut();
 *   } catch (error) {
 *     console.error('Sign out error:', error);
 *   }
 * };
 * 
 * // Get current user
 * const getCurrentUser = async () => {
 *   try {
 *     const token = await AsyncStorage.getItem('auth_token');
 *     
 *     if (!token) return null;
 *     
 *     const response = await fetch('http://localhost:3000/v1/profile', {
 *       headers: { 'Authorization': `Bearer ${token}` },
 *     });
 *     
 *     if (!response.ok) {
 *       if (response.status === 401) {
 *         await AsyncStorage.removeItem('auth_token');
 *       }
 *       return null;
 *     }
 *     
 *     const data = await response.json();
 *     return data.user;
 *   } catch (error) {
 *     console.error('Get current user error:', error);
 *     return null;
 *   }
 * };
 * 
 * // Make authenticated API calls
 * const makeAuthenticatedRequest = async (endpoint: string, options = {}) => {
 *   const token = await AsyncStorage.getItem('auth_token');
 *   
 *   const response = await fetch(`http://localhost:3000${endpoint}`, {
 *     ...options,
 *     headers: {
 *       'Content-Type': 'application/json',
 *       ...(token && { 'Authorization': `Bearer ${token}` }),
 *       ...options.headers,
 *     },
 *   });
 *   
 *   if (response.status === 401) {
 *     await AsyncStorage.removeItem('auth_token');
 *     throw new Error('Session expired. Please sign in again.');
 *   }
 *   
 *   return response;
 * };
 */

export const MobileIntegrationGuide = {
    // Available endpoints
    endpoints: {
        googleSignIn: 'POST /auth/google',
        appleSignIn: 'POST /auth/apple',
        signOut: 'POST /auth/sign-out',
        getProfile: 'GET /v1/profile',
    },

    // Required request format for Google Sign In
    googleSignInRequest: {
        method: 'POST',
        url: '/auth/google',
        headers: {
            'Content-Type': 'application/json',
        },
        body: {
            idToken: 'string (Google ID token from @react-native-google-signin/google-signin)',
        },
    },

    // Expected response format
    googleSignInResponse: {
        message: 'Successfully signed in with Google',
        user: {
            id: 'string',
            email: 'string',
            name: 'string',
            image: 'string',
            emailVerified: 'boolean',
            createdAt: 'string',
            updatedAt: 'string',
        },
        token: 'string (store this securely)',
        session: {
            id: 'string',
            expiresAt: 'string',
        },
    },

    // Authentication header format for protected endpoints
    authenticationHeader: {
        Authorization: 'Bearer <session_token>',
    },
};
