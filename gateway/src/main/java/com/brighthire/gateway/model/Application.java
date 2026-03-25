package com.brighthire.gateway.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "applications",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"job_id", "user_id"}
        ))
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false)
    private Resume resume;

    @Column(name = "nlp_score")
    private BigDecimal nlpScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "score_breakdown", columnDefinition = "jsonb")
    private String scoreBreakdown;

    @Column(nullable = false, length = 20)
    private String status = "applied";

    @Column(name = "ranking_version", length = 100)
    private String rankingVersion;

    @CreationTimestamp
    @Column(name = "applied_at", updatable = false)
    private OffsetDateTime appliedAt;

    @Column(name = "ranked_at")
    private OffsetDateTime rankedAt;
}