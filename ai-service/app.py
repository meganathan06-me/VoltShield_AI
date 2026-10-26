from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest
import numpy as np

app = FastAPI(title="VoltShield AI Demo Scoring Service")

# A tiny synthetic baseline is for demonstrating the endpoint only.
# Replace with representative, labelled data collected from the actual prototype.
rng = np.random.default_rng(7)
baseline = np.column_stack([rng.normal(32, 3, 300), rng.normal(1.1, 0.35, 300)])
model = IsolationForest(contamination=0.05, random_state=7)
model.fit(baseline)

class SensorInput(BaseModel):
    temperatureC: float = Field(..., ge=-100, le=500)
    currentA: float = Field(..., ge=0, le=1000)

@app.get("/health")
def health():
    return {"ok": True, "service": "VoltShield AI demo"}

@app.post("/score")
def score(data: SensorInput):
    features = np.array([[data.temperatureC, data.currentA]])
    prediction = int(model.predict(features)[0])
    anomaly_score = float(model.decision_function(features)[0])
    return {
        "anomaly": prediction == -1,
        "prediction": "ANOMALY" if prediction == -1 else "NORMAL_PATTERN",
        "anomalyScore": round(anomaly_score, 4),
        "note": "Demo model trained on synthetic data; not a fire probability or validated safety detector."
    }

# Run: uvicorn app:app --host 127.0.0.1 --port 8001 --reload
