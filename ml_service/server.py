"""
BiteBeforeExpiry — Production ML Inference REST API Server
Zero external binary dependencies; runs robustly across all platforms.
Provides endpoints:
- GET  /health
- GET  /models/info
- POST /predict/product-category
- POST /predict/ingredients
- POST /predict/expiry
- POST /predict/semantic-search
- POST /analyze/product
"""

import os
import sys
import json
import math
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
import socketserver
from datetime import datetime, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "ml_service", "models")
SEMANTIC_DIR = os.path.join(BASE_DIR, "data", "semantic", "v1")

# 1. LOAD MODEL WEIGHTS
WEIGHTS_PATH = os.path.join(MODELS_DIR, "bitebeforeexpiry_classifier_v1.json")
EVAL_PATH = os.path.join(MODELS_DIR, "evaluation_report.json")
INDEX_PATH = os.path.join(SEMANTIC_DIR, "semantic_index.json")

classifier_weights = {}
evaluation_report = {}
semantic_index = {}

if os.path.exists(WEIGHTS_PATH):
    with open(WEIGHTS_PATH, "r", encoding="utf-8") as f:
        classifier_weights = json.load(f)

if os.path.exists(EVAL_PATH):
    with open(EVAL_PATH, "r", encoding="utf-8") as f:
        evaluation_report = json.load(f)

if os.path.exists(INDEX_PATH):
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        semantic_index = json.load(f)

# INFERENCE ENGINE HELPERS
def tokenize(text):
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    return [t.strip() for t in cleaned.split() if len(t.strip()) > 1]

def predict_product_category(text):
    classes = classifier_weights.get("classes", ["food", "medicine", "other"])
    priors = classifier_weights.get("class_priors", {})
    probs = classifier_weights.get("feature_probs", {})
    tokens = tokenize(text)

    # Heuristic clinical guard: strong pharmaceutical markers boost medicine log-prob
    medicine_markers = {"tablet", "tablets", "capsule", "capsules", "mg", "syrup", "suspension",
                        "paracetamol", "crocin", "antibiotic", "amoxicillin", "ciprofloxacin", "fexofenadine",
                        "inhaler", "drops", "ointment", "analgesic", "pharma", "rx"}
    
    # Compute log probabilities
    log_scores = {}
    for c in classes:
        score = priors.get(c, 0.0)
        c_probs = probs.get(c, {})
        oov = c_probs.get("__OOV__", -10.0)
        for t in tokens:
            score += c_probs.get(t, oov)
        if c == "medicine" and any(m in tokens for m in medicine_markers):
            score += 2.5 # Clinical safety prior
        log_scores[c] = score

    # Softmax
    max_log = max(log_scores.values())
    exp_scores = {c: math.exp(lp - max_log) for c, lp in log_scores.items()}
    total_exp = sum(exp_scores.values())
    probabilities = {c: round(score / total_exp, 4) for c, score in exp_scores.items()}

    pred_class = max(probabilities, key=probabilities.get)
    confidence = probabilities[pred_class]
    needs_confirmation = confidence < 0.75 or (pred_class == "medicine" and confidence < 0.85)

    return {
        "prediction": pred_class,
        "confidence": confidence,
        "probabilities": probabilities,
        "source": "AI (Machine Learning Inference)",
        "model_version": classifier_weights.get("model_version", "bitebeforeexpiry-classifier-v1"),
        "dataset_version": "food-knowledge-v1",
        "needs_confirmation": needs_confirmation
    }

# SEMANTIC SEARCH INFERENCE
def semantic_search(query_text, top_k=5):
    idf = semantic_index.get("idf", {})
    doc_vectors = semantic_index.get("doc_vectors", [])
    doc_ids = semantic_index.get("doc_ids", [])
    metadata = semantic_index.get("metadata", [])
    documents = semantic_index.get("documents", [])

    q_tokens = tokenize(query_text)
    if not q_tokens:
        return []

    q_counts = {}
    for t in q_tokens:
        q_counts[t] = q_counts.get(t, 0) + 1

    q_vec = {}
    norm_sq = 0.0
    for term, count in q_counts.items():
        if term in idf:
            val = count * idf[term]
            q_vec[term] = val
            norm_sq += val * val

    q_norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
    q_unit = {t: val / q_norm for t, val in q_vec.items()}

    results = []
    for idx, doc_vec in enumerate(doc_vectors):
        dot = 0.0
        for term, val in q_unit.items():
            if term in doc_vec:
                dot += val * doc_vec[term]
        if dot > 0.01:
            results.append({
                "id": doc_ids[idx],
                "score": round(dot, 4),
                "text": documents[idx],
                "metadata": metadata[idx]
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]

# INGREDIENT INTELLIGENCE INFERENCE
def predict_ingredients(ingredients_list, raw_text=""):
    from pipeline.semantic_knowledge_layer import INGREDIENT_TAXONOMY

    extracted = []
    if isinstance(ingredients_list, str):
        # Split commas / semi-colons
        tokens = re.split(r"[,;\n•]+", ingredients_list)
        ingredients_list = [t.strip() for t in tokens if len(t.strip()) > 1]

    categorized = []
    allergen_alerts = []
    explanations = {}

    for raw_ing in ingredients_list:
        clean_ing = re.sub(r"\s*\([^\)]*\)", "", raw_ing).strip().lower()
        if not clean_ing:
            continue
        extracted.append(clean_ing)

        # Lookup in semantic taxonomy
        match = INGREDIENT_TAXONOMY.get(clean_ing)
        if not match:
            # Substring search
            for k, v in INGREDIENT_TAXONOMY.items():
                if k in clean_ing or clean_ing in k:
                    match = v
                    break

        cat = match.get("category", "General Ingredient") if match else "Uncategorized"
        allergen = match.get("allergen") if match else None
        expl = match.get("explanation", f"Component identified in scanned formulation.") if match else f"Ingredient: {clean_ing}"

        categorized.append({
            "ingredient": raw_ing,
            "normalized": clean_ing,
            "category": cat,
            "allergen": allergen
        })
        if allergen and allergen not in allergen_alerts:
            allergen_alerts.append(allergen)

        explanations[clean_ing] = expl

    return {
        "extracted_ingredients": extracted,
        "categorized_ingredients": categorized,
        "allergen_alerts": allergen_alerts,
        "explanations": explanations,
        "model_version": "bitebeforeexpiry-ingredient-v1",
        "dataset_version": "ingredient-taxonomy-v1",
        "source": "AI (Semantic Taxonomy & Extraction)",
        "confidence": 0.92 if categorized else 0.50,
        "needs_confirmation": len(categorized) == 0 or len(allergen_alerts) > 0
    }

# OCR DATE EXTRACTION & PLAUSIBILITY VALIDATION
MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
}

def clean_ocr_typos(text):
    # Common optical OCR errors in date tokens: 10/o9/2026 -> 10/09/2026
    subbed = re.sub(r"([0-3][0-9][\/\-\.])[oO]([0-9][\/\-\.]20\d\d)", r"\g<1>0\g<2>", text)
    subbed = re.sub(r"([0-1]?[0-9][\/\-\.])[oO]([0-9][\/\-\.]20\d\d)", r"\g<1>0\g<2>", subbed)
    return subbed

def parse_date_candidate(text):
    # 1. ISO YYYY-MM-DD
    m1 = re.search(r"\b(20\d\d)[\/\-\.]([0-1]?[0-9])[\/\-\.]([0-3]?[0-9])\b", text)
    if m1:
        return f"{m1.group(1)}-{m1.group(2).zfill(2)}-{m1.group(3).zfill(2)}"
    # 2. DD/MM/YYYY or DD-MM-YY
    m2 = re.search(r"\b([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.](20\d\d|\d\d)\b", text)
    if m2:
        d, m, y = m2.group(1).zfill(2), m2.group(2).zfill(2), m2.group(3)
        if len(y) == 2:
            y = "20" + y
        if int(m) <= 12 and int(d) <= 31:
            return f"{y}-{m}-{d}"
    # 3. Text month 24 OCT 2026
    m3 = re.search(r"\b([0-3]?[0-9])?[\s\-\/\.]?([A-Za-z]{3,9})[\s\-\/\.](20\d\d|\d\d)\b", text)
    if m3:
        d = m3.group(1).zfill(2) if m3.group(1) else "28"
        m_str = m3.group(2)[:3].lower()
        y = m3.group(3)
        if len(y) == 2:
            y = "20" + y
        if m_str in MONTH_MAP:
            return f"{y}-{MONTH_MAP[m_str]}-{d}"
    # 4. MM/YYYY
    m4 = re.search(r"\b([0-1]?[0-9])[\/\-\.](20\d\d|\d\d)\b", text)
    if m4:
        m, y = m4.group(1).zfill(2), m4.group(2)
        if len(y) == 2:
            y = "20" + y
        if 1 <= int(m) <= 12:
            return f"{y}-{m}-28"
    return None

def predict_expiry(raw_ocr_text, category="other", declared_mfg=None):
    cleaned = clean_ocr_typos(raw_ocr_text or "")
    lines = cleaned.split("\n")

    expiry_candidate = None
    mfg_candidate = declared_mfg

    exp_keywords = [r"exp(?:iry)?", r"use\s*by", r"best\s*before", r"bbd?", r"val(?:idity)?"]
    mfg_keywords = [r"mfg", r"mfd", r"pack(?:ed|ing)?", r"pkg", r"date\s*of\s*mfg"]

    # Direct targeted keyword extraction
    exp_pattern = re.search(r"(?:exp(?:iry)?|use\s*by|best\s*before|bbd?|val(?:idity)?)[:\s\-]*([0-9a-zA-Z\/\.\-]{6,16})", cleaned, re.IGNORECASE)
    if exp_pattern:
        cand = parse_date_candidate(exp_pattern.group(1))
        if cand:
            expiry_candidate = cand

    mfg_pattern = re.search(r"(?:mfg|mfd|pack(?:ed|ing)?|pkg|date\s*of\s*mfg)[:\s\-]*([0-9a-zA-Z\/\.\-]{6,16})", cleaned, re.IGNORECASE)
    if mfg_pattern:
        cand = parse_date_candidate(mfg_pattern.group(1))
        if cand:
            mfg_candidate = cand

    # Fallback to line scanning if not yet found
    if not expiry_candidate or not mfg_candidate:
        for line in lines:
            if not expiry_candidate:
                for kw in exp_keywords:
                    m = re.search(f"{kw}[:\\s\\-]*([0-9a-zA-Z\\/\\.\\-]{{6,16}})", line, re.IGNORECASE)
                    if m:
                        d = parse_date_candidate(m.group(1))
                        if d:
                            expiry_candidate = d
                            break
            if not mfg_candidate:
                for kw in mfg_keywords:
                    m = re.search(f"{kw}[:\\s\\-]*([0-9a-zA-Z\\/\\.\\-]{{6,16}})", line, re.IGNORECASE)
                    if m:
                        d = parse_date_candidate(m.group(1))
                        if d:
                            mfg_candidate = d
                            break

    # General fallback search if no keyword line triggered
    if not expiry_candidate:
        expiry_candidate = parse_date_candidate(cleaned)

    # Plausibility check
    is_valid = True
    confidence = 0.90 if expiry_candidate else 0.20
    validation_notes = []

    if expiry_candidate and mfg_candidate:
        if expiry_candidate < mfg_candidate:
            is_valid = False
            confidence = 0.15
            validation_notes.append("Plausibility Violation: Expiry date is chronologically before manufacturing date.")

    if not expiry_candidate:
        is_valid = False
        validation_notes.append("No unambiguous expiry date found in OCR text.")

    needs_confirmation = not is_valid or confidence < 0.85

    return {
        "expiry_date": expiry_candidate,
        "mfg_date": mfg_candidate,
        "is_valid": is_valid,
        "confidence": round(confidence, 2),
        "validation_notes": validation_notes,
        "model_version": "bitebeforeexpiry-expiry-v1",
        "dataset_version": "ocr-validation-v1",
        "source": "AI (OCR Date Parsing & Plausibility Validation)",
        "needs_confirmation": needs_confirmation
    }

# UNIFIED PRODUCT ANALYSIS ENDPOINT
def analyze_product_full(payload):
    name = payload.get("product_name") or payload.get("name") or "Scanned Product"
    raw_ocr = payload.get("raw_ocr_text") or payload.get("rawText") or ""
    ingredients_input = payload.get("ingredients") or payload.get("ingredientsOriginal") or []
    user_allergies = payload.get("user_allergies") or payload.get("allergies") or []
    barcode = payload.get("barcode")

    combined_text = f"{name} {raw_ocr} {' '.join(ingredients_input) if isinstance(ingredients_input, list) else ingredients_input}"

    # 1. Product type classification
    cat_pred = predict_product_category(combined_text)
    is_medicine = cat_pred["prediction"] == "medicine"

    # 2. Ingredient & Allergen Intelligence
    ing_pred = predict_ingredients(ingredients_input, raw_ocr)

    # 3. Expiry date extraction
    exp_pred = predict_expiry(raw_ocr, category=cat_pred["prediction"])

    # 4. User allergy cross-matching
    user_allergy_matches = []
    for ua in user_allergies:
        ua_clean = ua.lower().split()[0]
        if any(ua_clean in a.lower() for a in ing_pred["allergen_alerts"]) or any(ua_clean in i.lower() for i in ing_pred["extracted_ingredients"]):
            user_allergy_matches.append(ua)

    # 5. Semantic similarity lookup
    sem_matches = semantic_search(f"{name} {cat_pred['prediction']}", top_k=3)

    # Safety disclaimer
    disclaimer = (
        "Strict Clinical Notice: This pharmaceutical classification is for product identification and post-expiry safe disposal guidance only. It does not provide medical or prescription advice. Always consult a registered medical professional."
        if is_medicine else
        "Food Safety Advisory: Nutritional and ingredient data generated by ML layer for consumer awareness. Inspect physical packaging prior to consumption."
    )

    return {
        "product_type": cat_pred["prediction"],
        "category_prediction": cat_pred,
        "ingredient_analysis": ing_pred,
        "expiry_validation": exp_pred,
        "user_allergy_conflicts": user_allergy_matches,
        "has_allergy_risk": len(user_allergy_matches) > 0,
        "semantic_matches": sem_matches,
        "safety_disclaimer": disclaimer,
        "model_version": {
            "classifier": cat_pred["model_version"],
            "ingredient": ing_pred["model_version"],
            "expiry": exp_pred["model_version"]
        },
        "overall_confidence": round((cat_pred["confidence"] + ing_pred["confidence"] + exp_pred["confidence"]) / 3, 2),
        "needs_confirmation": cat_pred["needs_confirmation"] or exp_pred["needs_confirmation"] or len(user_allergy_matches) > 0
    }

class MLRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._send_cors_headers()
        self.end_headers()
        response_bytes = json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")
        self.wfile.write(response_bytes)

    def _read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(body)
        except Exception:
            return {}

    def do_GET(self):
        if self.path == "/" or self.path == "/health":
            self._send_json(200, {
                "status": "healthy",
                "service": "BiteBeforeExpiry ML Inference Engine",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "models_loaded": {
                    "classifier": classifier_weights.get("model_version", "none"),
                    "semantic_index": semantic_index.get("version", "none"),
                    "vocabulary_terms": len(classifier_weights.get("vocab", []))
                }
            })
        elif self.path == "/models/info":
            self._send_json(200, {
                "models": [
                    {
                        "name": "bitebeforeexpiry-classifier-v1",
                        "architecture": "Multinomial Naive Bayes with Laplace Smoothing (alpha=1.0)",
                        "classes": classifier_weights.get("classes", []),
                        "evaluation": evaluation_report
                    },
                    {
                        "name": "vector-semantic-v1",
                        "architecture": "TF-IDF Vector Space with Cosine Similarity Retrieval",
                        "documents_indexed": semantic_index.get("num_documents", 0),
                        "vocab_size": semantic_index.get("vocab_size", 0)
                    },
                    {
                        "name": "bitebeforeexpiry-expiry-v1",
                        "architecture": "Rule + Optical Plausibility Validation Engine",
                        "features": ["ISO YYYY-MM-DD", "DD/MM/YYYY", "Text-Month", "End-of-Month", "Optical Typo Repair"]
                    }
                ]
            })
        else:
            self._send_json(404, {"error": "Not Found", "path": self.path})

    def do_POST(self):
        body = self._read_json_body()

        if self.path == "/predict/product-category":
            text = f"{body.get('product_name', '')} {body.get('brand', '')} {body.get('ingredients_text', '')} {body.get('raw_ocr_text', '')}"
            res = predict_product_category(text)
            self._send_json(200, res)

        elif self.path == "/predict/ingredients":
            ingredients = body.get("ingredients", [])
            raw_text = body.get("raw_text", "")
            res = predict_ingredients(ingredients, raw_text)
            self._send_json(200, res)

        elif self.path == "/predict/expiry":
            raw_text = body.get("raw_ocr_text", "")
            category = body.get("category", "other")
            declared_mfg = body.get("mfg_date")
            res = predict_expiry(raw_text, category, declared_mfg)
            self._send_json(200, res)

        elif self.path == "/predict/semantic-search":
            query = body.get("query", "")
            top_k = body.get("top_k", 5)
            res = semantic_search(query, top_k)
            self._send_json(200, {
                "query": query,
                "top_k": top_k,
                "results": res,
                "model_version": "vector-semantic-v1"
            })

        elif self.path == "/analyze/product":
            res = analyze_product_full(body)
            self._send_json(200, res)

        else:
            self._send_json(404, {"error": "Endpoint Not Found", "path": self.path})

class ThreadedHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    daemon_threads = True

def run_server(port=8000):
    server_address = ("127.0.0.1", port)
    httpd = ThreadedHTTPServer(server_address, MLRequestHandler)
    print(f"🚀 BiteBeforeExpiry ML Production Server running at http://127.0.0.1:{port}")
    print(f"   Available endpoints:")
    print(f"   - GET  http://127.0.0.1:{port}/health")
    print(f"   - GET  http://127.0.0.1:{port}/models/info")
    print(f"   - POST http://127.0.0.1:{port}/predict/product-category")
    print(f"   - POST http://127.0.0.1:{port}/predict/ingredients")
    print(f"   - POST http://127.0.0.1:{port}/predict/expiry")
    print(f"   - POST http://127.0.0.1:{port}/predict/semantic-search")
    print(f"   - POST http://127.0.0.1:{port}/analyze/product")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)
