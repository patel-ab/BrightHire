package com.brighthire.gateway.service;

import com.brighthire.gateway.dto.request.NotificationRequest;
import com.brighthire.gateway.dto.response.NotificationResponse;
import com.brighthire.gateway.model.Application;
import com.brighthire.gateway.model.Notification;
import com.brighthire.gateway.model.User;
import com.brighthire.gateway.repository.ApplicationRepository;
import com.brighthire.gateway.repository.NotificationRepository;
import com.brighthire.gateway.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;

    private static final List<String> VALID_TYPES = List.of(
            "confirmation", "shortlisted",
            "rejected", "weekly_report"
    );

    private static final List<String> VALID_CHANNELS = List.of(
            "email", "sms"
    );

    private static final List<String> VALID_STATUSES = List.of(
            "pending", "sent", "failed"
    );

    // ─── CREATE ───────────────────────────────────────────

    @Transactional
    public NotificationResponse createNotification(
            NotificationRequest request) {

        validateType(request.getType());
        validateChannel(request.getChannel());

        User user = resolveUser(request.getUserId());
        Application application = resolveApplication(
                request.getApplicationId()
        );

        validateApplicationBelongsToUser(application, user);

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setApplication(application);
        notification.setType(request.getType());
        notification.setChannel(
                request.getChannel() != null
                        ? request.getChannel()
                        : "email"
        );
        notification.setStatus("pending");

        Notification saved = notificationRepository.save(notification);
        notificationRepository.flush();
        return toResponse(
                notificationRepository.findById(saved.getId()).get()
        );
    }

    // ─── READ ─────────────────────────────────────────────

    public Optional<NotificationResponse> getNotificationById(
            UUID id) {
        return notificationRepository.findById(id)
                .map(this::toResponse);
    }

    public List<NotificationResponse> getNotificationsByUser(
            UUID userId) {
        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<NotificationResponse> getPendingNotifications() {
        return notificationRepository.findByStatus("pending")
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<NotificationResponse> getAllNotifications() {
        return notificationRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── UPDATE STATUS ────────────────────────────────────
    // Used by SendGrid webhook to mark sent or failed

    @Transactional
    public Optional<NotificationResponse> updateStatus(
            UUID id, String status) {
        validateStatus(status);
        return notificationRepository.findById(id).map(notification -> {
            notification.setStatus(status);
            if ("sent".equals(status)) {
                notification.setSentAt(
                        java.time.OffsetDateTime.now()
                );
            }
            return toResponse(notificationRepository.save(notification));
        });
    }

    // ─── DELETE ───────────────────────────────────────────

    @Transactional
    public boolean deleteNotification(UUID id) {
        if (!notificationRepository.existsById(id)) {
            return false;
        }
        notificationRepository.deleteById(id);
        return true;
    }

    // ─── MAPPING ──────────────────────────────────────────

    private NotificationResponse toResponse(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setId(notification.getId());
        response.setType(notification.getType());
        response.setChannel(notification.getChannel());
        response.setStatus(notification.getStatus());
        response.setSentAt(notification.getSentAt());
        response.setCreatedAt(notification.getCreatedAt());
        if (notification.getUser() != null) {
            response.setUserId(notification.getUser().getId());
            response.setUserFullName(
                    notification.getUser().getFullName()
            );
        }
        if (notification.getApplication() != null) {
            response.setApplicationId(
                    notification.getApplication().getId()
            );
            if (notification.getApplication().getJob() != null) {
                response.setJobTitle(
                        notification.getApplication()
                                .getJob().getTitle()
                );
            }
        }
        return response;
    }

    // ─── HELPERS ──────────────────────────────────────────

    private User resolveUser(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException(
                    "User ID is required"
            );
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User with id " + userId + " not found"
                ));
    }

    private Application resolveApplication(UUID applicationId) {
        if (applicationId == null) return null;
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Application with id "
                                + applicationId + " not found"
                ));
    }

    private void validateApplicationBelongsToUser(
            Application application, User user) {
        if (application == null) return;
        if (!application.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException(
                    "Application does not belong to this user"
            );
        }
    }

    // ─── VALIDATORS ───────────────────────────────────────

    private void validateType(String type) {
        if (type == null || !VALID_TYPES.contains(type)) {
            throw new IllegalArgumentException(
                    "Invalid type. Must be one of: " + VALID_TYPES
            );
        }
    }

    private void validateChannel(String channel) {
        if (channel != null && !VALID_CHANNELS.contains(channel)) {
            throw new IllegalArgumentException(
                    "Invalid channel. Must be one of: "
                            + VALID_CHANNELS
            );
        }
    }

    private void validateStatus(String status) {
        if (status == null || !VALID_STATUSES.contains(status)) {
            throw new IllegalArgumentException(
                    "Invalid status. Must be one of: "
                            + VALID_STATUSES
            );
        }
    }
}