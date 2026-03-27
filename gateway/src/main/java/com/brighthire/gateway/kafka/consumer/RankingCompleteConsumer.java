package com.brighthire.gateway.kafka.consumer;

import com.brighthire.gateway.kafka.event.ApplicationWithdrawnEvent;
import com.brighthire.gateway.kafka.event.RankingCompleteEvent;
import com.brighthire.gateway.config.KafkaConfig;
import com.brighthire.gateway.model.Application;
import com.brighthire.gateway.repository.ApplicationRepository;
import com.brighthire.gateway.service.ApplicationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class RankingCompleteConsumer {

    private final ApplicationService applicationService;
    private final ApplicationRepository applicationRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    // ─── CONSUME RANKING COMPLETE ─────────────────────────
    // Fired by Python NLP Service after scoring
    // Updates PostgreSQL + Redis shortlist

    @KafkaListener(
            topics = KafkaConfig.RANKING_COMPLETE,
            groupId = "brighthire-gateway"
    )
    public void handleRankingComplete(String message) {
        try {
            RankingCompleteEvent event = objectMapper
                    .readValue(message, RankingCompleteEvent.class);

            log.info(
                    "Ranking complete received | " +
                            "applicationId: {} | score: {}",
                    event.getApplicationId(),
                    event.getNlpScore()
            );

            // Step 1 — update application in PostgreSQL
            Optional<Application> applicationOpt =
                    applicationRepository
                            .findById(event.getApplicationId());

            if (applicationOpt.isEmpty()) {
                log.error(
                        "Application not found: {}",
                        event.getApplicationId()
                );
                return;
            }

            Application application = applicationOpt.get();
            application.setNlpScore(event.getNlpScore());
            application.setScoreBreakdown(
                    event.getScoreBreakdown()
            );
            application.setRankingVersion(
                    event.getRankingVersion()
            );
            application.setRankedAt(OffsetDateTime.now());
            applicationRepository.save(application);

            log.info(
                    "Application updated with score | " +
                            "applicationId: {}",
                    event.getApplicationId()
            );

            // Step 2 — update status to reviewing via service
            // This fires StatusChangedEvent → Kafka → notification-service → email
            applicationService.updateStatus(
                    event.getApplicationId(),
                    "reviewing"
            );

            log.info(
                    "Status set to reviewing | " +
                            "applicationId: {}",
                    event.getApplicationId()
            );

            // Step 3 — update Redis shortlist sorted set
            String redisKey = "shortlist:" + event.getJobId();
            double score = event.getNlpScore().doubleValue();
            String member = event.getUserId().toString();

            redisTemplate.opsForZSet().add(
                    redisKey,
                    member,
                    score
            );

            log.info(
                    "Redis shortlist updated | " +
                            "jobId: {} | userId: {} | score: {}",
                    event.getJobId(),
                    event.getUserId(),
                    score
            );

        } catch (Exception e) {
            log.error(
                    "Error processing ranking-complete event | " +
                            "error: {}",
                    e.getMessage()
            );
        }
    }

    // ─── CONSUME APPLICATION WITHDRAWN ────────────────────
    // Fired by Spring Boot itself when candidate withdraws
    // Removes candidate from Redis shortlist

    @KafkaListener(
            topics = KafkaConfig.APPLICATION_WITHDRAWN,
            groupId = "brighthire-gateway"
    )
    public void handleApplicationWithdrawn(String message) {
        try {
            ApplicationWithdrawnEvent event = objectMapper
                    .readValue(message,
                            ApplicationWithdrawnEvent.class);

            log.info(
                    "Application withdrawn received | " +
                            "applicationId: {}",
                    event.getApplicationId()
            );

            // Remove from Redis shortlist sorted set
            String redisKey = "shortlist:" + event.getJobId();
            String member = event.getUserId().toString();

            redisTemplate.opsForZSet().remove(
                    redisKey,
                    member
            );

            log.info(
                    "Candidate removed from shortlist | " +
                            "jobId: {} | userId: {}",
                    event.getJobId(),
                    event.getUserId()
            );

        } catch (Exception e) {
            log.error(
                    "Error processing application-withdrawn event | " +
                            "error: {}",
                    e.getMessage()
            );
        }
    }
}