package com.smarthire.gateway.dto.response;

import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class ApplicationResponse {
    private UUID id;
    private UUID jobId;
    private String jobTitle;
    private UUID userId;
    private String userFullName;
    private UUID resumeId;
    private BigDecimal nlpScore;
    private String scoreBreakdown;
    private String status;
    private String rankingVersion;
    private OffsetDateTime appliedAt;
    private OffsetDateTime rankedAt;
}