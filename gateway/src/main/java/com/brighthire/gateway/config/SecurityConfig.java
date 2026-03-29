package com.brighthire.gateway.config;

import com.brighthire.gateway.security.JwtAuthFilter;
import com.brighthire.gateway.security.OAuthSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final OAuthSuccessHandler oAuthSuccessHandler;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                .csrf(csrf -> csrf.disable())

                .formLogin(form -> form.disable())

                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                )

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/auth/**",
                                "/login/**",
                                "/login/oauth2/**",
                                "/oauth2/**"
                        ).permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/jobs").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/jobs/{id}").permitAll()

                        .requestMatchers("/api/companies/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/jobs").hasAnyRole("RECRUITER", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/jobs/**").hasAnyRole("RECRUITER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/jobs/**").hasAnyRole("RECRUITER", "ADMIN")
                        .requestMatchers("/api/jobs/*/applicants").hasAnyRole("RECRUITER", "ADMIN")

                        .requestMatchers("/api/resumes/*/signed-url").hasAnyRole("CANDIDATE", "RECRUITER", "ADMIN")
                        .requestMatchers("/api/resumes/**").hasAnyRole("CANDIDATE", "ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/applications").hasRole("CANDIDATE")
                        .requestMatchers(HttpMethod.GET, "/api/applications/user/**").hasAnyRole("CANDIDATE", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/applications/job/**").hasAnyRole("RECRUITER", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/applications/*/status").hasAnyRole("RECRUITER", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/applications/*/withdraw").hasRole("CANDIDATE")
                        .requestMatchers(HttpMethod.PATCH, "/api/applications/*/recruiter-status").hasAnyRole("RECRUITER", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/applications/*/candidate-response").hasRole("CANDIDATE")

                        .requestMatchers("/api/candidate-profile/**").hasRole("CANDIDATE")

                        .requestMatchers("/api/notifications/**").authenticated()

                        .anyRequest().authenticated()
                )

                .oauth2Login(oauth -> oauth
                        .successHandler(oAuthSuccessHandler)
                        .failureHandler(new SimpleUrlAuthenticationFailureHandler(
                                frontendUrl + "/auth/callback?error=login_failed"
                        ))
                )

                .addFilterBefore(
                        jwtAuthFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(frontendUrl));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
