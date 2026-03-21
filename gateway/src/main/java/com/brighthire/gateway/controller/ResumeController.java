package com.brighthire.gateway.controller;

import com.brighthire.gateway.dto.request.ResumeRequest;
import com.brighthire.gateway.dto.response.ResumeResponse;
import com.brighthire.gateway.service.ResumeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/resumes")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeService resumeService;

    @PostMapping
    public ResponseEntity<ResumeResponse> saveResume(
            @RequestBody ResumeRequest request) {
        ResumeResponse response = resumeService.saveResume(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResume(
            @PathVariable UUID id) {
        boolean deleted = resumeService.deleteResume(id);
        return deleted
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}