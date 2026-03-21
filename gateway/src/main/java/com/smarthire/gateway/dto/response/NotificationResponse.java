package com.smarthire.gateway.dto.response;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class NotificationResponse {
    private UUID id;
    private UUID userId;
    private String userFullName;
    private UUID applicationId;
    private String jobTitle;
    private String type;
    private String channel;
    private String status;
    private OffsetDateTime sentAt;
    private OffsetDateTime createdAt;
}