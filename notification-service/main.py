import os
import json
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from confluent_kafka import Consumer, KafkaError
from dotenv import load_dotenv
import templates.confirmation as confirmation
import templates.shortlisted as shortlisted
import templates.rejected as rejected
import templates.reviewing as reviewing

load_dotenv()

# ── MAILTRAP CONFIG ────────────────────────────────────────

MAILTRAP_HOST = "sandbox.smtp.mailtrap.io"
MAILTRAP_PORT = 2525
MAILTRAP_USER = os.getenv("MAILTRAP_USER")
MAILTRAP_PASS = os.getenv("MAILTRAP_PASS")

FROM_EMAIL = os.getenv("MAILTRAP_FROM_EMAIL", "noreply@brighthire.dev")
FROM_NAME  = os.getenv("MAILTRAP_FROM_NAME", "BrightHire")

# ── SEND EMAIL ─────────────────────────────────────────────

def send_email(to_email: str, to_name: str, subject: str, html: str):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg["To"]      = f"{to_name} <{to_email}>"
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(MAILTRAP_HOST, MAILTRAP_PORT) as server:
            server.starttls()
            server.login(MAILTRAP_USER, MAILTRAP_PASS)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())

        print(f"Email sent to: {to_email} | subject: {subject}")

    except Exception as e:
        print(f"Failed to send email to {to_email} | error: {e}")

# ── HANDLE APPLICATION RECEIVED ───────────────────────────
# Fired by Spring Boot when candidate applies
# Sends immediate confirmation email
# Event fields: applicationId, jobId, userId, resumeId,
#               resumeText, jdVector
# NOTE: application-received does NOT carry email/name —
#       those must come from your user DB or you add them
#       to the ApplicationReceivedEvent in Spring Boot

def handle_application_received(event: dict):
    candidate_email = event.get("candidateEmail")
    candidate_name  = event.get("candidateFullName")
    job_title       = event.get("jobTitle")
    company_name    = event.get("companyName")

    if not candidate_email:
        print("application-received: no email in event — skipping")
        print("Tip: add candidateEmail, candidateFullName, jobTitle, companyName to ApplicationReceivedEvent in Spring Boot")
        return

    print(f"Application received for: {candidate_email} | job: {job_title}")

    template = confirmation.render(candidate_name, job_title, company_name)
    send_email(
        candidate_email,
        candidate_name,
        template["subject"],
        template["html"]
    )

# ── HANDLE STATUS CHANGED EVENT ───────────────────────────
# Fired by Spring Boot ApplicationService.updateStatus()
# Event fields: applicationId, jobId, userId,
#               oldStatus, newStatus, candidateEmail,
#               candidateFullName, jobTitle, companyName

def handle_status_changed(event: dict):
    new_status      = event.get("newStatus")
    candidate_email = event.get("candidateEmail")
    candidate_name  = event.get("candidateFullName")
    job_title       = event.get("jobTitle")
    company_name    = event.get("companyName")

    if not candidate_email:
        print("No email for candidate — skipping notification")
        return

    print(f"Handling status change: {event.get('oldStatus')} -> {new_status} "
          f"for {candidate_email}")

    if new_status == "reviewing":
        template = reviewing.render(
            candidate_name, job_title, company_name
        )

    elif new_status == "shortlisted":
        why_matched = event.get("whyMatched", "Strong match with job requirements")
        template = shortlisted.render(
            candidate_name, job_title, company_name, why_matched
        )

    elif new_status == "rejected":
        template = rejected.render(
            candidate_name, job_title, company_name
        )

    else:
        print(f"No email template for status: {new_status} — skipping")
        return

    send_email(
        candidate_email,
        candidate_name,
        template["subject"],
        template["html"]
    )

# ── KAFKA CONSUMER LOOP ────────────────────────────────────

def start_consumer():
    consumer = Consumer({
        "bootstrap.servers": os.getenv(
            "KAFKA_BOOTSTRAP_SERVERS",
            "localhost:9092"
        ),
        "group.id": "notification-service-group",  # ← bumped to reset offsets
        "auto.offset.reset": "earliest"
    })

    consumer.subscribe(["application-received", "status-changed"])
    print("Notification service started. Listening to: application-received, status-changed...")

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
                topic = msg.topic()
                event = json.loads(msg.value().decode("utf-8"))

                if topic == "application-received":
                    handle_application_received(event)
                elif topic == "status-changed":
                    handle_status_changed(event)
                else:
                    print(f"Unknown topic: {topic} — skipping")

                consumer.commit()

            except Exception as e:
                print(f"Error processing message: {e}")
                continue

    except KeyboardInterrupt:
        print("Notification service stopped")
    finally:
        consumer.close()

# ── ENTRY POINT ───────────────────────────────────────────

if __name__ == "__main__":
    start_consumer()