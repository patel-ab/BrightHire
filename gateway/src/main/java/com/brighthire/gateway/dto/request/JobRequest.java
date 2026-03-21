package com.brighthire.gateway.dto.request;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class JobRequest {
    private UUID companyId;
    private UUID postedById;
    private String title;
    private String description;
    private String location;
    private String seniority;
    private List<String> requiredSkills;
}