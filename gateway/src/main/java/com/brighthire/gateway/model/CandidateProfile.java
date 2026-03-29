package com.brighthire.gateway.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Entity
@Table(name = "candidate_profiles")
public class CandidateProfile {

    @EqualsAndHashCode.Include
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // One-to-one with users — each candidate has at most one profile
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // ── Core fields ───────────────────────────────────────
    @Column(length = 20)
    private String phone;

    @Column(length = 200)
    private String headline;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(length = 150)
    private String location;

    @Column(name = "years_of_experience")
    private Integer yearsOfExperience;

    // ── Links ─────────────────────────────────────────────
    @Column(name = "linkedin_url")
    private String linkedinUrl;

    @Column(name = "github_url")
    private String githubUrl;

    @Column(name = "portfolio_url")
    private String portfolioUrl;

    // ── Skills ────────────────────────────────────────────
    // Stored in a separate join table — mirrors job_required_skills pattern.
    // Normalized so skills are individually queryable and filterable.
    @ElementCollection
    @CollectionTable(
            name = "candidate_skills",
            joinColumns = @JoinColumn(name = "profile_id")
    )
    @Column(name = "skill", length = 100)
    private List<String> skills = new ArrayList<>();

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
