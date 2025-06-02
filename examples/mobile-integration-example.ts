/**
 * Mobile App Integration Example (React Native)
 * 
 * This file demonstrates how to integrate with the authentication backend
 * from a React Native mobile application.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // Change to your production URL
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Authentication Service
 */
class AuthService {

    /**
     * Register a new user
     */
    static async signUp(name: string, email: string, password: string) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/sign-up`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            return data.user;
        } catch (error) {
            console.error('SignUp error:', error);
            throw error;
        }
    }

    /**
     * Sign in user and store token
     */
    static async signIn(email: string, password: string) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/sign-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Sign in failed');
            }

            // Store token securely
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);

            return data.user;
        } catch (error) {
            console.error('SignIn error:', error);
            throw error;
        }
    }

    /**
     * Sign out user and remove token
     */
    static async signOut() {
        try {
            const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

            if (token) {
                const response = await fetch(`${API_BASE_URL}/auth/sign-out`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    console.warn('Server sign-out failed, clearing local token anyway');
                }
            }

            // Always clear local token
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        } catch (error) {
            console.error('SignOut error:', error);
            // Still clear local token even if server call fails
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        }
    }

    /**
     * Get stored auth token
     */
    static async getToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    }

    /**
     * Check if user is signed in
     */
    static async isSignedIn(): Promise<boolean> {
        const token = await this.getToken();
        return token !== null;
    }
}

/**
 * API Service for authenticated requests
 */
class ApiService {

    /**
     * Get authentication headers
     */
    static async getAuthHeaders() {
        const token = await AuthService.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
        };
    }

    /**
     * Make authenticated API request
     */
    static async request(endpoint: string, options: RequestInit = {}) {
        try {
            const headers = await this.getAuthHeaders();

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers,
                },
            });

            if (response.status === 401) {
                // Token expired or invalid, sign out user
                await AuthService.signOut();
                throw new Error('Authentication expired. Please sign in again.');
            }

            return response;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Get current user profile
     */
    static async getProfile() {
        const response = await this.request('/api/profile');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get profile');
        }

        return data;
    }

    /**
     * Update user profile
     */
    static async updateProfile(updates: { name?: string; email?: string }) {
        const response = await this.request('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(updates),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update profile');
        }

        return data;
    }

    /**
     * Get user's active sessions
     */
    static async getSessions() {
        const response = await this.request('/api/sessions');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get sessions');
        }

        return data;
    }

    /**
     * Revoke a specific session
     */
    static async revokeSession(sessionId: string) {
        const response = await this.request(`/api/sessions/${sessionId}`, {
            method: 'DELETE',
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to revoke session');
        }

        return data;
    }

    /**
     * Revoke all other sessions
     */
    static async revokeAllOtherSessions() {
        const response = await this.request('/api/sessions/revoke-all', {
            method: 'POST',
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to revoke sessions');
        }

        return data;
    }
}

/**
 * Example React Native component usage
 */

// Login component example
const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignIn = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const user = await AuthService.signIn(email, password);
            console.log('Signed in user:', user);
            // Navigate to main app
        } catch (error) {
            Alert.alert('Sign In Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    // ... rest of component
};

// Profile component example
const ProfileScreen = () => {
    const [profile, setProfile] = useState(null);
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        loadProfileData();
    }, []);

    const loadProfileData = async () => {
        try {
            const [profileData, sessionsData] = await Promise.all([
                ApiService.getProfile(),
                ApiService.getSessions(),
            ]);

            setProfile(profileData.user);
            setSessions(sessionsData.sessions);
        } catch (error) {
            Alert.alert('Error', 'Failed to load profile data');
        }
    };

    const handleSignOut = async () => {
        try {
            await AuthService.signOut();
            // Navigate to login screen
        } catch (error) {
            Alert.alert('Error', 'Sign out failed');
        }
    };

    // ... rest of component
};

export { AuthService, ApiService };
