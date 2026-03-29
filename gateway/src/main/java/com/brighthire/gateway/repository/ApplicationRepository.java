package com.brighthire.gateway.repository;

import com.brighthire.gateway.model.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    List<Application> findByJobIdOrderByNlpScoreDesc(UUID jobId);

    List<Application> findByUserId(UUID userId);

    Optional<Application> findByJobIdAndUserId(UUID jobId, UUID userId);

    boolean existsByJobIdAndUserId(UUID jobId, UUID userId);

    List<Application> findByJobIdAndStatus(UUID jobId, String status);

    long countByJobId(UUID jobId);
}