package com.brighthire.gateway.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobPostedEvent {
    private UUID jobId;
    private UUID companyId;
    private String companyName;
    private String title;
    private String seniority;
    private List<String> requiredSkills;
    private String location;
    private OffsetDateTime postedAt;
}