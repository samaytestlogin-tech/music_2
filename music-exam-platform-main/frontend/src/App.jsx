import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PublicRoute, ProtectedRoute } from './components/AuthRoutes';
import Login from './components/Login';
import RegistrationForm from './components/RegistrationForm';
import StudentDashboard from './components/StudentDashboard';
import EvaluatorDashboard from './components/EvaluatorDashboard';
import AdminDashboard from './components/AdminDashboard';
import CrossExaminerDashboard from './components/CrossExaminerDashboard';
import ExamRoom from './components/ExamRoom';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    } />

                    <Route path="/register" element={<RegistrationForm />} />

                    <Route path="/student/dashboard" element={
                        <ProtectedRoute allowedRoles={['student']}>
                            <StudentDashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="/evaluator/dashboard" element={
                        <ProtectedRoute allowedRoles={['evaluator']}>
                            <EvaluatorDashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/dashboard" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="/cross-examiner/dashboard" element={
                        <ProtectedRoute allowedRoles={['cross_examiner']}>
                            <CrossExaminerDashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="/exam/:exam_id" element={
                        <ProtectedRoute allowedRoles={['student', 'evaluator', 'cross_examiner']}>
                            <ExamRoom />
                        </ProtectedRoute>
                    } />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
