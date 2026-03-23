package com.brighthire.gateway.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RankingCompleteEvent {
    private UUID applicationId;
    private UUID jobId;
    private UUID userId;
    private BigDecimal nlpScore;
    private String scoreBreakdown;
    private String rankingVersion;
}