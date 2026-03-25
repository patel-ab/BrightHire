import os
import json
from dotenv import load_dotenv
from models.bi_encoder import BiEncoder
from models.cross_encoder import CrossEncoder
from models.skills_extractor import SkillExtractor

load_dotenv()

STAGE2_LIMIT = 50
CROSS_ENCODER_WEIGHT = float(os.getenv("CROSS_ENCODER_WEIGHT", 0.60))
SKILL_OVERLAP_WEIGHT = float(os.getenv("SKILL_OVERLAP_WEIGHT", 0.40))


class RankingPipeline:

    def __init__(self):
        print("Initializing ranking pipeline...")
        self.bi_encoder = BiEncoder()
        self.cross_encoder = CrossEncoder()
        self.skill_extractor = SkillExtractor()
        print("Ranking pipeline ready")

    def rank(
            self,
            application_id: str,
            resume_text: str,
            jd_text: str,
            jd_vector: list[float] | None,
            required_skills: list[str],
            all_applications: list[dict]) -> dict:
        """
        Full 3-stage ranking pipeline for one application.

        all_applications format:
        [
            {
                "applicationId": "uuid",
                "resumeText": "..."
            },
            ...
        ]

        Returns scoring result for this specific application.
        """

        print(f"Starting pipeline for application: {application_id}")

        # ── STAGE 1 — Bi-encoder ──────────────────────────
        print("Stage 1: Bi-encoder scoring all candidates...")

        if jd_vector:
            # JD vector exists — score each resume against it
            stage1_scores = []
            for app in all_applications:
                score = self.bi_encoder.score(
                    app["resumeText"],
                    jd_vector
                )
                stage1_scores.append({
                    "applicationId": app["applicationId"],
                    "resumeText": app["resumeText"],
                    "stage1_score": score
                })
        else:
            # No JD vector — encode from text
            jd_vector = self.bi_encoder.encode(jd_text)
            stage1_scores = []
            for app in all_applications:
                score = self.bi_encoder.score_from_text(
                    app["resumeText"],
                    jd_text
                )
                stage1_scores.append({
                    "applicationId": app["applicationId"],
                    "resumeText": app["resumeText"],
                    "stage1_score": score
                })

        # sort by stage1 score descending
        stage1_scores.sort(
            key=lambda x: x["stage1_score"],
            reverse=True
        )

        print(f"Stage 1 complete. Total candidates: {len(stage1_scores)}")

        # ── STAGE 2 — Cross-encoder reranking ─────────────
        print("Stage 2: Cross-encoder reranking...")

        # your suggestion — send all if <= 50, else top 50
        candidates_for_reranking = (
            stage1_scores
            if len(stage1_scores) <= STAGE2_LIMIT
            else stage1_scores[:STAGE2_LIMIT]
        )

        resume_texts = [
            c["resumeText"]
            for c in candidates_for_reranking
        ]

        stage2_scores = self.cross_encoder.score_batch(
            resume_texts,
            jd_text
        )

        # attach stage2 scores
        for i, candidate in enumerate(candidates_for_reranking):
            candidate["stage2_score"] = stage2_scores[i]

        # sort by stage2 score descending
        candidates_for_reranking.sort(
            key=lambda x: x["stage2_score"],
            reverse=True
        )

        print(f"Stage 2 complete. Reranked: {len(candidates_for_reranking)}")

        # ── FIND THIS APPLICATION'S SCORES ────────────────
        # find the current application in results
        current = None
        for candidate in candidates_for_reranking:
            if candidate["applicationId"] == application_id:
                current = candidate
                break

        # if not in top 50 — use stage1 score only
        if current is None:
            for candidate in stage1_scores:
                if candidate["applicationId"] == application_id:
                    current = candidate
                    current["stage2_score"] = 0.0
                    break

        if current is None:
            raise ValueError(
                f"Application {application_id} not found in results"
            )

        stage1_score = current["stage1_score"]
        stage2_score = current["stage2_score"]

        # ── STAGE 3 — Skill extraction ────────────────────
        print("Stage 3: Skill extraction...")

        analysis = self.skill_extractor.analyze(
            resume_text,
            required_skills
        )

        skill_overlap_score = analysis["overlap_score"]

        print(f"Stage 3 complete. Overlap score: {skill_overlap_score}")

        # ── FINAL SCORE ───────────────────────────────────
        final_score = round(
            (stage2_score * CROSS_ENCODER_WEIGHT) +
            (skill_overlap_score * SKILL_OVERLAP_WEIGHT),
            4
        )

        print(f"Final score: {final_score}")

        # ── EXPLANATION ───────────────────────────────────
        why_matched = self.skill_extractor.generate_explanation(
            analysis,
            stage2_score
        )

        # ── SCORE BREAKDOWN ───────────────────────────────
        score_breakdown = json.dumps({
            "stage1_score": stage1_score,
            "stage2_score": stage2_score,
            "skill_overlap_score": skill_overlap_score,
            "final_score": final_score,
            "matched_skills": analysis["matched_skills"],
            "missing_skills": analysis["missing_skills"],
            "resume_skills": analysis["resume_skills"],
            "why_matched": why_matched,
            "weights": {
                "cross_encoder": CROSS_ENCODER_WEIGHT,
                "skill_overlap": SKILL_OVERLAP_WEIGHT
            }
        })

        return {
            "applicationId": application_id,
            "nlpScore": final_score,
            "scoreBreakdown": score_breakdown,
            "rankingVersion": "v2.0-bge-large-ms-marco-spacy",
            "whyMatched": why_matched
        }, jd_vector