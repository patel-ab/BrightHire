from models.cross_encoder import CrossEncoder

encoder = CrossEncoder()

resume = "Senior Java engineer with 5 years Spring Boot Kafka experience building distributed systems"
jd = "Looking for backend engineer with Java Spring Boot and Kafka skills for microservices platform"

score = encoder.score(resume, jd)
print(f"Cross-encoder score: {score:.4f}")

# Test batch scoring
resumes = [
    "Java engineer with Spring Boot experience",
    "Python data scientist with machine learning",
    "Frontend developer React and JavaScript",
]

scores = encoder.score_batch(resumes, jd)
for i, s in enumerate(scores):
    print(f"Resume {i+1}: {s:.4f}")