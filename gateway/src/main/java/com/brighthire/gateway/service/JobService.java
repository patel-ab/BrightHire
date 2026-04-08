package com.brighthire.gateway.service;


import org.springframework.data.redis.core.RedisTemplate;
import com.brighthire.gateway.dto.response.ApplicantResponse;
import com.brighthire.gateway.model.CandidateProfile;
import com.brighthire.gateway.model.Resume;
import com.brighthire.gateway.repository.ApplicationRepository;
import com.brighthire.gateway.repository.CandidateProfileRepository;
import com.brighthire.gateway.repository.ResumeRepository;
import com.brighthire.gateway.model.Application;
import com.brighthire.gateway.kafka.producer.KafkaProducerService;
import com.brighthire.gateway.kafka.event.JobPostedEvent;
import com.brighthire.gateway.dto.request.JobRequest;
import com.brighthire.gateway.dto.response.JobResponse;
import com.brighthire.gateway.model.Company;
import com.brighthire.gateway.model.Job;
import com.brighthire.gateway.model.User;
import com.brighthire.gateway.repository.CompanyRepository;
import com.brighthire.gateway.repository.JobRepository;
import com.brighthire.gateway.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class JobService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ApplicationRepository applicationRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final ResumeRepository resumeRepository;
    private final KafkaProducerService kafkaProducerService;
    private final JobRepository jobRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    private static final List<String> VALID_SENIORITIES =
            List.of("junior", "mid", "senior", "lead");

    private static final List<String> VALID_STATUSES =
            List.of("active", "closed");

    // ─── CREATE ───────────────────────────────────────────

    @Transactional
    public JobResponse createJob(JobRequest request) {
        validateTitle(request.getTitle());
        validateDescription(request.getDescription());
        validateSeniority(request.getSeniority());

        Company company = resolveCompany(request.getCompanyId());
        User postedBy = resolveRecruiter(request.getPostedById());

        validateRecruiterBelongsToCompany(postedBy, company);

        Job job = new Job();
        job.setCompany(company);
        job.setPostedBy(postedBy);
        job.setTitle(request.getTitle());
        job.setDescription(request.getDescription());
        job.setLocation(request.getLocation());
        job.setSeniority(request.getSeniority());
        job.setRequiredSkills(request.getRequiredSkills());
        job.setStatus("active");
        job.setExpiresAt(OffsetDateTime.now().plusDays(60));

        // with this
        Job saved = jobRepository.save(job);
        jobRepository.flush();
        Job reloaded = jobRepository.findById(saved.getId()).get();

        // Emit Kafka event after job saved successfully
        JobPostedEvent event = new JobPostedEvent(
                saved.getId(),
                saved.getCompany().getId(),
                saved.getCompany().getName(),
                saved.getTitle(),
                saved.getSeniority(),
                saved.getRequiredSkills(),
                saved.getLocation(),
                saved.getCreatedAt()
        );
        kafkaProducerService.publishJobPosted(event);
        return toResponse(reloaded);
    }

    // ─── READ ─────────────────────────────────────────────

    public Optional<JobResponse> getJobById(UUID id) {
        return jobRepository.findById(id)
                .map(this::toResponse);
    }

    public List<JobResponse> getAllActiveJobs() {
        return jobRepository
                .findByStatusOrderByCreatedAtDesc("active")
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<JobResponse> getJobsByCompany(UUID companyId) {
        return jobRepository
                .findByCompanyIdAndStatus(companyId, "active")
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<JobResponse> getAllJobsByCompany(UUID companyId) {
        return jobRepository
                .findByCompanyIdOrderByCreatedAtDesc(companyId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── UPDATE ───────────────────────────────────────────

    @Transactional
    public Optional<JobResponse> updateJob(
            UUID id, Map<String, Object> updates) {
        return jobRepository.findById(id).map(job -> {
            if (updates.containsKey("title")) {
                validateTitle((String) updates.get("title"));
                job.setTitle((String) updates.get("title"));
            }
            if (updates.containsKey("description")) {
                job.setDescription((String) updates.get("description"));
            }
            if (updates.containsKey("location")) {
                job.setLocation((String) updates.get("location"));
            }
            if (updates.containsKey("seniority")) {
                validateSeniority((String) updates.get("seniority"));
                job.setSeniority((String) updates.get("seniority"));
            }
            if (updates.containsKey("status")) {
                validateStatus((String) updates.get("status"));
                job.setStatus((String) updates.get("status"));
            }
            if (updates.containsKey("requiredSkills")) {
                job.setRequiredSkills(
                        (List<String>) updates.get("requiredSkills")
                );
            }
            return toResponse(jobRepository.save(job));
        });
    }

    // ─── DELETE ───────────────────────────────────────────

    @Transactional
    public boolean deleteJob(UUID id) {
        if (!jobRepository.existsById(id)) {
            return false;
        }
        jobRepository.deleteById(id);
        return true;
    }

    // ─── APPLICANTS ───────────────────────────────────────────
    // Reads all scored candidates from the Redis sorted set for this job,
    // ordered by NLP score descending. Enriches each entry with full profile,
    // resume, and application metadata from PostgreSQL.
    // Company-scoped: recruiter must belong to the job's company.

    @Transactional(readOnly = true)
    public List<ApplicantResponse> getApplicants(UUID jobId, UUID recruiterId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));

        User recruiter = userRepository.findById(recruiterId)
                .orElseThrow(() -> new IllegalArgumentException("Recruiter not found: " + recruiterId));

        // Scope check: job must belong to recruiter's company
        if (recruiter.getCompany() == null ||
                !job.getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new IllegalArgumentException("Access denied: job does not belong to your company");
        }

        // Read all scored candidates from Redis sorted set, highest score first.
        // 0, -1 means the full set — no cap.
        String redisKey = "shortlist:" + jobId;
        Set<ZSetOperations.TypedTuple<String>> redisResults =
                redisTemplate.opsForZSet().reverseRangeWithScores(redisKey, 0, -1);

        if (redisResults == null || redisResults.isEmpty()) {
            return List.of();
        }

        List<ApplicantResponse> applicants = new ArrayList<>();

        for (ZSetOperations.TypedTuple<String> entry : redisResults) {
            String userIdStr = entry.getValue();
            Double score = entry.getScore();
            if (userIdStr == null || score == null) continue;

            UUID userId = UUID.fromString(userIdStr);

            Optional<Application> applicationOpt =
                    applicationRepository.findByJobIdAndUserId(jobId, userId);
            if (applicationOpt.isEmpty()) continue;

            Application app = applicationOpt.get();
            User candidate = app.getUser();

            ApplicantResponse r = new ApplicantResponse();

            // Identity
            r.setUserId(candidate.getId());
            r.setFullName(candidate.getFullName());
            r.setAvatarUrl(candidate.getAvatarUrl());
            r.setEmail(candidate.getEmail());

            // Application metadata — use Redis score as the authoritative ranking score
            r.setApplicationId(app.getId());
            r.setApplicationStatus(app.getStatus());
            r.setAppliedAt(app.getAppliedAt());
            r.setNlpScore(BigDecimal.valueOf(score));
            r.setScoreBreakdown(app.getScoreBreakdown());

            // Candidate profile (may not exist yet)
            candidateProfileRepository.findByUserId(userId).ifPresent(profile -> {
                r.setHeadline(profile.getHeadline());
                r.setSummary(profile.getSummary());
                r.setLocation(profile.getLocation());
                r.setYearsOfExperience(profile.getYearsOfExperience());
                r.setSkills(profile.getSkills());
                r.setLinkedinUrl(profile.getLinkedinUrl());
                r.setGithubUrl(profile.getGithubUrl());
                r.setPortfolioUrl(profile.getPortfolioUrl());
                r.setPhone(profile.getPhone());
            });

            // Resume
            if (app.getResume() != null) {
                Resume resume = app.getResume();
                r.setResumeId(resume.getId());
                r.setResumeFileUrl(resume.getFileUrl());
                r.setResumeFileSizeKb(resume.getFileSizeKb());
            }

            applicants.add(r);
        }

        return applicants;
    }


    // ─── MAPPING ──────────────────────────────────────────

    private JobResponse toResponse(Job job) {
        JobResponse response = new JobResponse();
        response.setId(job.getId());
        response.setTitle(job.getTitle());
        response.setDescription(job.getDescription());
        response.setLocation(job.getLocation());
        response.setSeniority(job.getSeniority());
        response.setRequiredSkills(job.getRequiredSkills());
        response.setStatus(job.getStatus());
        response.setExpiresAt(job.getExpiresAt());
        response.setCreatedAt(job.getCreatedAt());
        if (job.getCompany() != null) {
            response.setCompanyId(job.getCompany().getId());
            response.setCompanyName(job.getCompany().getName());
        }
        if (job.getPostedBy() != null) {
            response.setPostedById(job.getPostedBy().getId());
            response.setPostedByName(job.getPostedBy().getFullName());
        }
        response.setApplicationCount(applicationRepository.countByJobId(job.getId()));
        return response;
    }

    // ─── HELPERS ──────────────────────────────────────────

    private Company resolveCompany(UUID companyId) {
        if (companyId == null) {
            throw new IllegalArgumentException(
                    "Company ID is required"
            );
        }
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Company with id " + companyId + " not found"
                ));
    }

    private User resolveRecruiter(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException(
                    "Posted by user ID is required"
            );
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User with id " + userId + " not found"
                ));
        if (!"recruiter".equals(user.getRole()) &&
                !"admin".equals(user.getRole())) {
            throw new IllegalArgumentException(
                    "Only recruiters or admins can post jobs"
            );
        }
        return user;
    }

    private void validateRecruiterBelongsToCompany(
            User recruiter, Company company) {
        if (recruiter.getCompany() == null ||
                !recruiter.getCompany().getId()
                        .equals(company.getId())) {
            throw new IllegalArgumentException(
                    "Recruiter does not belong to this company"
            );
        }
    }

    // ─── VALIDATORS ───────────────────────────────────────

    private void validateTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException(
                    "Job title cannot be empty"
            );
        }
    }

    private void validateDescription(String description) {
        if (description == null || description.isBlank()) {
            throw new IllegalArgumentException(
                    "Job description cannot be empty"
            );
        }
    }

    private void validateSeniority(String seniority) {
        if (seniority == null ||
                !VALID_SENIORITIES.contains(seniority)) {
            throw new IllegalArgumentException(
                    "Invalid seniority. Must be one of: "
                            + VALID_SENIORITIES
            );
        }
    }

    private void validateStatus(String status) {
        if (status == null || !VALID_STATUSES.contains(status)) {
            throw new IllegalArgumentException(
                    "Invalid status. Must be one of: "
                            + VALID_STATUSES
            );
        }
    }
}