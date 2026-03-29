package com.brighthire.gateway.service;

import com.brighthire.gateway.dto.request.CandidateProfileRequest;
import com.brighthire.gateway.dto.response.CandidateProfileResponse;
import com.brighthire.gateway.model.CandidateProfile;
import com.brighthire.gateway.model.Resume;
import com.brighthire.gateway.model.User;
import com.brighthire.gateway.repository.CandidateProfileRepository;
import com.brighthire.gateway.repository.ResumeRepository;
import com.brighthire.gateway.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CandidateProfileService {

    private final CandidateProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;

    // ─── GET ──────────────────────────────────────────────
    // Returns the profile for the given userId.
    // If no profile exists yet, returns a response hydrated from the
    // User record alone — so the frontend always gets a usable response.

    @Transactional(readOnly = true)
    public CandidateProfileResponse getProfile(UUID userId) {
        User user = resolveCandidate(userId);
        Optional<CandidateProfile> profileOpt = profileRepository.findByUserId(userId);
        Optional<Resume> resumeOpt = resumeRepository.findByUserId(userId);
        return toResponse(user, profileOpt.orElse(null), resumeOpt.orElse(null));
    }

    // ─── UPSERT ───────────────────────────────────────────
    // Creates the profile on first save; updates it on subsequent saves.
    // Skills list replaces the previous list entirely — clean, no partial merging.

    @Transactional
    public CandidateProfileResponse upsertProfile(UUID userId, CandidateProfileRequest request) {
        User user = resolveCandidate(userId);

        CandidateProfile profile = profileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    CandidateProfile p = new CandidateProfile();
                    p.setUser(user);
                    return p;
                });

        // Apply all updatable fields — null values are allowed to clear fields
        profile.setPhone(trimOrNull(request.getPhone()));
        profile.setHeadline(trimOrNull(request.getHeadline()));
        profile.setSummary(trimOrNull(request.getSummary()));
        profile.setLocation(trimOrNull(request.getLocation()));
        profile.setYearsOfExperience(request.getYearsOfExperience());
        profile.setLinkedinUrl(trimOrNull(request.getLinkedinUrl()));
        profile.setGithubUrl(trimOrNull(request.getGithubUrl()));
        profile.setPortfolioUrl(trimOrNull(request.getPortfolioUrl()));

        // Replace skills list — must be a mutable list for Hibernate @ElementCollection
        profile.setSkills(
                request.getSkills() != null
                        ? request.getSkills().stream()
                                .filter(s -> s != null && !s.isBlank())
                                .distinct()
                                .collect(java.util.stream.Collectors.toCollection(ArrayList::new))
                        : new ArrayList<>()
        );

        CandidateProfile saved = profileRepository.save(profile);
        Optional<Resume> resumeOpt = resumeRepository.findByUserId(userId);
        return toResponse(user, saved, resumeOpt.orElse(null));
    }

    // ─── MAPPING ──────────────────────────────────────────

    private CandidateProfileResponse toResponse(
            User user,
            CandidateProfile profile,
            Resume resume) {

        CandidateProfileResponse r = new CandidateProfileResponse();

        // User fields — always present
        r.setUserId(user.getId());
        r.setFullName(user.getFullName());
        r.setEmail(user.getEmail());
        r.setAvatarUrl(user.getAvatarUrl());

        if (profile != null) {
            r.setProfileId(profile.getId());
            r.setPhone(profile.getPhone());
            r.setHeadline(profile.getHeadline());
            r.setSummary(profile.getSummary());
            r.setLocation(profile.getLocation());
            r.setYearsOfExperience(profile.getYearsOfExperience());
            r.setLinkedinUrl(profile.getLinkedinUrl());
            r.setGithubUrl(profile.getGithubUrl());
            r.setPortfolioUrl(profile.getPortfolioUrl());
            r.setSkills(profile.getSkills());
            r.setUpdatedAt(profile.getUpdatedAt());
        } else {
            r.setSkills(new ArrayList<>());
        }

        if (resume != null) {
            CandidateProfileResponse.ResumeInfo ri = new CandidateProfileResponse.ResumeInfo();
            ri.setResumeId(resume.getId());
            ri.setFileUrl(resume.getFileUrl());
            ri.setFileSizeKb(resume.getFileSizeKb());
            ri.setUpdatedAt(resume.getUpdatedAt());
            r.setResume(ri);
        }

        return r;
    }

    // ─── HELPERS ──────────────────────────────────────────

    private User resolveCandidate(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User not found: " + userId));
        if (!"candidate".equals(user.getRole())) {
            throw new IllegalArgumentException(
                    "Profile endpoint is only available to candidates");
        }
        return user;
    }

    private String trimOrNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
