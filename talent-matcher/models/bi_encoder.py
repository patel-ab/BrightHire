import os
import numpy as np
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()


class BiEncoder:

    def __init__(self):
        model_name = os.getenv(
            "BI_ENCODER_MODEL",
            "BAAI/bge-large-en-v1.5"
        )
        print(f"Loading bi-encoder model: {model_name}")
        self.model = SentenceTransformer(model_name)
        print("Bi-encoder model loaded successfully")

    def encode(self, text: str) -> list[float]:
        """
        Encode a single text to a vector.
        Returns a list of floats.
        """
        embedding = self.model.encode(
            text,
            normalize_embeddings=True
        )
        return embedding.tolist()

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Encode multiple texts at once.
        More efficient than encoding one by one.
        """
        embeddings = self.model.encode(
            texts,
            normalize_embeddings=True,
            batch_size=32,
            show_progress_bar=False
        )
        return embeddings.tolist()

    def cosine_similarity(
            self,
            vector_a: list[float],
            vector_b: list[float]) -> float:
        """
        Compute cosine similarity between two vectors.
        Returns float between 0 and 1.
        1 = identical meaning
        0 = completely different
        """
        a = np.array(vector_a)
        b = np.array(vector_b)

        similarity = np.dot(a, b) / (
            np.linalg.norm(a) * np.linalg.norm(b)
        )

        # clamp between 0 and 1
        return float(max(0.0, min(1.0, similarity)))

    def score(
            self,
            resume_text: str,
            jd_vector: list[float]) -> float:
        """
        Score a resume against a pre-computed JD vector.
        Used when JD vector already exists in Redis/PostgreSQL.
        Returns float between 0 and 1.
        """
        resume_vector = self.encode(resume_text)
        return self.cosine_similarity(resume_vector, jd_vector)

    def score_from_text(
            self,
            resume_text: str,
            jd_text: str) -> float:
        """
        Score resume against JD when both are raw text.
        Used when JD vector not yet computed.
        Returns float between 0 and 1.
        """
        vectors = self.encode_batch([resume_text, jd_text])
        return self.cosine_similarity(vectors[0], vectors[1])