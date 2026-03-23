package com.brighthire.gateway.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationWithdrawnEvent {
    private UUID applicationId;
    private UUID jobId;
    private UUID userId;
}