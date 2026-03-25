import os
from sentence_transformers.cross_encoder import CrossEncoder as SentenceCrossEncoder
from dotenv import load_dotenv

load_dotenv()


class CrossEncoder:

    def __init__(self):
        model_name = os.getenv(
            "CROSS_ENCODER_MODEL",
            "cross-encoder/ms-marco-MiniLM-L-6-v2"
        )
        print(f"Loading cross-encoder model: {model_name}")
        self.model = SentenceCrossEncoder(model_name)
        print("Cross-encoder model loaded successfully")

    def score(
            self,
            resume_text: str,
            jd_text: str) -> float:
        """
        Score a single resume against a job description.
        Reads both texts together — understands context.
        Returns float between 0 and 1.
        """
        result = self.model.predict(
            [[resume_text, jd_text]]
        )

        raw_score = float(result[0])
        normalized = self._normalize(raw_score)
        return normalized

    def score_batch(
            self,
            resume_texts: list[str],
            jd_text: str) -> list[float]:
        """
        Score multiple resumes against same JD.
        More efficient than scoring one by one.
        Used for reranking top 50 from Stage 1.
        Returns list of floats between 0 and 1.
        """
        pairs = [[resume, jd_text]
                 for resume in resume_texts]

        results = self.model.predict(pairs)

        return [
            self._normalize(float(score))
            for score in results
        ]

    def _normalize(self, raw_score: float) -> float:
        """
        Cross-encoder outputs raw logits
        not bounded between 0 and 1.
        We use sigmoid to normalize.
        Returns float between 0 and 1.
        """
        import math
        sigmoid = 1 / (1 + math.exp(-raw_score))
        return round(sigmoid, 4)