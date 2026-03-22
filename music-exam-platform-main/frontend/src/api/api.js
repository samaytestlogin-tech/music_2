import axios from 'axios';
import { mockExams, mockResults, mockRecordings, mockUsers } from './mockData';

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Create an Axios instance
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to attach JWT token
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const api = {
    get: async (url) => {
        console.log(`${useMockData ? 'Mock ' : ''}GET request to: ${url}`);

        if (useMockData) {
            const examDetailMatch = url.match(/\/exam\/(\d+)\/details/);
            if (examDetailMatch) {
                const examId = parseInt(examDetailMatch[1]);
                const exam = mockExams.find(e => e.id === examId);
                return { data: { exam } };
            }

            if (url === '/student/exams') return { data: { exams: mockExams } };
            if (url === '/student/results') return { data: { results: mockResults } };
            if (url === '/evaluator/exams') return { data: { exams: mockExams } };
            if (url.includes('/admin/users')) return { data: { users: mockUsers } };
            if (url === '/admin/exams') return { data: { exams: mockExams } };
            if (url === '/admin/marks') return { data: { marks: mockResults } };
            if (url === '/admin/recordings') return { data: { recordings: mockRecordings } };

            if (url.match(/\/exam\/\d+\/room-token/)) {
                return {
                    data: {
                        token: 'mock-token',
                        room_url: import.meta.env.VITE_DAILY_ROOM_URL || 'https://demo.daily.co/room'
                    }
                };
            }
        }

        // --- Node.js Backend Implementation ---
        try {
            const response = await axiosInstance.get(url);
            return response;
        } catch (error) {
            console.error('API GET Error:', error.response?.data || error.message);
            throw error;
        }
    },

    post: async (url, data) => {
        console.log(`${useMockData ? 'Mock ' : ''}POST request to: ${url}`, data);

        if (useMockData) {
            // Mock auth response specially
            if (url === '/auth/login' || url === '/auth/register') {
                return { data: { id: 'mock-1', name: data.name || 'Mock User', email: data.email, role: data.role || 'student', token: 'mock-jwt-token' } };
            }
            return { data: { success: true } };
        }

        // --- Node.js Backend Implementation ---
        try {
            const response = await axiosInstance.post(url, data);
            return response;
        } catch (error) {
            console.error('API POST Error:', error.response?.data || error.message);
            throw error;
        }
    },

    put: async (url, data) => {
        console.log(`${useMockData ? 'Mock ' : ''}PUT request to: ${url}`, data);

        if (useMockData) {
            if (url.match(/\/admin\/users\/\w+/)) {
                const userId = url.split('/').pop();
                const userIndex = mockUsers.findIndex(u => u.id.toString() === userId);
                if (userIndex !== -1) {
                    mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
                }
                return { data: { success: true } };
            }
            return { data: { success: true } };
        }

        // --- Node.js Backend Implementation ---
        try {
            const response = await axiosInstance.put(url, data);
            return response;
        } catch (error) {
            console.error('API PUT Error:', error.response?.data || error.message);
            throw error;
        }
    },

    delete: async (url) => {
        console.log(`${useMockData ? 'Mock ' : ''}DELETE request to: ${url}`);

        if (useMockData) {
            if (url.match(/\/admin\/users\/\w+/)) {
                const userId = url.split('/').pop();
                const userIndex = mockUsers.findIndex(u => u.id.toString() === userId);
                if (userIndex !== -1) {
                    mockUsers.splice(userIndex, 1);
                }
                return { data: { success: true } };
            }
            return { data: { success: true } };
        }

        // --- Node.js Backend Implementation ---
        try {
            const response = await axiosInstance.delete(url);
            return response;
        } catch (error) {
            console.error('API DELETE Error:', error.response?.data || error.message);
            throw error;
        }
    },

    interceptors: axiosInstance.interceptors // Expose if any other component wants to attach interceptors
};

export default api;
