package com.brighthire.gateway.dto.response;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class UserResponse {
    private UUID id;
    private String email;
    private String fullName;
    private String role;
    private String oauthProvider;
    private String avatarUrl;
    private UUID companyId;
    private String companyName;
    private OffsetDateTime createdAt;
}