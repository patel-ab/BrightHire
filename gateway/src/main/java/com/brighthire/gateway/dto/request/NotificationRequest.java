package com.brighthire.gateway.dto.request;

import lombok.Data;
import java.util.UUID;

@Data
public class NotificationRequest {
    private UUID userId;
    private UUID applicationId;
    private String type;
    private String channel;
}