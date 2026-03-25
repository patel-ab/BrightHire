
package com.brighthire.gateway.dto.response;

import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class ShortlistResponse {

    private UUID userId;
    private String userFullName;
    private String userAvatarUrl;

    private UUID applicationId;
    private UUID resumeId;

    private BigDecimal nlpScore;
    private String scoreBreakdown;
    private String rankingVersion;

    private OffsetDateTime appliedAt;
    private OffsetDateTime rankedAt;

    private int rank;  // 1-based rank position in shortlist
}