import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './router/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import AuthCallback from './pages/AuthCallback'
import CandidateHome from './pages/candidate/CandidateHome'
import Jobs from './pages/candidate/Jobs'
import JobDetail from './pages/candidate/JobDetail'
import Profile from './pages/candidate/Profile'
import MyApplications from './pages/candidate/MyApplications'
import RecruiterHome from './pages/recruiter/RecruiterHome'
import PostJob from './pages/recruiter/PostJob'
import RecruiterApplicants from './pages/recruiter/RecruiterApplicants'

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Candidate-only */}
      <Route
        path="/candidate"
        element={
          <ProtectedRoute allowedRole="candidate">
            <CandidateHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/profile"
        element={
          <ProtectedRoute allowedRole="candidate">
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/jobs"
        element={
          <ProtectedRoute allowedRole="candidate">
            <Jobs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/jobs/:jobId"
        element={
          <ProtectedRoute allowedRole="candidate">
            <JobDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/applications"
        element={
          <ProtectedRoute allowedRole="candidate">
            <MyApplications />
          </ProtectedRoute>
        }
      />

      {/* Recruiter-only */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute allowedRole="recruiter">
            <RecruiterHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter/post-job"
        element={
          <ProtectedRoute allowedRole="recruiter">
            <PostJob />
          </ProtectedRoute>
        }
      />

      <Route
        path="/recruiter/jobs/:jobId/applicants"
        element={
          <ProtectedRoute allowedRole="recruiter">
            <RecruiterApplicants />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e2130',
              color: '#e2e8f0',
              border: '1px solid #2d3148',
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
