package com.brighthire.gateway.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationReceivedEvent {
    private UUID applicationId;
    private UUID jobId;
    private UUID userId;
    private UUID resumeId;
    private String resumeText;
    private String jdVector;
}