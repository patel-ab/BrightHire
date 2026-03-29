import client from './client'

export const getMe = () => client.get('/auth/me').then((r) => r.data)

export const refreshToken = () =>
  client.post('/auth/refresh').then((r) => r.data)

export const logout = () =>
  client.post('/auth/logout').catch(() => {})
