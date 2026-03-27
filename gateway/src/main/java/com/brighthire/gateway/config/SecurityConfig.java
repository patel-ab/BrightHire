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
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session -> session
                        .sessionCreationPolicy(
                                SessionCreationPolicy.IF_REQUIRED
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(
                                "/auth/**",
                                "/login/**",
                                "/login/oauth2/**",
                                "/oauth2/**"
                        ).permitAll()

                        .requestMatchers(
                                HttpMethod.GET, "/api/jobs"
                        ).permitAll()

                        .requestMatchers(
                                HttpMethod.GET, "/api/jobs/{id}"
                        ).permitAll()

                        .requestMatchers(
                                "/api/companies/**"
                        ).hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.POST, "/api/jobs"
                        ).hasAnyRole("RECRUITER", "ADMIN")

                        .requestMatchers(
                                HttpMethod.PATCH, "/api/jobs/**"
                        ).hasAnyRole("RECRUITER", "ADMIN")

                        .requestMatchers(
                                HttpMethod.DELETE, "/api/jobs/**"
                        ).hasAnyRole("RECRUITER", "ADMIN")

                        .requestMatchers(
                                "/api/jobs/*/shortlist"
                        ).hasAnyRole("RECRUITER", "ADMIN")

                        .requestMatchers(
                                "/api/resumes/**"
                        ).hasAnyRole("CANDIDATE", "ADMIN")

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
                                "/api/applications/*/status"
                        ).hasAnyRole("RECRUITER", "ADMIN")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/applications/*/withdraw"
                        ).hasRole("CANDIDATE")

                        .requestMatchers(
                                "/api/notifications/**"
                        ).authenticated()

                        .anyRequest().authenticated()
                )

                .oauth2Login(oauth -> oauth
                        .successHandler(oAuthSuccessHandler)
                )

                .addFilterBefore(
                        jwtAuthFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}