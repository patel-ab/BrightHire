import axios from 'axios'

const client = axios.create({
  baseURL: 'http://localhost:8080',
  withCredentials: true,
})

// Attach token from storage on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── 401 INTERCEPTOR ──────────────────────────────────────
// When any request gets a 401, attempt one silent token refresh
// then retry the original request. If refresh fails, call the
// registered onAuthFailure callback (set by AuthContext).
//
// Deduplication: while a refresh is in flight, all other 401s
// wait for the same promise instead of each firing their own refresh.

let isRefreshing = false
let pendingQueue = []   // [{ resolve, reject }]

// AuthContext registers this so client.js can trigger logout
// without importing React
let onAuthFailure = () => {}
export function setAuthFailureHandler(fn) {
  onAuthFailure = fn
}

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  pendingQueue = []
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Only handle 401s, and never retry the refresh endpoint itself
    const fullUrl = (original.baseURL ?? '') + (original.url ?? '')
    if (
      error.response?.status !== 401 ||
      original._retry ||
      fullUrl.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    // If already refreshing, queue this request until refresh resolves
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`
        return client(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(
        'http://localhost:8080/auth/refresh',
        {},
        { withCredentials: true }
      )
      const newToken = data.accessToken
      localStorage.setItem('accessToken', newToken)
      processQueue(null, newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return client(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      localStorage.removeItem('accessToken')
      onAuthFailure()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default client
