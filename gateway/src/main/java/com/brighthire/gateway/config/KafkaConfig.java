package com.brighthire.gateway.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    // ─── TOPIC NAMES ──────────────────────────────────────
    // Defined as constants so we never hardcode
    // topic names as strings anywhere else
    // Change name here → changes everywhere

    public static final String APPLICATION_RECEIVED   = "application-received";
    public static final String RANKING_COMPLETE       = "ranking-complete";
    public static final String STATUS_CHANGED         = "status-changed";
    public static final String JOB_POSTED             = "job-posted";
    public static final String APPLICATION_WITHDRAWN  = "application-withdrawn";

    // ─── TOPIC DEFINITIONS ────────────────────────────────

    @Bean
    public NewTopic applicationReceivedTopic() {
        return TopicBuilder
                .name(APPLICATION_RECEIVED)
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic rankingCompleteTopic() {
        return TopicBuilder
                .name(RANKING_COMPLETE)
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic statusChangedTopic() {
        return TopicBuilder
                .name(STATUS_CHANGED)
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic jobPostedTopic() {
        return TopicBuilder
                .name(JOB_POSTED)
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic applicationWithdrawnTopic() {
        return TopicBuilder
                .name(APPLICATION_WITHDRAWN)
                .partitions(1)
                .replicas(1)
                .build();
    }
}