import spacy
from dotenv import load_dotenv

load_dotenv()

# ── TECH SKILLS MASTER LIST ───────────────────────────────
# Comprehensive list of tech skills we recognize
# Add more as needed

TECH_SKILLS = {
    # Languages
    "java", "python", "javascript", "typescript", "kotlin",
    "scala", "go", "rust", "c++", "c#", "swift", "ruby",
    "php", "r", "matlab", "bash", "shell",

    # Backend frameworks
    "spring", "spring boot", "spring mvc", "spring security",
    "django", "flask", "fastapi", "express", "nestjs",
    "laravel", "rails", "asp.net", "quarkus", "micronaut","node.js",

    # Frontend frameworks
    "react", "angular", "vue", "nextjs", "svelte",
    "redux", "graphql", "webpack", "vite",

    # Databases
    "postgresql", "mysql", "mongodb", "redis", "cassandra",
    "elasticsearch", "neo4j", "dynamodb", "oracle",
    "sqlite", "mariadb", "couchdb", "influxdb",

    # Cloud
    "aws", "azure", "gcp", "google cloud", "heroku",
    "digitalocean", "cloudflare",

    # AWS Services
    "ec2", "s3", "lambda", "rds", "eks", "ecs",
    "sqs", "sns", "api gateway", "cloudwatch",

    # DevOps / Infrastructure
    "docker", "kubernetes", "terraform", "ansible",
    "jenkins", "gitlab ci", "github actions", "circleci",
    "helm", "istio", "prometheus", "grafana",

    # Messaging / Streaming
    "kafka", "rabbitmq", "activemq", "pulsar",
    "redis streams", "kinesis",

    # Architecture
    "microservices", "rest", "grpc", "graphql",
    "event driven", "cqrs", "event sourcing",
    "distributed systems", "serverless",

    # ML / AI
    "machine learning", "deep learning", "nlp",
    "tensorflow", "pytorch", "scikit-learn", "keras",
    "bert", "transformers", "huggingface",
    "opencv", "pandas", "numpy",

    # Testing
    "junit", "mockito", "pytest", "jest",
    "selenium", "cypress", "testcontainers",

    # Other tools
    "git", "linux", "nginx", "apache",
    "hibernate", "jpa", "maven", "gradle",
    "swagger", "openapi", "oauth", "jwt",
}


class SkillExtractor:

    def __init__(self):
        print("Loading spaCy model...")
        self.nlp = spacy.load("en_core_web_lg")
        print("spaCy model loaded successfully")

    def extract_skills(self, text: str) -> set[str]:
        """
        Extract tech skills from text.
        Returns a set of normalized skill strings.
        """
        text_lower = text.lower()
        found_skills = set()

        # Method 1 — direct string matching
        # check multi-word skills first (spring boot before spring)
        sorted_skills = sorted(
            TECH_SKILLS,
            key=len,
            reverse=True
        )

        for skill in sorted_skills:
            if skill in text_lower:
                found_skills.add(skill)

        # Method 2 — spaCy noun chunks
        # catches skills written in different forms
        doc = self.nlp(text)
        for chunk in doc.noun_chunks:
            chunk_lower = chunk.text.lower().strip()
            if chunk_lower in TECH_SKILLS:
                found_skills.add(chunk_lower)

        return found_skills

    def compute_overlap(
            self,
            resume_skills: set[str],
            required_skills: list[str]) -> dict:
        """
        Compare resume skills against required job skills.
        Returns overlap score and details.
        """
        if not required_skills:
            return {
                "score": 0.5,
                "matched": [],
                "missing": [],
                "total_required": 0
            }

        required_lower = {
            skill.lower() for skill in required_skills
        }

        matched = resume_skills.intersection(required_lower)
        missing = required_lower - resume_skills

        score = len(matched) / len(required_lower)

        return {
            "score": round(score, 4),
            "matched": sorted(list(matched)),
            "missing": sorted(list(missing)),
            "total_required": len(required_lower)
        }

    def analyze(
            self,
            resume_text: str,
            required_skills: list[str]) -> dict:
        """
        Full skill analysis — extract + compare.
        Main method called from pipeline.
        Returns complete skill analysis.
        """
        resume_skills = self.extract_skills(resume_text)
        overlap = self.compute_overlap(
            resume_skills,
            required_skills
        )

        return {
            "resume_skills": sorted(list(resume_skills)),
            "overlap_score": overlap["score"],
            "matched_skills": overlap["matched"],
            "missing_skills": overlap["missing"],
            "total_required": overlap["total_required"]
        }

    def generate_explanation(
            self,
            analysis: dict,
            stage2_score: float) -> str:
        """
        Generate human readable why_matched explanation.
        Shown on recruiter shortlist card.
        """
        matched = analysis["matched_skills"]
        missing = analysis["missing_skills"]
        total = analysis["total_required"]
        overlap_score = analysis["overlap_score"]

        parts = []

        # skill match summary
        if matched:
            matched_str = ", ".join(matched[:5])
            parts.append(
                f"Matched {len(matched)}/{total} "
                f"required skills: {matched_str}"
            )
        else:
            parts.append("No direct skill matches found")

        # semantic match commentary
        if stage2_score >= 0.85:
            parts.append(
                "Strong semantic match with job description"
            )
        elif stage2_score >= 0.65:
            parts.append(
                "Good semantic alignment with job requirements"
            )
        else:
            parts.append(
                "Partial alignment with job requirements"
            )

        # missing skills
        if missing and len(missing) <= 3:
            missing_str = ", ".join(missing)
            parts.append(f"Missing: {missing_str}")

        return ". ".join(parts) + "."