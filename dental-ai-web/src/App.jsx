import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import PatientUploadPage from './pages/PatientUploadPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import PatientManagement from './pages/PatientManagement';
import AuthCallback from './pages/AuthCallback';

function App() {
  return (
    <div className="min-h-screen bg-background-light">
      <Router>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/patient/upload" element={<PatientUploadPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/patients" element={<PatientManagement />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;

