package com.smarthire.gateway.service;

import com.smarthire.gateway.dto.request.UserRequest;
import com.smarthire.gateway.dto.response.UserResponse;
import com.smarthire.gateway.model.Company;
import com.smarthire.gateway.model.User;
import com.smarthire.gateway.repository.CompanyRepository;
import com.smarthire.gateway.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    private static final List<String> VALID_ROLES =
            List.of("candidate", "recruiter", "admin");

    private static final List<String> VALID_PROVIDERS =
            List.of("github", "google");

    // ─── CREATE ───────────────────────────────────────────

    @Transactional
    public UserResponse createUser(UserRequest request) {
        validateRole(request.getRole());
        validateOauthProvider(request.getOauthProvider());
        validateEmail(request.getEmail());
        validateOauthUniqueness(
                request.getOauthProvider(),
                request.getOauthId()
        );

        Company company = resolveCompany(request.getCompanyId());
        validateRecruiterHasCompany(request.getRole(), company);
        validateCandidateHasNoCompany(request.getRole(), company);

        User user = new User();
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setRole(request.getRole());
        user.setOauthProvider(request.getOauthProvider());
        user.setOauthId(request.getOauthId());
        user.setAvatarUrl(request.getAvatarUrl());
        user.setCompany(company);

        return toResponse(userRepository.save(user));
    }

    // ─── READ ─────────────────────────────────────────────

    public Optional<UserResponse> getUserById(UUID id) {
        return userRepository.findById(id)
                .map(this::toResponse);
    }

    public Optional<UserResponse> getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .map(this::toResponse);
    }

    public Optional<UserResponse> getUserByOauth(
            String provider, String oauthId) {
        return userRepository
                .findByOauthProviderAndOauthId(provider, oauthId)
                .map(this::toResponse);
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── UPDATE ───────────────────────────────────────────

    @Transactional
    public Optional<UserResponse> updateUser(
            UUID id, Map<String, String> updates) {
        return userRepository.findById(id).map(user -> {
            if (updates.containsKey("fullName")) {
                user.setFullName(updates.get("fullName"));
            }
            if (updates.containsKey("avatarUrl")) {
                user.setAvatarUrl(updates.get("avatarUrl"));
            }
            if (updates.containsKey("companyId")) {
                UUID companyId = UUID.fromString(
                        updates.get("companyId")
                );
                Company company = companyRepository
                        .findById(companyId)
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Company with id "
                                        + companyId + " not found"
                        ));
                user.setCompany(company);
            }
            return toResponse(userRepository.save(user));
        });
    }

    // ─── DELETE ───────────────────────────────────────────

    @Transactional
    public boolean deleteUser(UUID id) {
        if (!userRepository.existsById(id)) {
            return false;
        }
        userRepository.deleteById(id);
        return true;
    }

    // ─── MAPPING ──────────────────────────────────────────

    private UserResponse toResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFullName(user.getFullName());
        response.setRole(user.getRole());
        response.setOauthProvider(user.getOauthProvider());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setCreatedAt(user.getCreatedAt());
        if (user.getCompany() != null) {
            response.setCompanyId(user.getCompany().getId());
            response.setCompanyName(user.getCompany().getName());
        }
        return response;
    }

    // ─── HELPERS ──────────────────────────────────────────

    private Company resolveCompany(UUID companyId) {
        if (companyId == null) return null;
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Company with id " + companyId + " not found"
                ));
    }

    // ─── VALIDATORS ───────────────────────────────────────

    private void validateRole(String role) {
        if (role == null || !VALID_ROLES.contains(role)) {
            throw new IllegalArgumentException(
                    "Invalid role. Must be one of: " + VALID_ROLES
            );
        }
    }

    private void validateOauthProvider(String provider) {
        if (provider == null || !VALID_PROVIDERS.contains(provider)) {
            throw new IllegalArgumentException(
                    "Invalid oauth provider. Must be one of: "
                            + VALID_PROVIDERS
            );
        }
    }

    private void validateEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "Email cannot be empty"
            );
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException(
                    "User with email " + email + " already exists"
            );
        }
    }

    private void validateOauthUniqueness(
            String provider, String oauthId) {
        if (userRepository.findByOauthProviderAndOauthId(
                provider, oauthId).isPresent()) {
            throw new IllegalArgumentException(
                    "User with " + provider + " account already exists"
            );
        }
    }

    private void validateRecruiterHasCompany(
            String role, Company company) {
        if ("recruiter".equals(role) && company == null) {
            throw new IllegalArgumentException(
                    "Recruiter must be associated with a company"
            );
        }
    }

    private void validateCandidateHasNoCompany(
            String role, Company company) {
        if ("candidate".equals(role) && company != null) {
            throw new IllegalArgumentException(
                    "Candidate cannot be associated with a company"
            );
        }
    }
}