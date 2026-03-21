package com.brighthire.gateway.dto.request;

import lombok.Data;

@Data
public class CompanyRequest {
    private String name;
    private String domain;
    private String plan;
}