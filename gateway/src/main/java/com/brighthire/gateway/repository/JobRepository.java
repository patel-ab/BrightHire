package com.brighthire.gateway.repository;

import com.brighthire.gateway.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, UUID> {

    List<Job> findByCompanyIdAndStatus(UUID companyId, String status);

    List<Job> findByStatusOrderByCreatedAtDesc(String status);

    List<Job> findByExpiresAtBeforeAndStatus(OffsetDateTime dateTime, String status);
}