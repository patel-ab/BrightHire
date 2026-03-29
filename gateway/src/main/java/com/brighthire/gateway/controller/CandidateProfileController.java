package com.brighthire.gateway.controller;

import com.brighthire.gateway.dto.request.CandidateProfileRequest;
import com.brighthire.gateway.dto.response.CandidateProfileResponse;
import com.brighthire.gateway.service.CandidateProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/candidate-profile")
@RequiredArgsConstructor
public class CandidateProfileController {

    private final CandidateProfileService profileService;

    // GET /api/candidate-profile/me
    // Returns the current candidate's profile. Creates a hydrated response
    // from the User record even if no profile row exists yet.
    @GetMapping("/me")
    public ResponseEntity<CandidateProfileResponse> getMyProfile(
            Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(profileService.getProfile(userId));
    }

    // PUT /api/candidate-profile/me
    // Creates or fully updates the current candidate's profile.
    @PutMapping("/me")
    public ResponseEntity<CandidateProfileResponse> upsertMyProfile(
            Authentication auth,
            @RequestBody CandidateProfileRequest request) {
        UUID userId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(profileService.upsertProfile(userId, request));
    }
}
