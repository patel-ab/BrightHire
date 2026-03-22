package com.brighthire.gateway.config;

import com.brighthire.gateway.security.JwtAuthFilter;
import com.brighthire.gateway.security.OAuthSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final OAuthSuccessHandler oAuthSuccessHandler;

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http) throws Exception {

        http
                // ── CSRF ──────────────────────────────────────
                .csrf(csrf -> csrf.disable())

                // ── SESSION ───────────────────────────────────
                .sessionManagement(session -> session
                        .sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                // ── ROUTE PERMISSIONS ─────────────────────────
                .authorizeHttpRequests(auth -> auth

                        // Public routes — no token needed
                        .requestMatchers(
                                "/auth/**",
                                "/login/**",
                                "/login/oauth2/**",
                                "/oauth2/**"
                        ).permitAll()

                        // Job listing — candidates browse freely
                        .requestMatchers(
                                HttpMethod.GET, "/api/jobs"
                        ).permitAll()

                        .requestMatchers(
                                HttpMethod.GET, "/api/jobs/{id}"
                        ).permitAll()

                        // Company routes — admin only
                        .requestMatchers(
                                "/api/companies/**"
                        ).hasRole("ADMIN")

                        // Job management — recruiters only
                        .requestMatchers(
                                HttpMethod.POST, "/api/jobs"
                        ).hasAnyRole("RECRUITER", "ADMIN")

                        .requestMatchers(
                                HttpMethod.PATCH, "/api/jobs/**"
                        ).hasAnyRole("RECRUITER", "ADMIN")

                        .requestMatchers(
                                HttpMethod.DELETE, "/api/jobs/**"
                        ).hasAnyRole("RECRUITER", "ADMIN")

                        // Shortlist — recruiters only
                        .requestMatchers(
                                "/api/jobs/{id}/shortlist"
                        ).hasAnyRole("RECRUITER", "ADMIN")

                        // Resume — candidates only
                        .requestMatchers(
                                "/api/resumes/**"
                        ).hasAnyRole("CANDIDATE", "ADMIN")

                        // Applications — candidates and recruiters
                        .requestMatchers(
                                HttpMethod.POST, "/api/applications"
                        ).hasRole("CANDIDATE")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/applications/user/**"
                        ).hasAnyRole("CANDIDATE", "ADMIN")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/applications/job/**"
                        ).hasAnyRole("RECRUITER", "ADMIN")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/applications/**/status"
                        ).hasAnyRole("RECRUITER", "ADMIN")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/applications/**/withdraw"
                        ).hasRole("CANDIDATE")

                        // Notifications — authenticated users
                        .requestMatchers(
                                "/api/notifications/**"
                        ).authenticated()

                        // Everything else — must be logged in
                        .anyRequest().authenticated()
                )

                // ── OAUTH2 LOGIN ──────────────────────────────
                .oauth2Login(oauth -> oauth
                        .successHandler(oAuthSuccessHandler)
                )

                // ── JWT FILTER ────────────────────────────────
                .addFilterBefore(
                        jwtAuthFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}