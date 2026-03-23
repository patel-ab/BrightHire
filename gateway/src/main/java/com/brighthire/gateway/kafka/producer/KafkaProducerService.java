package com.brighthire.gateway.kafka.producer;

import com.brighthire.gateway.kafka.event.*;
import com.brighthire.gateway.config.KafkaConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaProducerService {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    // ─── PUBLISH APPLICATION RECEIVED ─────────────────────
    // Called when candidate applies to a job

    public void publishApplicationReceived(
            ApplicationReceivedEvent event) {
        publish(KafkaConfig.APPLICATION_RECEIVED, event);
    }

    // ─── PUBLISH STATUS CHANGED ───────────────────────────
    // Called when recruiter updates application status

    public void publishStatusChanged(
            StatusChangedEvent event) {
        publish(KafkaConfig.STATUS_CHANGED, event);
    }

    // ─── PUBLISH JOB POSTED ───────────────────────────────
    // Called when recruiter posts a new job

    public void publishJobPosted(
            JobPostedEvent event) {
        publish(KafkaConfig.JOB_POSTED, event);
    }

    // ─── PUBLISH APPLICATION WITHDRAWN ───────────────────
    // Called when candidate withdraws application

    public void publishApplicationWithdrawn(
            ApplicationWithdrawnEvent event) {
        publish(KafkaConfig.APPLICATION_WITHDRAWN, event);
    }

    // ─── PRIVATE HELPER ───────────────────────────────────
    // Converts event object to JSON string
    // Sends to Kafka topic
    // Logs success or failure

    private void publish(String topic, Object event) {
        try {
            String message = objectMapper
                    .writeValueAsString(event);

            kafkaTemplate.send(topic, message)
                    .whenComplete((result, ex) -> {
                        if (ex == null) {
                            log.info(
                                    "Event published to topic: {} | offset: {}",
                                    topic,
                                    result.getRecordMetadata().offset()
                            );
                        } else {
                            log.error(
                                    "Failed to publish event to topic: {} | error: {}",
                                    topic,
                                    ex.getMessage()
                            );
                        }
                    });

        } catch (Exception e) {
            log.error(
                    "Error serializing event for topic: {} | error: {}",
                    topic,
                    e.getMessage()
            );
        }
    }
}