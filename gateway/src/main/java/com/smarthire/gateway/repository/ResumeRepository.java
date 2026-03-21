package com.smarthire.gateway.repository;

import com.smarthire.gateway.model.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResumeRepository extends JpaRepository<Resume, UUID> {

    Optional<Resume> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);
}