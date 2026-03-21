package com.smarthire.gateway.dto.request;

import lombok.Data;
import java.util.UUID;

@Data
public class ResumeRequest {
    private UUID userId;
    private String rawText;
    private String fileUrl;
    private Integer fileSizeKb;
}