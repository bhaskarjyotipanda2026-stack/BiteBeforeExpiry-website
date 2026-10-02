# BiteBeforeExpiry — Machine Learning Training, Semantic Knowledge Layer & Production AI Integration

## 📌 Phase Summary
This phase delivers a full, production-ready Machine Learning and Semantic Knowledge Layer integrated into the existing **BiteBeforeExpiry** ecosystem without altering the core barcode/OCR scanning, Supabase PostgreSQL persistence, or reminder workflows.

---

## 🏗️ Architecture & Component Overview

```
User Scan (Barcode/OCR)
       │
       ▼
React / Vite Web Application
       │
       ▼
mlClientService.js ─────────────(Fallback if Offline)────────────┐
       │                                                         │
(REST API Port 8000)                                             ▼
       ▼                                              Local Client Engine
Python ML Inference Microservice (server.py)          (src/ml/mlModel.js)
       ├── POST /predict/product-category
       ├── POST /predict/ingredients
       ├── POST /predict/expiry
       ├── POST /predict/semantic-search
       └── POST /analyze/product
       │
       ▼
Supabase PostgreSQL 15+
       ├── ml_predictions (Audit log & Model Versioning)
       ├── knowledge_items (Semantic Entities)
       ├── products (Catalog)
       ├── user_scans (Scan History)
       └── reminders (Automatic Schedules)
```

---

## 🚀 Key Modules Implemented

### 1. Data Pipeline & Zero Data Leakage Partitioning
* **Raw Storage:** [`data/raw/v1/`](file:///c:/BiteBeforeExpire/data/raw/v1) containing curated Open Food Facts (ODbL 1.0) and OpenFDA NDC & DailyMed (Public Domain) records.
* **Preprocessing Pipeline:** [`ml_service/pipeline/data_preprocessing.py`](file:///c:/BiteBeforeExpire/ml_service/pipeline/data_preprocessing.py) performing text cleaning, deduplication, ingredient normalization, and zero-leakage splitting (70% Train, 15% Val, 15% Test).
* **Audit Report:** Confirmed zero overlap between train and test sets in `data/validated/v1/leakage_report.json`.

### 2. Semantic Knowledge Layer & Vector Retrieval
* **Graph Structure:** [`ml_service/pipeline/semantic_knowledge_layer.py`](file:///c:/BiteBeforeExpire/ml_service/pipeline/semantic_knowledge_layer.py) with 288 nodes and 377 relational edges connecting Products $\rightarrow$ Ingredients $\rightarrow$ Categories $\rightarrow$ Allergens $\rightarrow$ Explanations.
* **Vector Index:** Pure Python TF-IDF Vector Space with Cosine Similarity Retrieval over 92 documents and 767 vocabulary terms.

### 3. Machine Learning Models & Training
* **Model Versions:**
  * `bitebeforeexpiry-classifier-v1`: Multinomial Naive Bayes text classifier (Food vs Medicine vs Other) with clinical safety prior.
  * `bitebeforeexpiry-ingredient-v1`: Entity recognition and 9-class allergen trigger detector.
  * `bitebeforeexpiry-expiry-v1`: Rule and optical repair engine for packaging dates with chronological validation.
* **Holdout Evaluation Metrics:**
  * Overall Accuracy: **83.33%**
  * Macro F1-Score: **0.8056**
  * Food Class F1: **1.000**
  * Medicine Class Precision: **1.000**

### 4. Production REST Inference API
* **Server Script:** [`ml_service/server.py`](file:///c:/BiteBeforeExpire/ml_service/server.py) running on port 8000 with CORS enabled.
* **Endpoints:**
  * `GET /health`
  * `GET /models/info`
  * `POST /predict/product-category`
  * `POST /predict/ingredients`
  * `POST /predict/expiry`
  * `POST /predict/semantic-search`
  * `POST /analyze/product`

### 5. Resilient Client Fallback & Human Confirmation
* **Client Service:** [`src/services/mlClientService.js`](file:///c:/BiteBeforeExpire/src/services/mlClientService.js) with 3000ms timeout.
* If the ML microservice is stopped or unreachable, the app seamlessly falls back to client-side heuristics without throwing unhandled exceptions.
* **Human-in-the-Loop:** Automatically triggers confirmation requirements on low confidence ($< 0.75$) or pharmaceutical items.
* **Source Transparency:** Explicitly labels data as `SOURCE` (Verified Barcode/DB), `AI` (ML Model Prediction), or `USER` (Confirmed).

### 6. Supabase Schema Evolution
* Added `ml_predictions` and `knowledge_items` to [`supabase_schema.sql`](file:///c:/BiteBeforeExpire/supabase_schema.sql) with Row Level Security (RLS) and query indexes.
* Added corresponding methods to [`src/services/dbService.js`](file:///c:/BiteBeforeExpire/src/services/dbService.js).

---

## 🧪 Verification Commands

```powershell
# 1. Start ML Inference Server (Background Daemon)
python -u ml_service/server.py 8000

# 2. Test ML REST API Endpoints (Python: 36/36 Passed)
python -u ml_service/tests/test_ml_api.py

# 3. Test Part 4 Production Integration & Supabase persistence (Node: 39/39 Passed)
node test_part4_production_ml.js

# 4. Run Full Regression Suite (287/287 Passed)
node test_part1_foundation.js
node test_part2_ai_ml.js
node test_part3_final_integration.js
node test_backend_reminders.js

# 5. Compile Web Bundle
npm.cmd run build
```
