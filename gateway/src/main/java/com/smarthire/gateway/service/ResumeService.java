package com.smarthire.gateway.service;

import com.smarthire.gateway.dto.request.ResumeRequest;
import com.smarthire.gateway.dto.response.ResumeResponse;
import com.smarthire.gateway.model.Resume;
import com.smarthire.gateway.model.User;
import com.smarthire.gateway.repository.ResumeRepository;
import com.smarthire.gateway.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;

    private static final int MAX_FILE_SIZE_KB = 5120;

    // ─── CREATE OR UPDATE ─────────────────────────────────
    // If candidate already has a resume — update it
    // If not — create a new one
    // This is idempotent — safe to call multiple times

    @Transactional
    public ResumeResponse saveResume(ResumeRequest request) {
        validateUserId(request.getUserId());
        validateFileUrl(request.getFileUrl());
        validateFileSize(request.getFileSizeKb());
        validateRawText(request.getRawText());

        User user = resolveCandidate(request.getUserId());

        Resume resume = resumeRepository
                .findByUserId(request.getUserId())
                .orElse(new Resume());

        resume.setUser(user);
        resume.setRawText(request.getRawText());
        resume.setFileUrl(request.getFileUrl());
        resume.setFileSizeKb(request.getFileSizeKb());

        Resume saved = resumeRepository.save(resume);
        resumeRepository.flush();
        return toResponse(resumeRepository
                .findById(saved.getId()).get());
    }

    // ─── READ ─────────────────────────────────────────────

    public Optional<ResumeResponse> getResumeById(UUID id) {
        return resumeRepository.findById(id)
                .map(this::toResponse);
    }

    public Optional<ResumeResponse> getResumeByUserId(UUID userId) {
        return resumeRepository.findByUserId(userId)
                .map(this::toResponse);
    }

    public List<ResumeResponse> getAllResumes() {
        return resumeRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── DELETE ───────────────────────────────────────────

    @Transactional
    public boolean deleteResume(UUID id) {
        if (!resumeRepository.existsById(id)) {
            return false;
        }
        resumeRepository.deleteById(id);
        return true;
    }

    // ─── MAPPING ──────────────────────────────────────────

    private ResumeResponse toResponse(Resume resume) {
        ResumeResponse response = new ResumeResponse();
        response.setId(resume.getId());
        response.setFileUrl(resume.getFileUrl());
        response.setFileSizeKb(resume.getFileSizeKb());
        response.setRawText(resume.getRawText());
        response.setUpdatedAt(resume.getUpdatedAt());
        if (resume.getUser() != null) {
            response.setUserId(resume.getUser().getId());
            response.setUserFullName(resume.getUser().getFullName());
        }
        return response;
    }

    // ─── HELPERS ──────────────────────────────────────────

    private User resolveCandidate(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User with id " + userId + " not found"
                ));
        if (!"candidate".equals(user.getRole())) {
            throw new IllegalArgumentException(
                    "Only candidates can upload resumes"
            );
        }
        return user;
    }

    // ─── VALIDATORS ───────────────────────────────────────

    private void validateUserId(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException(
                    "User ID is required"
            );
        }
    }

    private void validateFileUrl(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            throw new IllegalArgumentException(
                    "File URL cannot be empty"
            );
        }
    }

    private void validateFileSize(Integer fileSizeKb) {
        if (fileSizeKb == null || fileSizeKb <= 0) {
            throw new IllegalArgumentException(
                    "File size must be greater than 0"
            );
        }
        if (fileSizeKb > MAX_FILE_SIZE_KB) {
            throw new IllegalArgumentException(
                    "File size exceeds maximum allowed size of "
                            + MAX_FILE_SIZE_KB + " KB"
            );
        }
    }

    private void validateRawText(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            throw new IllegalArgumentException(
                    "Resume text cannot be empty"
            );
        }
    }
}