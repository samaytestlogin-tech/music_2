import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
            }
        }
        setLoading(false);
    }, []);

    const login = async (role, email, password) => {
        console.log(`[Auth] Attempting login with email: ${email}...`);

        try {
            const response = await api.post('/auth/login', { email, password });
            
            // If the backend requires OTP
            if (response.data.requireOtp) {
                return { 
                    success: true, 
                    requireOtp: true, 
                    email: response.data.email, 
                    appwriteId: response.data.appwriteId 
                };
            }

            // Fallback for older flow or direct login
            const { id, name, role: userRole, token } = response.data;
            const loggedInUser = { id, name, email, role: userRole };
            setUser(loggedInUser);
            localStorage.setItem('user', JSON.stringify(loggedInUser));
            localStorage.setItem('token', token);

            return { success: true, user: loggedInUser };
        } catch (error) {
            console.error('Login failed:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed'
            };
        }
    };

    const verifyAppwriteOtp = async (appwriteJwt) => {
        try {
            const response = await api.post('/auth/verify-otp', { appwriteJwt });
            const { id, name, email, role: userRole, token } = response.data;

            const loggedInUser = { id, name, email, role: userRole };
            
            setUser(loggedInUser);
            localStorage.setItem('user', JSON.stringify(loggedInUser));
            localStorage.setItem('token', token);

            return { success: true, user: loggedInUser };
        } catch (error) {
            console.error('OTP Verification failed:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'OTP verification failed'
            };
        }
    }

    const logout = async () => {
        console.log('[Auth] Attempting logout...');
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        try {
            const { account } = await import('../lib/appwrite');
            await account.deleteSession('current');
        } catch (e) {
            console.log('No Appwrite session to clear or error clearing it.');
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, verifyAppwriteOtp, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};
