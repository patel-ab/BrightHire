package com.brighthire.gateway.controller;

import com.brighthire.gateway.dto.response.ApplicantResponse;
import com.brighthire.gateway.dto.request.JobRequest;
import com.brighthire.gateway.dto.response.JobResponse;
import com.brighthire.gateway.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @PostMapping
    public ResponseEntity<JobResponse> createJob(
            @RequestBody JobRequest request) {
        JobResponse response = jobService.createJob(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobResponse> getJobById(
            @PathVariable UUID id) {
        return jobService.getJobById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<JobResponse>> getAllActiveJobs() {
        return ResponseEntity.ok(jobService.getAllActiveJobs());
    }

    @GetMapping("/company/{companyId}")
    public ResponseEntity<List<JobResponse>> getJobsByCompany(
            @PathVariable UUID companyId) {
        return ResponseEntity.ok(
                jobService.getJobsByCompany(companyId)
        );
    }

    @GetMapping("/company/{companyId}/all")
    public ResponseEntity<List<JobResponse>> getAllJobsByCompany(
            @PathVariable UUID companyId) {
        return ResponseEntity.ok(
                jobService.getAllJobsByCompany(companyId)
        );
    }

    @PatchMapping("/{id}")
    public ResponseEntity<JobResponse> updateJob(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> updates) {
        return jobService.updateJob(id, updates)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(
            @PathVariable UUID id) {
        boolean deleted = jobService.deleteJob(id);
        return deleted
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    // ─── APPLICANTS ───────────────────────────────────────────
    // Returns all applicants for a job, enriched with full candidate profile.
    // Scoped to the authenticated recruiter's own company.
    @GetMapping("/{id}/applicants")
    public ResponseEntity<List<ApplicantResponse>> getApplicants(
            @PathVariable UUID id,
            Authentication auth) {
        UUID recruiterId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(jobService.getApplicants(id, recruiterId));
    }

}
