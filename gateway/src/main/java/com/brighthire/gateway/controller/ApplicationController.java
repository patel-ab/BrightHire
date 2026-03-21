package com.brighthire.gateway.controller;

import com.brighthire.gateway.dto.request.ApplicationRequest;
import com.brighthire.gateway.dto.response.ApplicationResponse;
import com.brighthire.gateway.service.ApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @PostMapping
    public ResponseEntity<ApplicationResponse> createApplication(
            @RequestBody ApplicationRequest request) {
        ApplicationResponse response =
                applicationService.createApplication(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> getApplicationById(
            @PathVariable UUID id) {
        return applicationService.getApplicationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<ApplicationResponse>> getApplicationsByJob(
            @PathVariable UUID jobId) {
        return ResponseEntity.ok(
                applicationService.getApplicationsByJob(jobId)
        );
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ApplicationResponse>> getApplicationsByUser(
            @PathVariable UUID userId) {
        return ResponseEntity.ok(
                applicationService.getApplicationsByUser(userId)
        );
    }

    @GetMapping("/job/{jobId}/status/{status}")
    public ResponseEntity<List<ApplicationResponse>> getByJobAndStatus(
            @PathVariable UUID jobId,
            @PathVariable String status) {
        return ResponseEntity.ok(
                applicationService.getApplicationsByJobAndStatus(
                        jobId, status)
        );
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApplicationResponse> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        return applicationService.updateStatus(id, status)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/withdraw")
    public ResponseEntity<ApplicationResponse> withdraw(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        UUID userId = UUID.fromString(body.get("userId"));
        return applicationService.withdraw(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}