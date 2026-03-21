package com.smarthire.gateway.service;

import com.smarthire.gateway.dto.request.CompanyRequest;
import com.smarthire.gateway.dto.response.CompanyResponse;
import com.smarthire.gateway.model.Company;
import com.smarthire.gateway.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;

    private static final List<String> VALID_PLANS =
            List.of("free", "pro", "enterprise");

    // ─── CREATE ───────────────────────────────────────────

    @Transactional
    public CompanyResponse createCompany(CompanyRequest request) {
        validateName(request.getName());
        validateDomain(request.getDomain());
        validatePlan(request.getPlan());

        Company company = new Company();
        company.setName(request.getName());
        company.setDomain(request.getDomain());
        company.setPlan(request.getPlan());

        return toResponse(companyRepository.save(company));
    }

    // ─── READ ─────────────────────────────────────────────

    public Optional<CompanyResponse> getCompanyById(UUID id) {
        return companyRepository.findById(id)
                .map(this::toResponse);
    }

    public Optional<CompanyResponse> getCompanyByDomain(String domain) {
        return companyRepository.findByDomain(domain)
                .map(this::toResponse);
    }

    public List<CompanyResponse> getAllCompanies() {
        return companyRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── UPDATE ───────────────────────────────────────────

    @Transactional
    public Optional<CompanyResponse> updateCompany(
            UUID id, Map<String, String> updates) {
        return companyRepository.findById(id).map(company -> {
            if (updates.containsKey("name")) {
                validateName(updates.get("name"));
                company.setName(updates.get("name"));
            }
            if (updates.containsKey("plan")) {
                validatePlan(updates.get("plan"));
                company.setPlan(updates.get("plan"));
            }
            return toResponse(companyRepository.save(company));
        });
    }

    // ─── DELETE ───────────────────────────────────────────

    @Transactional
    public boolean deleteCompany(UUID id) {
        if (!companyRepository.existsById(id)) {
            return false;
        }
        companyRepository.deleteById(id);
        return true;
    }

    // ─── MAPPING ──────────────────────────────────────────

    private CompanyResponse toResponse(Company company) {
        CompanyResponse response = new CompanyResponse();
        response.setId(company.getId());
        response.setName(company.getName());
        response.setDomain(company.getDomain());
        response.setPlan(company.getPlan());
        response.setCreatedAt(company.getCreatedAt());
        return response;
    }

    // ─── VALIDATORS ───────────────────────────────────────

    private void validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException(
                    "Company name cannot be empty"
            );
        }
    }

    private void validateDomain(String domain) {
        if (domain == null || domain.isBlank()) {
            throw new IllegalArgumentException(
                    "Domain cannot be empty"
            );
        }
        if (companyRepository.findByDomain(domain).isPresent()) {
            throw new IllegalArgumentException(
                    "Company with domain " + domain + " already exists"
            );
        }
    }

    private void validatePlan(String plan) {
        if (plan == null || !VALID_PLANS.contains(plan)) {
            throw new IllegalArgumentException(
                    "Invalid plan. Must be one of: " + VALID_PLANS
            );
        }
    }
}