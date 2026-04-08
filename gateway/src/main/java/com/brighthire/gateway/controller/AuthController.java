package com.brighthire.gateway.controller;

import com.brighthire.gateway.model.User;
import com.brighthire.gateway.repository.UserRepository;
import com.brighthire.gateway.security.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RedisTemplate<String, String> redisTemplate;


    // ─── LOGIN ENDPOINTS ──────────────────────────────────────
    // GitHub → candidate only
    // Google → recruiter only
    // Role is derived from provider in OAuthSuccessHandler — no session needed

    @GetMapping("/login/candidate/github")
    public void candidateGithubLogin(
            HttpServletResponse response) throws IOException {
        response.sendRedirect("/oauth2/authorization/github");
    }

    @GetMapping("/login/recruiter/google")
    public void recruiterGoogleLogin(
            HttpServletResponse response) throws IOException {
        response.sendRedirect("/oauth2/authorization/google");
    }

    // ─── REFRESH TOKEN ────────────────────────────────────
    // Frontend calls this when access token expires
    // Reads refresh token from httpOnly cookie
    // Returns new access token

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(
            HttpServletRequest request) {

        // Step 1 — read refresh token from cookie
        String refreshToken = extractRefreshCookie(request);

        if (refreshToken == null) {
            return ResponseEntity
                    .status(401)
                    .body(Map.of("error",
                            "No refresh token found"));
        }

        // Step 2 — validate the refresh token
        if (!jwtService.validateToken(refreshToken)
                || !jwtService.isRefreshToken(refreshToken)) {
            return ResponseEntity
                    .status(401)
                    .body(Map.of("error",
                            "Invalid refresh token"));
        }

        // Step 3 — check Redis — is this token still active?
        UUID userId = jwtService.extractUserId(refreshToken);
        String redisKey = "refresh:" + userId;
        String storedToken = redisTemplate
                .opsForValue()
                .get(redisKey);

        if (storedToken == null
                || !storedToken.equals(refreshToken)) {
            return ResponseEntity
                    .status(401)
                    .body(Map.of("error",
                            "Refresh token revoked or expired"));
        }

        // Step 4 — load user from DB to get current role
        User user = userRepository.findById(userId)
                .orElse(null);

        if (user == null) {
            return ResponseEntity
                    .status(401)
                    .body(Map.of("error", "User not found"));
        }

        // Step 5 — issue new access token
        String newAccessToken = jwtService.generateAccessToken(
                user.getId(),
                user.getEmail(),
                user.getRole()
        );

        Map<String, String> responseBody = new HashMap<>();
        responseBody.put("accessToken", newAccessToken);
        responseBody.put("role", user.getRole());

        return ResponseEntity.ok(responseBody);
    }

    // ─── LOGOUT ───────────────────────────────────────────
    // Deletes refresh token from Redis
    // Clears the httpOnly cookie
    // Access token expires naturally after 15 min

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            HttpServletRequest request,
            HttpServletResponse response) {

        // Step 1 — read refresh token from cookie
        String refreshToken = extractRefreshCookie(request);

        if (refreshToken != null
                && jwtService.validateToken(refreshToken)) {

            // Step 2 — delete from Redis
            UUID userId = jwtService.extractUserId(refreshToken);
            redisTemplate.delete("refresh:" + userId);
        }

        // Step 3 — clear the cookie from browser
        Cookie clearedCookie = new Cookie("refresh_token", "");
        clearedCookie.setHttpOnly(true);
        clearedCookie.setPath("/");
        clearedCookie.setMaxAge(0);
        response.addCookie(clearedCookie);

        return ResponseEntity.ok(
                Map.of("message", "Logged out successfully")
        );
    }

    // ─── GET CURRENT USER ─────────────────────────────────
    // Frontend calls this after login to get user profile
    // Reads userId from JWT via Security Context

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(
            HttpServletRequest request) {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null
                || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity
                    .status(401)
                    .body(Map.of("error", "No token provided"));
        }

        String token = authHeader.substring(7);

        if (!jwtService.validateToken(token)
                || !jwtService.isAccessToken(token)) {
            return ResponseEntity
                    .status(401)
                    .body(Map.of("error", "Invalid token"));
        }

        UUID userId = jwtService.extractUserId(token);
        User user = userRepository.findById(userId)
                .orElse(null);

        if (user == null) {
            return ResponseEntity
                    .status(404)
                    .body(Map.of("error", "User not found"));
        }

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("id", user.getId());
        responseBody.put("email", user.getEmail());
        responseBody.put("fullName", user.getFullName());
        responseBody.put("role", user.getRole());
        responseBody.put("avatarUrl", user.getAvatarUrl());
        if (user.getCompany() != null) {
            responseBody.put("companyId",
                    user.getCompany().getId());
            responseBody.put("companyName",
                    user.getCompany().getName());
        }

        return ResponseEntity.ok(responseBody);
    }

    // ─── PRIVATE HELPER ───────────────────────────────────
    // Reads the refresh token from the httpOnly cookie

    private String extractRefreshCookie(
            HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;

        return Arrays.stream(cookies)
                .filter(c -> "refresh_token".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}