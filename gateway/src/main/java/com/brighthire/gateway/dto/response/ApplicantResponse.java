package com.brighthire.gateway.dto.response;

import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class ApplicantResponse {

    // ── Identity ──────────────────────────────────────────
    private UUID userId;
    private String fullName;
    private String avatarUrl;
    private String email;

    // ── Application metadata ──────────────────────────────
    private UUID applicationId;
    private String applicationStatus;
    private OffsetDateTime appliedAt;
    private BigDecimal nlpScore;
    private String scoreBreakdown;

    // ── Candidate profile ─────────────────────────────────
    private String headline;
    private String summary;
    private String location;
    private Integer yearsOfExperience;
    private List<String> skills;
    private String linkedinUrl;
    private String githubUrl;
    private String portfolioUrl;
    private String phone;

    // ── Resume ────────────────────────────────────────────
    private UUID resumeId;
    private String resumeFileUrl;
    private Integer resumeFileSizeKb;
}
