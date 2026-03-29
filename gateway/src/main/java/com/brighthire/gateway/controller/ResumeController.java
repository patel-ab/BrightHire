package com.brighthire.gateway.controller;

import com.brighthire.gateway.dto.response.ResumeResponse;
import com.brighthire.gateway.service.ResumeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;

@RestController
@RequestMapping("/api/resumes")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeService resumeService;

    // ─── UPLOAD ───────────────────────────────────────────
    // Accepts multipart/form-data with PDF file + userId
    // Replaces old JSON POST endpoint

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ResumeResponse> uploadResume(
            @RequestParam("userId") UUID userId,
            @RequestParam("file") MultipartFile file) {
        ResumeResponse response =
                resumeService.uploadResume(userId, file);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResumeResponse> getResumeById(
            @PathVariable UUID id) {
        return resumeService.getResumeById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ResumeResponse> getResumeByUserId(
            @PathVariable UUID userId) {
        return resumeService.getResumeByUserId(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<ResumeResponse>> getAllResumes() {
        return ResponseEntity.ok(resumeService.getAllResumes());
    }

    // Returns a 15-minute pre-signed S3 URL for the resume PDF.
    // Accessible to both candidates (own resume) and recruiters (applicant review).
    @GetMapping("/{id}/signed-url")
    public ResponseEntity<Map<String, String>> getSignedUrl(
            @PathVariable UUID id) {
        String url = resumeService.generateSignedUrl(id);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResume(
            @PathVariable UUID id) {
        boolean deleted = resumeService.deleteResume(id);
        return deleted
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}