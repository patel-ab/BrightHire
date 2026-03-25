from models.bi_encoder import BiEncoder

encoder = BiEncoder()

resume = "Senior Java engineer with 5 years Spring Boot Kafka experience"
jd = "Looking for backend engineer with Java Spring Boot and Kafka skills"

score = encoder.score_from_text(resume, jd)
print(f"Similarity score: {score:.4f}")
