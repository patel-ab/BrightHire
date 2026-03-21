package com.smarthire.gateway.dto.response;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class ResumeResponse {
    private UUID id;
    private UUID userId;
    private String userFullName;
    private String rawText;
    private String fileUrl;
    private Integer fileSizeKb;
    private OffsetDateTime updatedAt;
}