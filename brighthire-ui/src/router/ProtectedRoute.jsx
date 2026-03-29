import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FullPageSpinner from '../components/FullPageSpinner'

/**
 * allowedRole: 'candidate' | 'recruiter' | null (null = just needs auth)
 */
export default function ProtectedRoute({ children, allowedRole = null }) {
  const { user, status } = useAuth()

  if (status === 'loading') return <FullPageSpinner />

  if (!user) return <Navigate to="/" replace />

  if (allowedRole && user.role !== allowedRole) {
    // Logged in but wrong role — send to their correct home
    const home = user.role === 'recruiter' ? '/recruiter' : '/candidate'
    return <Navigate to={home} replace state={{ errorMessage: `Access denied. You're signed in as a ${user.role}.` }} />
  }

  return children
}
