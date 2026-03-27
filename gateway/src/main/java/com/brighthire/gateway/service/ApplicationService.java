package com.brighthire.gateway.service;

import com.brighthire.gateway.kafka.producer.KafkaProducerService;
import com.brighthire.gateway.kafka.event.ApplicationReceivedEvent;
import com.brighthire.gateway.kafka.event.StatusChangedEvent;
import com.brighthire.gateway.kafka.event.ApplicationWithdrawnEvent;
import com.brighthire.gateway.dto.request.ApplicationRequest;
import com.brighthire.gateway.dto.response.ApplicationResponse;
import com.brighthire.gateway.model.Application;
import com.brighthire.gateway.model.Job;
import com.brighthire.gateway.model.Resume;
import com.brighthire.gateway.model.User;
import com.brighthire.gateway.repository.ApplicationRepository;
import com.brighthire.gateway.repository.JobRepository;
import com.brighthire.gateway.repository.ResumeRepository;
import com.brighthire.gateway.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final KafkaProducerService kafkaProducerService;
    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;

    private static final List<String> VALID_STATUSES = List.of(
            "applied", "reviewing", "shortlisted",
            "rejected", "withdrawn"
    );

    // ─── CREATE ───────────────────────────────────────────

    @Transactional
    public ApplicationResponse createApplication(
            ApplicationRequest request) {

        validateIds(request);

        Job job = resolveJob(request.getJobId());
        User candidate = resolveCandidate(request.getUserId());
        Resume resume = resolveResume(
                request.getResumeId(), request.getUserId()
        );

        validateJobIsOpen(job);
        validateNotAlreadyApplied(
                request.getJobId(), request.getUserId()
        );

        Application application = new Application();
        application.setJob(job);
        application.setUser(candidate);
        application.setResume(resume);
        application.setStatus("applied");

        Application saved = applicationRepository.save(application);
        applicationRepository.flush();
        Application reloaded = applicationRepository.findById(saved.getId()).get();

        // ── Kafka event ───────────────────────────────────────
        ApplicationReceivedEvent event = new ApplicationReceivedEvent(
                reloaded.getId(),
                job.getId(),
                candidate.getId(),
                resume.getId(),
                resume.getRawText(),
                job.getJdVector(),
                candidate.getEmail(),
                candidate.getFullName(),
                job.getTitle(),
                job.getCompany().getName()
        );
        kafkaProducerService.publishApplicationReceived(event);

        return toResponse(reloaded);
    }

    // ─── READ ─────────────────────────────────────────────

    public Optional<ApplicationResponse> getApplicationById(
            UUID id) {
        return applicationRepository.findById(id)
                .map(this::toResponse);
    }

    public List<ApplicationResponse> getApplicationsByJob(
            UUID jobId) {
        return applicationRepository
                .findByJobIdOrderByNlpScoreDesc(jobId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ApplicationResponse> getApplicationsByUser(
            UUID userId) {
        return applicationRepository.findByUserId(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ApplicationResponse> getApplicationsByJobAndStatus(
            UUID jobId, String status) {
        validateStatus(status);
        return applicationRepository
                .findByJobIdAndStatus(jobId, status)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── UPDATE STATUS ────────────────────────────────────

    @Transactional
    public Optional<ApplicationResponse> updateStatus(
            UUID id, String status) {
        validateStatus(status);
        return applicationRepository.findById(id).map(application -> {

            String oldStatus = application.getStatus();
            application.setStatus(status);
            Application saved = applicationRepository.save(application);

            // ── Kafka event ───────────────────────────────────
            StatusChangedEvent event = new StatusChangedEvent(
                    saved.getId(),
                    saved.getJob().getId(),
                    saved.getUser().getId(),
                    oldStatus,
                    status,
                    saved.getUser().getEmail(),
                    saved.getUser().getFullName(),
                    saved.getJob().getTitle(),
                    saved.getJob().getCompany().getName()
            );
            kafkaProducerService.publishStatusChanged(event);
            // ─────────────────────────────────────────────────

            return toResponse(saved);
        });
    }

    // ─── WITHDRAW ─────────────────────────────────────────

    @Transactional
    public Optional<ApplicationResponse> withdraw(
            UUID id, UUID userId) {
        return applicationRepository.findById(id).map(application -> {
            if (!application.getUser().getId().equals(userId)) {
                throw new IllegalArgumentException(
                        "You can only withdraw your own application"
                );
            }
            if ("withdrawn".equals(application.getStatus())) {
                throw new IllegalArgumentException(
                        "Application is already withdrawn"
                );
            }
            if ("rejected".equals(application.getStatus())) {
                throw new IllegalArgumentException(
                        "Cannot withdraw a rejected application"
                );
            }
            application.setStatus("withdrawn");
            Application saved = applicationRepository.save(application);

            // ── Kafka event ───────────────────────────────────
            ApplicationWithdrawnEvent event =
                    new ApplicationWithdrawnEvent(
                            saved.getId(),
                            saved.getJob().getId(),
                            saved.getUser().getId()
                    );
            kafkaProducerService.publishApplicationWithdrawn(event);
            // ─────────────────────────────────────────────────

            return toResponse(saved);
        });
    }

    // ─── MAPPING ──────────────────────────────────────────

    private ApplicationResponse toResponse(Application application) {
        ApplicationResponse response = new ApplicationResponse();
        response.setId(application.getId());
        response.setStatus(application.getStatus());
        response.setNlpScore(application.getNlpScore());
        response.setScoreBreakdown(application.getScoreBreakdown());
        response.setRankingVersion(application.getRankingVersion());
        response.setAppliedAt(application.getAppliedAt());
        response.setRankedAt(application.getRankedAt());
        if (application.getJob() != null) {
            response.setJobId(application.getJob().getId());
            response.setJobTitle(application.getJob().getTitle());
        }
        if (application.getUser() != null) {
            response.setUserId(application.getUser().getId());
            response.setUserFullName(
                    application.getUser().getFullName()
            );
        }
        if (application.getResume() != null) {
            response.setResumeId(application.getResume().getId());
        }
        return response;
    }

    // ─── HELPERS ──────────────────────────────────────────

    private Job resolveJob(UUID jobId) {
        return jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Job with id " + jobId + " not found"
                ));
    }

    private User resolveCandidate(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User with id " + userId + " not found"
                ));
        if (!"candidate".equals(user.getRole())) {
            throw new IllegalArgumentException(
                    "Only candidates can apply to jobs"
            );
        }
        return user;
    }

    private Resume resolveResume(UUID resumeId, UUID userId) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Resume with id " + resumeId + " not found"
                ));
        if (!resume.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException(
                    "Resume does not belong to this candidate"
            );
        }
        return resume;
    }

    private void validateJobIsOpen(Job job) {
        if (!"active".equals(job.getStatus()) &&
                !"reviewing".equals(job.getStatus())) {
            throw new IllegalArgumentException(
                    "Job is not accepting applications. "
                            + "Current status: " + job.getStatus()
            );
        }
    }

    private void validateNotAlreadyApplied(
            UUID jobId, UUID userId) {
        if (applicationRepository
                .existsByJobIdAndUserId(jobId, userId)) {
            throw new IllegalArgumentException(
                    "You have already applied to this job"
            );
        }
    }

    // ─── VALIDATORS ───────────────────────────────────────

    private void validateIds(ApplicationRequest request) {
        if (request.getJobId() == null) {
            throw new IllegalArgumentException(
                    "Job ID is required"
            );
        }
        if (request.getUserId() == null) {
            throw new IllegalArgumentException(
                    "User ID is required"
            );
        }
        if (request.getResumeId() == null) {
            throw new IllegalArgumentException(
                    "Resume ID is required"
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