import os
import json
import psycopg2
import redis
from fastapi import FastAPI
from confluent_kafka import Consumer, Producer, KafkaError
from pipeline.ranking_pipeline import RankingPipeline
from dotenv import load_dotenv
import threading

load_dotenv()

app = FastAPI()
pipeline = RankingPipeline()

# ── DATABASE CONNECTION ────────────────────────────────────

def get_db():
    return psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=os.getenv("POSTGRES_PORT", 5432),
        dbname=os.getenv("POSTGRES_DB", "smarthire"),
        user=os.getenv("POSTGRES_USER", "smarthire"),
        password=os.getenv("POSTGRES_PASSWORD", "smarthire123")
    )

# ── REDIS CONNECTION ───────────────────────────────────────

def get_redis():
    return redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        decode_responses=True
    )

# ── KAFKA PRODUCER ─────────────────────────────────────────

def get_producer():
    return Producer({
        "bootstrap.servers": os.getenv(
            "KAFKA_BOOTSTRAP_SERVERS",
            "localhost:9092"
        )
    })

# ── FETCH JOB DETAILS FROM DB ─────────────────────────────

def fetch_job_details(job_id: str) -> dict:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT
            j.description,
            j.jd_vector,
            COALESCE(
                array_agg(jrs.skill) FILTER (WHERE jrs.skill IS NOT NULL),
                '{}'
            ) AS required_skills
        FROM jobs j
        LEFT JOIN job_required_skills jrs
            ON jrs.job_id = j.id
        WHERE j.id = %s
        GROUP BY j.id, j.description, j.jd_vector
    """, (job_id,))
    row = cursor.fetchone()
    cursor.close()
    db.close()

    if not row:
        raise ValueError(f"Job not found: {job_id}")

    return {
        "description": row[0],
        "jd_vector": json.loads(row[1]) if row[1] else None,
        "required_skills": row[2] or []
    }

# ── FETCH ALL APPLICATIONS FOR JOB ────────────────────────

def fetch_all_applications(job_id: str) -> list[dict]:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT a.id, r.raw_text
        FROM applications a
        JOIN resumes r ON a.resume_id = r.id
        WHERE a.job_id = %s
        AND a.status != 'withdrawn'
        AND r.raw_text IS NOT NULL
    """, (job_id,))
    rows = cursor.fetchall()
    cursor.close()
    db.close()

    return [
        {
            "applicationId": str(row[0]),
            "resumeText": row[1]
        }
        for row in rows
    ]

# ── FETCH JD VECTOR FROM REDIS ────────────────────────────

def fetch_jd_vector_from_redis(job_id: str) -> list[float] | None:
    try:
        r = get_redis()
        cached = r.get(f"jd_vec:{job_id}")
        if cached:
            return json.loads(cached)
    except Exception:
        pass
    return None

# ── CACHE JD VECTOR TO REDIS ──────────────────────────────
# TTL 24 hours — avoids re-encoding on every new application

def cache_jd_vector_to_redis(job_id: str, jd_vector: list[float]):
    try:
        r = get_redis()
        r.set(
            f"jd_vec:{job_id}",
            json.dumps(jd_vector),
            ex=86400  # 24 hours in seconds
        )
        print(f"JD vector cached for job: {job_id}")
    except Exception as e:
        print(f"Redis write error for jd_vec: {e}")

# ── PUBLISH RANKING COMPLETE EVENT ────────────────────────

def publish_ranking_complete(result: dict):
    producer = get_producer()
    message = json.dumps({
        "applicationId": result["applicationId"],
        "jobId":         result["jobId"],
        "userId":        result["userId"],
        "nlpScore":      result["nlpScore"],
        "scoreBreakdown": result["scoreBreakdown"],
        "rankingVersion": result["rankingVersion"]
    })
    producer.produce(
        "ranking-complete",
        value=message.encode("utf-8")
    )
    producer.flush()
    print(f"Published ranking-complete for: {result['applicationId']}")

# ── PROCESS ONE APPLICATION ────────────────────────────────

def process_application(event: dict):
    application_id = event["applicationId"]
    job_id         = event["jobId"]
    user_id        = event["userId"]
    resume_text    = event["resumeText"]

    print(f"Processing application: {application_id}")

    job = fetch_job_details(job_id)

    # try Redis cache first
    jd_vector_cached = fetch_jd_vector_from_redis(job_id)
    if jd_vector_cached:
        jd_vector = jd_vector_cached
    else:
        print(f"JD vector cache miss for job: {job_id}")
        jd_vector = job["jd_vector"]  # may still be None

    all_applications = fetch_all_applications(job_id)

    if not all_applications:
        print(f"No applications found for job: {job_id}")
        return

    # pipeline returns (result, jd_vector)
    # jd_vector returned is always defined — either passed in or computed
    result, returned_jd_vector = pipeline.rank(
        application_id=application_id,
        resume_text=resume_text,
        jd_text=job["description"],
        jd_vector=jd_vector,
        required_skills=job["required_skills"],
        all_applications=all_applications
    )

    # cache JD vector only if it wasn't already in Redis
    if not jd_vector_cached and returned_jd_vector:
        cache_jd_vector_to_redis(job_id, returned_jd_vector)

    result["jobId"]  = job_id
    result["userId"] = user_id

    publish_ranking_complete(result)

    print(f"Done. Score: {result['nlpScore']} for application: {application_id}")

# ── KAFKA CONSUMER LOOP ────────────────────────────────────

def start_consumer():
    consumer = Consumer({
        "bootstrap.servers": os.getenv(
            "KAFKA_BOOTSTRAP_SERVERS",
            "localhost:9092"
        ),
        "group.id": os.getenv(
            "KAFKA_GROUP_ID",
            "talent-matcher-group"
        ),
        "auto.offset.reset": os.getenv(
            "KAFKA_AUTO_OFFSET_RESET",
            "earliest"
        )
    })

    consumer.subscribe(["application-received"])
    print("Kafka consumer started. Listening to application-received...")

    try:
        while True:
            msg = consumer.poll(timeout=1.0)

            if msg is None:
                continue

            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                else:
                    print(f"Kafka error: {msg.error()}")
                    continue

            try:
                event = json.loads(msg.value().decode("utf-8"))
                process_application(event)
                consumer.commit()

            except Exception as e:
                print(f"Error processing message: {e}")
                continue

    except KeyboardInterrupt:
        print("Consumer stopped")
    finally:
        consumer.close()

# ── FASTAPI ENDPOINTS ──────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "talent-matcher"}

@app.get("/")
def root():
    return {"service": "talent-matcher", "version": "2.0"}

# ── STARTUP ───────────────────────────────────────────────

@app.on_event("startup")
def startup():
    thread = threading.Thread(
        target=start_consumer,
        daemon=True
    )
    thread.start()
    print("Talent matcher service started")