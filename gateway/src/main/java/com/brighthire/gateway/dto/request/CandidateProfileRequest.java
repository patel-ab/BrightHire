package com.brighthire.gateway.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class CandidateProfileRequest {

    private String phone;
    private String headline;
    private String summary;
    private String location;
    private Integer yearsOfExperience;
    private String linkedinUrl;
    private String githubUrl;
    private String portfolioUrl;
    private List<String> skills;
}
