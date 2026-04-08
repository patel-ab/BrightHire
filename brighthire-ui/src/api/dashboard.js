import client from './client'

export const getApplicationsByUser = (userId) =>
  client.get(`/api/applications/user/${userId}`).then((r) => r.data)

export const getResumeByUser = (userId) =>
  client.get(`/api/resumes/user/${userId}`).then((r) => r.data)

export const getJobsByCompany = (companyId) =>
  client.get(`/api/jobs/company/${companyId}`).then((r) => r.data)

export const getAllJobsByCompany = (companyId) =>
  client.get(`/api/jobs/company/${companyId}/all`).then((r) => r.data)

export const createJob = (payload) =>
  client.post('/api/jobs', payload).then((r) => r.data)

export const getCandidateProfile = () =>
  client.get('/api/candidate-profile/me').then((r) => r.data)

export const upsertCandidateProfile = (payload) =>
  client.put('/api/candidate-profile/me', payload).then((r) => r.data)

export const getAllJobs = () =>
  client.get('/api/jobs').then((r) => r.data)

export const getJobById = (jobId) =>
  client.get(`/api/jobs/${jobId}`).then((r) => r.data)

export const createApplication = (payload) =>
  client.post('/api/applications', payload).then((r) => r.data)

export const getApplicants = (jobId) =>
  client.get(`/api/jobs/${jobId}/applicants`).then((r) => r.data)

export const getResumeSignedUrl = (resumeId) =>
  client.get(`/api/resumes/${resumeId}/signed-url`).then((r) => r.data.url)

export const recruiterUpdateStatus = (applicationId, status) =>
  client.patch(`/api/applications/${applicationId}/recruiter-status`, { status }).then((r) => r.data)

export const candidateRespondToInterview = (applicationId, response) =>
  client.patch(`/api/applications/${applicationId}/candidate-response`, { response }).then((r) => r.data)

export const closeJob = (jobId) =>
  client.patch(`/api/jobs/${jobId}`, { status: 'closed' }).then((r) => r.data)

export const uploadResume = (userId, file) => {
  const fd = new FormData()
  fd.append('userId', userId)
  fd.append('file', file)
  return client.post('/api/resumes', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}
