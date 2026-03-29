import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FullPageSpinner from '../components/FullPageSpinner'

// Maps each role to a human-readable label for error messages
const ROLE_LABEL = { candidate: 'Candidate', recruiter: 'Recruiter' }

export default function AuthCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { login } = useAuth()
  const ran = useRef(false)

  useEffect(() => {
    // StrictMode fires twice — guard with a ref
    if (ran.current) return
    ran.current = true

    const error = params.get('error')
    if (error) {
      sessionStorage.removeItem('intendedRole')
      navigate('/', {
        replace: true,
        state: { errorMessage: 'Authentication failed. Please try again.' },
      })
      return
    }

    const token = params.get('token')
    const returnedRole = params.get('role')?.toLowerCase() ?? ''

    if (!token) {
      sessionStorage.removeItem('intendedRole')
      navigate('/', {
        replace: true,
        state: { errorMessage: 'Login failed. No token received.' },
      })
      return
    }

    // Check if the role returned by the backend matches what the user selected
    const intendedRole = sessionStorage.getItem('intendedRole')
    sessionStorage.removeItem('intendedRole')

    if (intendedRole && returnedRole && returnedRole !== intendedRole) {
      const intended = ROLE_LABEL[intendedRole] ?? intendedRole
      const actual = ROLE_LABEL[returnedRole] ?? returnedRole
      navigate('/', {
        replace: true,
        state: {
          errorMessage: `This account is registered as a ${actual}. Please select "${actual}" to sign in, or use a different account for ${intended} access.`,
        },
      })
      return
    }

    login(token, returnedRole)
      .then((user) => {
        const dest = user.role === 'recruiter' ? '/recruiter' : '/candidate'
        navigate(dest, { replace: true })
      })
      .catch(() => {
        navigate('/', {
          replace: true,
          state: { errorMessage: 'Could not load your account. Please try again.' },
        })
      })
  }, [])

  return <FullPageSpinner />
}
