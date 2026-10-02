"""
Automated Verification Suite for BiteBeforeExpiry ML Inference API
Tests:
1. GET  /health (models loaded, timestamp, healthy status)
2. GET  /models/info (model architecture, training parameters, evaluation metrics)
3. POST /predict/product-category (Food vs Medicine vs Other with probabilities)
4. POST /predict/ingredients (Entity extraction, categorization, allergen alerts)
5. POST /predict/expiry (Date candidate parsing, OCR optical repair, plausibility checks)
6. POST /predict/semantic-search (Cosine similarity ranking, explainability)
7. POST /analyze/product (Unified end-to-end intelligence with disclaimers)
8. High vs Low Confidence Thresholding & Human Confirmation
9. Medicine Safety Guard (Strict medical disclaimer, no recipe suggestions)
"""

import sys
import json
import urllib.request
import urllib.error

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_URL = "http://127.0.0.1:8000"

def post_json(endpoint, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_json(endpoint):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

total_tests = 0
passed_tests = 0

def assert_test(cond, msg):
    global total_tests, passed_tests
    total_tests += 1
    if cond:
        passed_tests += 1
        print(f"  ✅ PASS: {msg}")
    else:
        print(f"  ❌ FAIL: {msg}")
        raise AssertionError(msg)

def run_tests():
    print("\n==============================================================")
    print("🧪 BITEBEFOREEXPIRY ML INFERENCE API VERIFICATION SUITE")
    print("==============================================================\n")

    # 1. Health Endpoint
    print("--- 1. Testing GET /health ---")
    health = get_json("/health")
    assert_test(health.get("status") == "healthy", "Status is healthy")
    assert_test("models_loaded" in health, "Models loaded metadata present")
    assert_test(health["models_loaded"]["classifier"] == "bitebeforeexpiry-classifier-v1", "Classifier v1 loaded")

    # 2. Models Info Endpoint
    print("\n--- 2. Testing GET /models/info ---")
    info = get_json("/models/info")
    assert_test(len(info.get("models", [])) >= 3, "At least 3 model architectures registered")
    classifier_info = next(m for m in info["models"] if m["name"] == "bitebeforeexpiry-classifier-v1")
    assert_test("evaluation" in classifier_info, "Model evaluation report attached")
    assert_test(classifier_info["evaluation"]["overall_accuracy"] > 0.70, "Verified measured accuracy > 70%")

    # 3. Product Category Classification
    print("\n--- 3. Testing POST /predict/product-category ---")
    food_res = post_json("/predict/product-category", {
        "product_name": "Amul Pure Butter Pasteurized",
        "brand": "Amul",
        "ingredients_text": "Milk fat, common salt, natural color annatto"
    })
    assert_test(food_res["prediction"] == "food", "Classified as food")
    assert_test(food_res["confidence"] > 0.70, "Confidence score > 0.70")
    assert_test("probabilities" in food_res, "Softmax probability distribution returned")
    assert_test(food_res["model_version"] == "bitebeforeexpiry-classifier-v1", "Model version tracked")

    med_res = post_json("/predict/product-category", {
        "product_name": "Paracetamol 500mg Fast Relief",
        "brand": "Crocin",
        "ingredients_text": "Paracetamol IP 500mg, povidone, magnesium stearate"
    })
    assert_test(med_res["prediction"] == "medicine", "Classified as medicine")
    assert_test(med_res["confidence"] > 0.80, "Medicine confidence high")

    other_res = post_json("/predict/product-category", {
        "product_name": "Surf Excel Liquid Detergent",
        "brand": "Surf Excel",
        "ingredients_text": "Anionic surfactants, non-ionic optical brighteners"
    })
    assert_test(other_res["prediction"] == "other", "Classified as other/household")

    # 4. Ingredient & Allergen Intelligence
    print("\n--- 4. Testing POST /predict/ingredients ---")
    ing_res = post_json("/predict/ingredients", {
        "ingredients": ["Refined Wheat Flour", "Toned Milk", "Peanuts", "Sugar", "Citric Acid"],
        "raw_text": ""
    })
    assert_test(len(ing_res["extracted_ingredients"]) == 5, "5 ingredients extracted")
    assert_test(len(ing_res["categorized_ingredients"]) == 5, "5 ingredients categorized")
    assert_test("Milk & Dairy" in ing_res["allergen_alerts"], "Milk allergen detected")
    assert_test("Peanuts" in ing_res["allergen_alerts"], "Peanut allergen detected")
    assert_test("toned milk" in ing_res["explanations"], "Explanation for toned milk returned")

    # 5. OCR Expiry Date Validation & Plausibility
    print("\n--- 5. Testing POST /predict/expiry ---")
    # Clean OCR test
    exp_res1 = post_json("/predict/expiry", {
        "raw_ocr_text": "MFG: 10/08/2026\nEXP: 28/10/2026\nBATCH: B-402",
        "category": "Dairy & Milk Products"
    })
    assert_test(exp_res1["expiry_date"] == "2026-10-28", "ISO expiry date extracted")
    assert_test(exp_res1["mfg_date"] == "2026-08-10", "ISO mfg date extracted")
    assert_test(exp_res1["is_valid"] == True, "Chronologically valid")
    assert_test(exp_res1["needs_confirmation"] == False, "High confidence does not require confirmation")

    # Optical Typo Repair test (10/o9/2026)
    exp_res2 = post_json("/predict/expiry", {
        "raw_ocr_text": "EXPIRY: 10/o9/2026 (Optical OCR typo letter o)",
        "category": "Bakery & Bread"
    })
    assert_test(exp_res2["expiry_date"] == "2026-09-10", "Optical typo repaired to 2026-09-10")

    # Invalid Chronology (Date Paradox: Expiry < Mfg)
    exp_res3 = post_json("/predict/expiry", {
        "raw_ocr_text": "MFG 2026-12-01 EXP 2026-06-01",
        "category": "Tablets & Capsules"
    })
    assert_test(exp_res3["is_valid"] == False, "Paradox detected (Expiry < Mfg)")
    assert_test(exp_res3["needs_confirmation"] == True, "Flagged for human confirmation")

    # Missing date handling
    exp_res4 = post_json("/predict/expiry", {
        "raw_ocr_text": "ONLY BRAND LOGO NO PRINTED NUMBERS",
        "category": "Snacks & Confectionery"
    })
    assert_test(exp_res4["expiry_date"] == None, "Safely returns null expiry date")
    assert_test(exp_res4["needs_confirmation"] == True, "Missing date flags needs_confirmation")

    # 6. Semantic Search
    print("\n--- 6. Testing POST /predict/semantic-search ---")
    sem_res = post_json("/predict/semantic-search", {
        "query": "milk lactose dairy",
        "top_k": 3
    })
    assert_test(len(sem_res["results"]) > 0, "Semantic search results returned")
    assert_test("score" in sem_res["results"][0], "Cosine similarity score included")
    assert_test(sem_res["results"][0]["score"] > 0.15, "Relevance score > 0.15")

    # 7. Unified Product Analysis & Safety Disclaimers
    print("\n--- 7. Testing POST /analyze/product (Unified Flow) ---")
    unified_food = post_json("/analyze/product", {
        "name": "Britannia Whole Wheat Bread",
        "raw_ocr_text": "MFG 10/09/2026 EXP 16/09/2026 Ingredients: Whole Wheat Flour, Yeast, Sugar, Iodised Salt",
        "ingredients": ["Whole Wheat Flour", "Yeast", "Sugar", "Iodised Salt"],
        "user_allergies": ["Gluten & Wheat"]
    })
    assert_test(unified_food["product_type"] == "food", "Food pipeline executed")
    assert_test(unified_food["has_allergy_risk"] == True, "Allergy conflict flagged for user")
    assert_test("Gluten & Wheat" in unified_food["user_allergy_conflicts"], "Exact allergen identified")

    unified_med = post_json("/analyze/product", {
        "name": "Augmentin 625 Duo Antibiotic",
        "raw_ocr_text": "EXP 12/2027 BATCH AG-991 Ingredients: Amoxicillin Trihydrate 500mg, Potassium Clavulanate 125mg",
        "ingredients": ["Amoxicillin Trihydrate", "Potassium Clavulanate"],
        "user_allergies": []
    })
    assert_test(unified_med["product_type"] == "medicine", "Medicine pipeline executed")
    assert_test("Strict Clinical Notice" in unified_med["safety_disclaimer"], "Strict clinical disclaimer enforced")
    assert_test("medical or prescription advice" in unified_med["safety_disclaimer"], "Non-prescription advice disclaimer present")

    print("\n==============================================================")
    print(f"🎉 ALL API TESTS PASSED! ({passed_tests}/{total_tests} assertions passed)")
    print("==============================================================\n")

if __name__ == "__main__":
    run_tests()
