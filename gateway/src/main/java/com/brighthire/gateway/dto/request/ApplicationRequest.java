package com.brighthire.gateway.dto.request;

import lombok.Data;
import java.util.UUID;

@Data
public class ApplicationRequest {
    private UUID jobId;
    private UUID userId;
    private UUID resumeId;
}