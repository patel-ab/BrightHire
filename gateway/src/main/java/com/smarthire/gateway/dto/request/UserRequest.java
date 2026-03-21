package com.smarthire.gateway.dto.request;

import lombok.Data;
import java.util.UUID;

@Data
public class UserRequest {
    private String email;
    private String fullName;
    private String role;
    private String oauthProvider;
    private String oauthId;
    private String avatarUrl;
    private UUID companyId;
}