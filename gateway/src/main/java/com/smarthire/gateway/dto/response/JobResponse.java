package com.smarthire.gateway.dto.response;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class JobResponse {
    private UUID id;
    private UUID companyId;
    private String companyName;
    private UUID postedById;
    private String postedByName;
    private String title;
    private String description;
    private String location;
    private String seniority;
    private List<String> requiredSkills;
    private String status;
    private OffsetDateTime expiresAt;
    private OffsetDateTime createdAt;
}