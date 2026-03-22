export const mockUsers = [
    { id: 1, name: "Student User", email: "student@example.com", password: "password123", role: "student", token: "mock-jwt-token-student" },
    { id: 2, name: "Evaluator User", email: "evaluator@example.com", password: "password123", role: "evaluator", token: "mock-jwt-token-evaluator" },
    { id: 3, name: "Admin User", email: "admin@example.com", password: "password123", role: "admin", token: "mock-jwt-token-admin" },

    // Additional Students
    { id: 4, name: "Alice Sharma", email: "alice.sharma@example.com", password: "password123", role: "student", token: "mock-jwt-token-alice" },
    { id: 5, name: "Bob Iyer", email: "bob.iyer@example.com", password: "password123", role: "student", token: "mock-jwt-token-bob" },
    { id: 6, name: "Charlie Singh", email: "charlie.singh@example.com", password: "password123", role: "student", token: "mock-jwt-token-charlie" },
    { id: 7, name: "Diana Patel", email: "diana.patel@example.com", password: "password123", role: "student", token: "mock-jwt-token-diana" },

    // Additional Evaluators
    { id: 8, name: "Dr. Ananya Rao", email: "ananya.rao@example.com", password: "password123", role: "evaluator", token: "mock-jwt-token-ananya" },
    { id: 9, name: "Maestro Vikram", email: "vikram.maestro@example.com", password: "password123", role: "evaluator", token: "mock-jwt-token-vikram" },
    { id: 10, name: "Prof. R. Krishnan", email: "r.krishnan@example.com", password: "password123", role: "evaluator", token: "mock-jwt-token-krishnan" }
];

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

export const mockExams = [
    // Today's Exam (for quick testing)
    { id: 101, exam_id: 101, name: "Piano Grade 1 Exam", title: "Piano Grade 1 Exam", description: "Beginner level piano examination", date: today, time: "00:00", duration: 60, duration_minutes: 60, status: "scheduled", student_id: 1, evaluator_id: 2, student_name: "Student User", evaluator_name: "Evaluator User", marks_submitted: false, results_published: false },

    // Upcoming Exams
    { id: 103, exam_id: 103, name: "Carnatic Vocal Grade 4", title: "Carnatic Vocal Grade 4", description: "Advanced vocal performance test", date: tomorrow, time: "10:00", duration: 45, duration_minutes: 45, status: "scheduled", student_id: 4, evaluator_id: 8, student_name: "Alice Sharma", evaluator_name: "Dr. Ananya Rao", marks_submitted: false, results_published: false },
    { id: 104, exam_id: 104, name: "Tabla Basic Certification", title: "Tabla Basic Certification", description: "First year certification", date: nextWeek, time: "11:30", duration: 30, duration_minutes: 30, status: "scheduled", student_id: 5, evaluator_id: 9, student_name: "Bob Iyer", evaluator_name: "Maestro Vikram", marks_submitted: false, results_published: false },
    { id: 105, exam_id: 105, name: "Flute Grade 2", title: "Flute Grade 2", description: "Intermediate flute performance", date: tomorrow, time: "15:00", duration: 45, duration_minutes: 45, status: "scheduled", student_id: 6, evaluator_id: 10, student_name: "Charlie Singh", evaluator_name: "Prof. R. Krishnan", marks_submitted: false, results_published: false },
    { id: 106, exam_id: 106, name: "Guitar Grade 3 Assessment", title: "Guitar Grade 3 Assessment", description: "Intermediate guitar assessment", date: nextWeek, time: "14:00", duration: 60, duration_minutes: 60, status: "scheduled", student_id: 7, evaluator_id: 2, student_name: "Diana Patel", evaluator_name: "Evaluator User", marks_submitted: false, results_published: false },

    // In Progress Exam
    { id: 107, exam_id: 107, name: "Sitar Debut Level", title: "Sitar Debut Level", description: "Final assessment before debut", date: today, time: "12:00", duration: 60, duration_minutes: 60, status: "in_progress", student_id: 4, evaluator_id: 9, student_name: "Alice Sharma", evaluator_name: "Maestro Vikram", marks_submitted: false, results_published: false },

    // Past Completed Exams (Awaiting marking or publishing)
    { id: 102, exam_id: 102, name: "Violin Grade 3 Exam", title: "Violin Grade 3 Exam", description: "Intermediate level violin examination", date: yesterday, time: "14:30", duration: 45, duration_minutes: 45, status: "completed", student_id: 1, evaluator_id: 2, student_name: "Student User", evaluator_name: "Evaluator User", marks_submitted: true, results_published: false },
    { id: 108, exam_id: 108, name: "Keyboard Grade 1", title: "Keyboard Grade 1", description: "Beginner keyboard", date: yesterday, time: "09:00", duration: 30, duration_minutes: 30, status: "completed", student_id: 5, evaluator_id: 10, student_name: "Bob Iyer", evaluator_name: "Prof. R. Krishnan", marks_submitted: true, results_published: true },
    { id: 109, exam_id: 109, name: "Hindustani Vocal Grade 2", title: "Hindustani Vocal Grade 2", description: "Second year vocal assessment", date: lastWeek, time: "11:00", duration: 60, duration_minutes: 60, status: "completed", student_id: 6, evaluator_id: 8, student_name: "Charlie Singh", evaluator_name: "Dr. Ananya Rao", marks_submitted: true, results_published: true },
    { id: 110, exam_id: 110, name: "Percussion General Knowledge", title: "Percussion General Knowledge", description: "Theory exam", date: lastWeek, time: "16:00", duration: 90, duration_minutes: 90, status: "completed", student_id: 7, evaluator_id: 9, student_name: "Diana Patel", evaluator_name: "Maestro Vikram", marks_submitted: true, results_published: true },
];

export const mockResults = [
    { id: 1, exam_id: 102, exam_title: "Violin Grade 3 Exam", exam_name: "Violin Grade 3 Exam", student_id: 1, student_name: "Student User", evaluator_name: "Evaluator User", marks: 85, total_marks: 85, remarks: "Excellent performance, good tempo.", date: yesterday },
    { id: 2, exam_id: 108, exam_title: "Keyboard Grade 1", exam_name: "Keyboard Grade 1", student_id: 5, student_name: "Bob Iyer", evaluator_name: "Prof. R. Krishnan", marks: 92, total_marks: 92, remarks: "Outstanding finger placement and posture. Keep up the good work!", date: yesterday },
    { id: 3, exam_id: 109, exam_title: "Hindustani Vocal Grade 2", exam_name: "Hindustani Vocal Grade 2", student_id: 6, student_name: "Charlie Singh", evaluator_name: "Dr. Ananya Rao", marks: 78, total_marks: 78, remarks: "Strong control over rhythm, but needs practice holding high notes.", date: lastWeek },
    { id: 4, exam_id: 110, exam_title: "Percussion General Knowledge", exam_name: "Percussion General Knowledge", student_id: 7, student_name: "Diana Patel", evaluator_name: "Maestro Vikram", marks: 95, total_marks: 95, remarks: "Spot on theoretical knowledge. Ready for practicals.", date: lastWeek }
];

export const mockRecordings = [
    { id: 1, exam_id: 102, exam_name: "Violin Grade 3 Exam", url: "https://example.com/recording1.mp4", video_url: "https://example.com/recording1.mp4", duration: "45:00", date: yesterday, student_name: "Student User", evaluator_name: "Evaluator User" },
    { id: 2, exam_id: 107, exam_name: "Sitar Debut Level", url: "https://example.com/recording2.mp4", video_url: "https://example.com/recording2.mp4", duration: "12:30", date: today, student_name: "Alice Sharma", evaluator_name: "Maestro Vikram" }, // Currently partial recording for in progress exam
    { id: 3, exam_id: 108, exam_name: "Keyboard Grade 1", url: "https://example.com/recording3.mp4", video_url: "https://example.com/recording3.mp4", duration: "30:00", date: yesterday, student_name: "Bob Iyer", evaluator_name: "Prof. R. Krishnan" },
    { id: 4, exam_id: 109, exam_name: "Hindustani Vocal Grade 2", url: "https://example.com/recording4.mp4", video_url: "https://example.com/recording4.mp4", duration: "58:15", date: lastWeek, student_name: "Charlie Singh", evaluator_name: "Dr. Ananya Rao" },
];
