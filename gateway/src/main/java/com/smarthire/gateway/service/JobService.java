package com.smarthire.gateway.service;

import com.smarthire.gateway.dto.request.JobRequest;
import com.smarthire.gateway.dto.response.JobResponse;
import com.smarthire.gateway.model.Company;
import com.smarthire.gateway.model.Job;
import com.smarthire.gateway.model.User;
import com.smarthire.gateway.repository.CompanyRepository;
import com.smarthire.gateway.repository.JobRepository;
import com.smarthire.gateway.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    private static final List<String> VALID_SENIORITIES =
            List.of("junior", "mid", "senior", "lead");

    private static final List<String> VALID_STATUSES =
            List.of("active", "reviewing", "closed", "expired");

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
        return toResponse(jobRepository.findById(saved.getId()).get());
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