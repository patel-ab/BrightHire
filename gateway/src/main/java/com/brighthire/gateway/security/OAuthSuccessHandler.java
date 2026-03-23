package com.brighthire.gateway.security;

import com.brighthire.gateway.model.Company;
import com.brighthire.gateway.model.User;
import com.brighthire.gateway.repository.CompanyRepository;
import com.brighthire.gateway.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.data.redis.core.RedisTemplate;
import java.util.concurrent.TimeUnit;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OAuthSuccessHandler
        extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final JwtService jwtService;
    private final RedisTemplate<String, String> redisTemplate;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    // ─── MAIN METHOD ──────────────────────────────────────
    // Spring calls this automatically after OAuth succeeds

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication)
            throws IOException {

        // Step 1 — get the user data GitHub/Google returned
        OAuth2User oAuth2User =
                (OAuth2User) authentication.getPrincipal();

        // Step 2 — figure out which provider this is
        String provider = extractProvider(request);

        // Step 3 — extract profile data from provider response
        Map<String, Object> attributes =
                oAuth2User.getAttributes();

        String oauthId = extractOauthId(attributes, provider);
        String email = extractEmail(attributes, provider);
        String fullName = extractFullName(attributes, provider);
        String avatarUrl = extractAvatarUrl(attributes, provider);

        // Step 4 — find existing user or create new one
        User user = findOrCreateUser(
                provider, oauthId, email, fullName, avatarUrl, attributes
        );

        // Step 5 — generate JWT tokens
        String accessToken = jwtService.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole()
        );
        String refreshToken = jwtService.generateRefreshToken(
                user.getId()
        );

        // Step 5b — store refresh token in Redis
        redisTemplate.opsForValue().set(
                "refresh:" + user.getId(),
                refreshToken,
                7,
                TimeUnit.DAYS
        );

        // Step 6 — send refresh token as httpOnly cookie
        Cookie refreshCookie = new Cookie(
                "refresh_token", refreshToken
        );
        refreshCookie.setHttpOnly(true);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(7 * 24 * 60 * 60);
        response.addCookie(refreshCookie);

        // Step 7 — redirect frontend with access token in URL
        String redirectUrl = frontendUrl
                + "/auth/callback?token="
                + accessToken
                + "&role="
                + user.getRole();

        getRedirectStrategy().sendRedirect(
                request, response, redirectUrl
        );
    }

    // ─── FIND OR CREATE USER ──────────────────────────────
    // Core logic — existing user = log in
    //              new user = create account

    private User findOrCreateUser(
            String provider,
            String oauthId,
            String email,
            String fullName,
            String avatarUrl,
            Map<String, Object> attributes) {

        // Check if user already exists with this OAuth account
        Optional<User> existingUser = userRepository
                .findByOauthProviderAndOauthId(provider, oauthId);

        if (existingUser.isPresent()) {
            // User exists — update their avatar in case it changed
            User user = existingUser.get();
            user.setAvatarUrl(avatarUrl);
            return userRepository.save(user);
        }

        // New user — create their account
        User newUser = new User();
        newUser.setEmail(email);
        newUser.setFullName(fullName);
        newUser.setOauthProvider(provider);
        newUser.setOauthId(oauthId);
        newUser.setAvatarUrl(avatarUrl);

        // Determine role and company based on provider
        if ("google".equals(provider)) {
            String domain = extractDomain(email);
            Company company;

            if ("gmail.com".equals(domain)) {
                // Personal Gmail account
                // Hardcoded TEST company for development
                company = companyRepository
                        .findByDomain("test.com")
                        .orElseGet(() -> {
                            Company testCompany = new Company();
                            testCompany.setName("TEST Company");
                            testCompany.setDomain("test.com");
                            testCompany.setPlan("free");
                            return companyRepository.save(testCompany);
                        });
            } else {
                // Company Google Workspace account
                // Look up by domain
                company = companyRepository
                        .findByDomain(domain)
                        .orElse(null);
            }

            newUser.setRole("recruiter");
            newUser.setCompany(company);

        } else {
            // GitHub login = candidate
            newUser.setRole("candidate");
            newUser.setCompany(null);
        }

        return userRepository.save(newUser);
    }

    // ─── EXTRACT PROVIDER ─────────────────────────────────
    // Reads the URL to figure out if this is GitHub or Google
    // /login/oauth2/code/github → github
    // /login/oauth2/code/google → google

    private String extractProvider(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri.contains("github")) return "github";
        if (uri.contains("google")) return "google";
        throw new IllegalArgumentException(
                "Unknown OAuth provider from URI: " + uri
        );
    }

    // ─── EXTRACT OAUTH ID ─────────────────────────────────
    // GitHub returns id as Integer
    // Google returns id as String
    // We normalise both to String

    private String extractOauthId(
            Map<String, Object> attributes, String provider) {
        if ("github".equals(provider)) {
            return String.valueOf(attributes.get("id"));
        }
        return String.valueOf(attributes.get("sub"));
    }

    // ─── EXTRACT EMAIL ────────────────────────────────────
    // GitHub sometimes returns email as null
    // if user has private email setting on GitHub
    // Google always returns email

    private String extractEmail(
            Map<String, Object> attributes, String provider) {
        Object email = attributes.get("email");
        if (email != null) {
            return String.valueOf(email);
        }
        // GitHub private email fallback
        return attributes.get("login") + "@github.noemail";
    }

    // ─── EXTRACT FULL NAME ────────────────────────────────
    // GitHub returns "name"
    // Google returns "name"
    // Both same field name — but GitHub can be null
    // if user has no name set on their profile

    private String extractFullName(
            Map<String, Object> attributes, String provider) {
        Object name = attributes.get("name");
        if (name != null) {
            return String.valueOf(name);
        }
        // GitHub fallback — use their username
        Object login = attributes.get("login");
        if (login != null) {
            return String.valueOf(login);
        }
        return "BrightHire User";
    }

    // ─── EXTRACT AVATAR URL ───────────────────────────────
    // GitHub returns "avatar_url"
    // Google returns "picture"

    private String extractAvatarUrl(
            Map<String, Object> attributes, String provider) {
        if ("github".equals(provider)) {
            return String.valueOf(
                    attributes.getOrDefault("avatar_url", "")
            );
        }
        return String.valueOf(
                attributes.getOrDefault("picture", "")
        );
    }

    // ─── EXTRACT DOMAIN ───────────────────────────────────
    // sarah@acme.com → acme.com
    // Used to auto-link recruiter to their company

    private String extractDomain(String email) {
        if (email == null || !email.contains("@")) {
            return "";
        }
        return email.substring(email.indexOf("@") + 1);
    }
}