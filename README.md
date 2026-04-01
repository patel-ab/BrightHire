# BrightHire

**AI-powered hiring platform that replaces keyword-matching ATS with semantic NLP ranking.**

Traditional applicant tracking systems filter candidates by keyword presence. BrightHire scores resumes against job descriptions using a 3-stage NLP pipeline — bi-encoder similarity, cross-encoder reranking, and skill overlap analysis — so the best candidates rise to the top regardless of whether they used the exact right buzzwords.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│              React 19 + Vite  (port 5173)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST / JWT
┌───────────────────────▼─────────────────────────────────────┐
│                   Gateway Service                           │
│           Spring Boot 3.5 / Java 17  (port 8080)            │
│   OAuth2 (GitHub + Google) → JWT  │  REST API               │
│   PostgreSQL (users/jobs/apps)    │  MongoDB (audit logs)   │
│   Redis (session / JD vectors)   │  AWS S3 (resumes)       │
└──────────┬────────────────────────────────────┬─────────────┘
           │ Kafka: application-received         │ Kafka: status-changed
           ▼                                     ▼
┌──────────────────────────┐       ┌─────────────────────────┐
│    Talent Matcher        │       │  Notification Service   │
│  FastAPI / Python        │       │  Python  (no HTTP port) │
│  (port 8001)             │       │                         │
│                          │       │  Mailtrap SMTP          │
│  Stage 1: Bi-encoder     │       │  Email templates:       │
│  (BAAI/bge-large-en)     │       │  - Confirmation         │
│  Stage 2: Cross-encoder  │       │  - Reviewing            │
│  (ms-marco-MiniLM-L-6)   │       │  - Shortlisted          │
│  Stage 3: spaCy skills   │       │  - Rejected             │
│                          │       │                         │
│  ← Kafka: ranking-complete       └─────────────────────────┘
└──────────────────────────┘
           │ Kafka: ranking-complete
           ▼
     Gateway writes nlpScore
     + scoreBreakdown to DB
```

### Kafka Topics

| Topic | Producer | Consumer |
|---|---|---|
| `application-received` | Gateway | Talent Matcher, Notification Service |
| `ranking-complete` | Talent Matcher | Gateway |
| `status-changed` | Gateway | Notification Service |

---

## Tech Stack

### Backend — `gateway/`
| Layer | Technology |
|---|---|
| Language | Java 17 |
| Framework | Spring Boot 3.5 |
| Auth | OAuth2 (GitHub + Google) → JWT (jjwt 0.12) |
| Primary DB | PostgreSQL 15 (JPA/Hibernate) |
| Document DB | MongoDB 6 |
| Cache | Redis 7 |
| Messaging | Apache Kafka (Confluent 7.6) |
| File Storage | AWS S3 (SDK v2) |
| PDF Parsing | Apache PDFBox 3 |
| API Docs | SpringDoc OpenAPI (Swagger UI) |
| Utilities | Lombok |

### NLP Service — `talent-matcher/`
| Layer | Technology |
|---|---|
| Language | Python 3.11+ |
| Framework | FastAPI + Uvicorn |
| Stage 1 | `BAAI/bge-large-en-v1.5` bi-encoder (sentence-transformers) |
| Stage 2 | `cross-encoder/ms-marco-MiniLM-L-6-v2` reranker |
| Stage 3 | spaCy skill extraction + overlap scoring |
| Messaging | confluent-kafka |
| DB | psycopg2 (PostgreSQL) + redis-py |

### Notification Service — `notification-service/`
| Layer | Technology |
|---|---|
| Language | Python 3.11+ |
| Transport | Mailtrap SMTP (sandbox) |
| Triggers | Kafka (`application-received`, `status-changed`) |
| Templates | Custom HTML email templates |

### Frontend — `brighthire-ui/`
| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Routing | react-router-dom v6 |
| Data Fetching | TanStack Query v5 |
| HTTP | Axios |
| Styling | Tailwind CSS v4 (dark mode only) |
| Icons | Lucide React |
| Notifications | react-hot-toast |

### Infrastructure — `docker-compose.yml`
PostgreSQL · MongoDB · Redis · Zookeeper · Kafka · Kafka UI (port 8090)

---

## Project Structure

```
BrightHire/
├── gateway/                  # Spring Boot backend
│   └── src/main/java/com/brighthire/gateway/
│       ├── controller/       # REST controllers
│       ├── service/          # Business logic
│       ├── model/            # JPA + MongoDB entities
│       ├── repository/       # Spring Data repos
│       ├── dto/              # Request/response DTOs
│       ├── kafka/            # Producers & consumers
│       └── security/         # OAuth2 + JWT config
├── talent-matcher/           # Python NLP ranking service
│   ├── pipeline/             # 3-stage ranking pipeline
│   ├── models/               # Bi-encoder, cross-encoder, skills
│   └── main.py               # FastAPI app + Kafka consumer
├── notification-service/     # Python email notification service
│   ├── templates/            # HTML email templates
│   └── main.py               # Kafka consumer
├── brighthire-ui/            # React frontend
│   └── src/
│       ├── api/              # Axios API client
│       ├── components/       # Shared UI components
│       ├── context/          # Auth context
│       └── pages/            # Route pages
└── docker-compose.yml        # Infrastructure services
```

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Java 17+
- Maven 3.9+
- Python 3.11+
- Node.js 20+

---

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts: PostgreSQL (5432), MongoDB (27017), Redis (6379), Kafka (9092), Kafka UI (8090).

Verify Kafka UI at `http://localhost:8090`.

---

### 2. Backend — Gateway

```bash
cd gateway
./mvnw spring-boot:run
```

Runs on `http://localhost:8080`.
Swagger UI: `http://localhost:8080/swagger-ui.html`

**Key environment variables** (set in `application.properties`):

| Variable | Description |
|---|---|
| `spring.datasource.*` | PostgreSQL connection |
| `spring.data.mongodb.uri` | MongoDB connection |
| `spring.data.redis.*` | Redis connection |
| `spring.kafka.bootstrap-servers` | Kafka broker |
| `jwt.secret` | JWT signing key |
| `aws.access-key-id` / `aws.secret-access-key` | S3 credentials |
| `aws.s3.bucket` | S3 bucket name for resumes |
| OAuth2 client IDs/secrets | GitHub and Google OAuth apps |

---

### 3. NLP Service — Talent Matcher

```bash
cd talent-matcher

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Start service
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Runs on `http://localhost:8001`.
Health check: `GET http://localhost:8001/health`

The service auto-downloads `BAAI/bge-large-en-v1.5` and `cross-encoder/ms-marco-MiniLM-L-6-v2` from HuggingFace on first run (~1.5 GB total). Requires a GPU for production throughput; CPU works for development.

**Environment variables** (`.env` file):

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=smarthire
POSTGRES_USER=smarthire
POSTGRES_PASSWORD=smarthire123
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
CROSS_ENCODER_WEIGHT=0.60
SKILL_OVERLAP_WEIGHT=0.40
```

---

### 4. Notification Service

```bash
cd notification-service

# Install dependencies
pip install confluent-kafka python-dotenv

# Start service
python main.py
```

**Environment variables** (`.env` file):

```env
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
MAILTRAP_USER=your_mailtrap_user
MAILTRAP_PASS=your_mailtrap_pass
MAILTRAP_FROM_EMAIL=noreply@brighthire.dev
MAILTRAP_FROM_NAME=BrightHire
```

---

### 5. Frontend

```bash
cd brighthire-ui

# Install dependencies
npm install

# Start dev server
npm run dev
```

Runs on `http://localhost:5173`.

---

### Full Startup Order

```
docker-compose up -d          # infrastructure first
↓
gateway (Spring Boot)         # backend
↓
talent-matcher (FastAPI)      # NLP service
↓
notification-service (Python) # email service
↓
brighthire-ui (Vite)          # frontend
```

---

## How the NLP Ranking Works

When a candidate submits an application:

1. **Gateway** parses the PDF resume with PDFBox, stores it in S3 and PostgreSQL, then fires a `application-received` Kafka event.
2. **Talent Matcher** consumes the event and runs a 3-stage pipeline:
   - **Stage 1 — Bi-encoder**: Encodes all resumes and the job description using `BAAI/bge-large-en-v1.5`. Fast cosine similarity scores all candidates.
   - **Stage 2 — Cross-encoder**: Takes the top 50 candidates and reranks them with `cross-encoder/ms-marco-MiniLM-L-6-v2`, which reads the resume and JD together for deeper semantic understanding.
   - **Stage 3 — Skill extraction**: spaCy extracts skills from the resume and computes overlap against the job's required skills list.
   - **Final score**: `(cross_encoder_score × 0.60) + (skill_overlap × 0.40)`
3. **Talent Matcher** publishes a `ranking-complete` event with the `nlpScore` and full `scoreBreakdown`.
4. **Gateway** consumes it and writes the score back to the application record.
5. **Notification Service** sends HTML emails at each status transition: confirmed → reviewing → shortlisted/rejected.

JD vectors are cached in Redis for 24 hours to avoid re-encoding on every new application.

---

## Future Plans — InterviewOS

**InterviewOS** is the next phase of BrightHire: an AI-powered interview platform that takes candidates from shortlisted to hired.

### Planned Features

**AI Interview Engine**
- Automated async video/text interviews triggered when a candidate is shortlisted
- Dynamic question generation based on the job description, required skills, and the candidate's specific score breakdown (e.g. ask harder questions about skills marked as missing)
- Follow-up questions generated in real time based on the candidate's answers

**Answer Evaluation**
- NLP scoring of written and transcribed answers against ideal response rubrics
- Skill-specific evaluation: technical questions graded on correctness, behavioral questions on STAR structure
- Confidence and clarity scoring on video responses

**Recruiter Dashboard**
- Side-by-side candidate comparison with interview scores layered on top of NLP resume scores
- AI-generated interview summaries so recruiters can skim 50 candidates in minutes
- One-click shortlist → schedule → offer pipeline

**Candidate Experience**
- Self-paced async interviews — candidates complete on their own time
- Real-time feedback after submission so candidates know where they stood
- Interview prep mode: practice questions for a specific job before the real attempt

**Integration**
- Calendar sync for live interview scheduling after async screening passes
- ATS export for companies already using Greenhouse, Lever, or Workday
- Webhooks for custom HR workflow automation

The goal: a candidate applies, BrightHire's NLP ranks them, InterviewOS screens the top candidates automatically, and the recruiter only spends time on the final few who've already proven themselves through every stage.
