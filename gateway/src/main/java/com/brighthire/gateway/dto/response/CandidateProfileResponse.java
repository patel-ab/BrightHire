package com.brighthire.gateway.dto.response;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class CandidateProfileResponse {

    private UUID profileId;

    // ── From User ─────────────────────────────────────────
    private UUID userId;
    private String fullName;
    private String email;
    private String avatarUrl;

    // ── Core profile fields ───────────────────────────────
    private String phone;
    private String headline;
    private String summary;
    private String location;
    private Integer yearsOfExperience;

    // ── Links ─────────────────────────────────────────────
    private String linkedinUrl;
    private String githubUrl;
    private String portfolioUrl;

    // ── Skills ────────────────────────────────────────────
    private List<String> skills;

    // ── Resume ────────────────────────────────────────────
    // Inlined from the existing resume record — avoids duplicating resume data.
    // null = no resume uploaded yet.
    private ResumeInfo resume;

    // ── Meta ──────────────────────────────────────────────
    private OffsetDateTime updatedAt;

    @Data
    public static class ResumeInfo {
        private UUID resumeId;
        private String fileUrl;
        private Integer fileSizeKb;
        private OffsetDateTime updatedAt;
    }
}
