package com.smarthire.gateway.dto.response;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class CompanyResponse {
    private UUID id;
    private String name;
    private String domain;
    private String plan;
    private OffsetDateTime createdAt;
}