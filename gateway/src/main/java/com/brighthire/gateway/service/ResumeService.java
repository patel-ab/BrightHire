package com.brighthire.gateway.service;

import com.brighthire.gateway.dto.request.ResumeRequest;
import com.brighthire.gateway.dto.response.ResumeResponse;
import com.brighthire.gateway.model.Resume;
import com.brighthire.gateway.model.User;
import com.brighthire.gateway.repository.ResumeRepository;
import com.brighthire.gateway.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;

    @Value("${aws.access-key-id}")
    private String accessKeyId;

    @Value("${aws.secret-access-key}")
    private String secretAccessKey;

    @Value("${aws.region}")
    private String region;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    private static final int MAX_FILE_SIZE_KB = 5120;

    // ─── UPLOAD RESUME ────────────────────────────────────
    // 1. Validate file and user
    // 2. Extract text from PDF using PDFBox
    // 3. Upload PDF to S3
    // 4. Save resume record in PostgreSQL

    @Transactional
    public ResumeResponse uploadResume(UUID userId, MultipartFile file) {

        // validate
        validateUserId(userId);
        validateFile(file);

        User user = resolveCandidate(userId);

        // extract text from PDF
        String rawText = extractTextFromPdf(file);

        // upload to S3
        String fileUrl = uploadToS3(file, userId);

        // get file size in KB
        int fileSizeKb = (int) (file.getSize() / 1024);

        // upsert — create or update existing resume
        Resume resume = resumeRepository
                .findByUserId(userId)
                .orElse(new Resume());

        resume.setUser(user);
        resume.setRawText(rawText);
        resume.setFileUrl(fileUrl);
        resume.setFileSizeKb(fileSizeKb);

        Resume saved = resumeRepository.save(resume);
        resumeRepository.flush();
        return toResponse(resumeRepository
                .findById(saved.getId()).get());
    }

    // ─── READ ─────────────────────────────────────────────

    public Optional<ResumeResponse> getResumeById(UUID id) {
        return resumeRepository.findById(id)
                .map(this::toResponse);
    }

    public Optional<ResumeResponse> getResumeByUserId(UUID userId) {
        return resumeRepository.findByUserId(userId)
                .map(this::toResponse);
    }

    public List<ResumeResponse> getAllResumes() {
        return resumeRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── DELETE ───────────────────────────────────────────

    @Transactional
    public boolean deleteResume(UUID id) {
        if (!resumeRepository.existsById(id)) {
            return false;
        }
        resumeRepository.deleteById(id);
        return true;
    }

    // ─── S3 UPLOAD ────────────────────────────────────────
    // Key format: resumes/{userId}/{uuid}.pdf
    // Returns the S3 URL of the uploaded file

    private String uploadToS3(MultipartFile file, UUID userId) {
        try {
            S3Client s3 = S3Client.builder()
                    .region(Region.of(region))
                    .credentialsProvider(
                            StaticCredentialsProvider.create(
                                    AwsBasicCredentials.create(
                                            accessKeyId,
                                            secretAccessKey
                                    )
                            )
                    )
                    .build();

            String key = "resumes/" + userId + "/"
                    + UUID.randomUUID() + ".pdf";

            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType("application/pdf")
                    .build();

            s3.putObject(
                    putRequest,
                    RequestBody.fromBytes(file.getBytes())
            );

            // return S3 URL
            return "https://" + bucketName
                    + ".s3." + region
                    + ".amazonaws.com/" + key;

        } catch (IOException e) {
            throw new RuntimeException(
                    "Failed to upload file to S3: " + e.getMessage()
            );
        }
    }

    // ─── PDF TEXT EXTRACTION ──────────────────────────────
    // Uses Apache PDFBox to extract raw text from PDF
    // rawText is passed to talent-matcher for NLP scoring

    private String extractTextFromPdf(MultipartFile file) {
        try {
            PDDocument document = org.apache.pdfbox.Loader.loadPDF(
                    file.getBytes()
            );
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            document.close();

            if (text == null || text.isBlank()) {
                throw new IllegalArgumentException(
                        "Could not extract text from PDF. " +
                                "Make sure the PDF is not scanned or image-based."
                );
            }

            return text.trim();

        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Failed to read PDF file: " + e.getMessage()
            );
        }
    }

    // ─── MAPPING ──────────────────────────────────────────

    private ResumeResponse toResponse(Resume resume) {
        ResumeResponse response = new ResumeResponse();
        response.setId(resume.getId());
        response.setFileUrl(resume.getFileUrl());
        response.setFileSizeKb(resume.getFileSizeKb());
        response.setRawText(resume.getRawText());
        response.setUpdatedAt(resume.getUpdatedAt());
        if (resume.getUser() != null) {
            response.setUserId(resume.getUser().getId());
            response.setUserFullName(resume.getUser().getFullName());
        }
        return response;
    }

    // ─── HELPERS ──────────────────────────────────────────

    private User resolveCandidate(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User with id " + userId + " not found"
                ));
        if (!"candidate".equals(user.getRole())) {
            throw new IllegalArgumentException(
                    "Only candidates can upload resumes"
            );
        }
        return user;
    }

    // ─── VALIDATORS ───────────────────────────────────────

    private void validateUserId(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException(
                    "User ID is required"
            );
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(
                    "File cannot be empty"
            );
        }

        String filename = file.getOriginalFilename();
        if (filename == null ||
                !filename.toLowerCase().endsWith(".pdf")) {
            throw new IllegalArgumentException(
                    "Only PDF files are allowed"
            );
        }

        long fileSizeKb = file.getSize() / 1024;
        if (fileSizeKb > MAX_FILE_SIZE_KB) {
            throw new IllegalArgumentException(
                    "File size exceeds maximum allowed size of "
                            + MAX_FILE_SIZE_KB + " KB"
            );
        }
    }
}