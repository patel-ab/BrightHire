package com.brighthire.gateway.controller;

import com.brighthire.gateway.dto.request.NotificationRequest;
import com.brighthire.gateway.dto.response.NotificationResponse;
import com.brighthire.gateway.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping
    public ResponseEntity<NotificationResponse> createNotification(
            @RequestBody NotificationRequest request) {
        NotificationResponse response =
                notificationService.createNotification(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationResponse> getNotificationById(
            @PathVariable UUID id) {
        return notificationService.getNotificationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<NotificationResponse>> getByUser(
            @PathVariable UUID userId) {
        return ResponseEntity.ok(
                notificationService.getNotificationsByUser(userId)
        );
    }

    @GetMapping("/pending")
    public ResponseEntity<List<NotificationResponse>> getPending() {
        return ResponseEntity.ok(
                notificationService.getPendingNotifications()
        );
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getAll() {
        return ResponseEntity.ok(
                notificationService.getAllNotifications()
        );
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<NotificationResponse> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        return notificationService.updateStatus(id, status)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(
            @PathVariable UUID id) {
        boolean deleted = notificationService.deleteNotification(id);
        return deleted
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
