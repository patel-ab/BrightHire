package com.brighthire.gateway.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatusChangedEvent {
    private UUID applicationId;
    private UUID jobId;
    private UUID userId;
    private String oldStatus;
    private String newStatus;
    private String candidateEmail;
    private String candidateFullName;
    private String jobTitle;
    private String companyName;
}