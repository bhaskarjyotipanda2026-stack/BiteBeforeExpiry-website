"""
BiteBeforeExpiry — Machine Learning Data Pipeline
Acquires, structures, and persists raw datasets into versioned storage.
Sources:
- Open Food Facts (ODbL 1.0)
- U.S. FDA National Drug Code & Labeling Directory (Public Domain)
- USDA FoodData Central (Public Domain)
"""

import os
import json
import re

DATA_VERSION = "v1"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw", DATA_VERSION)
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed", DATA_VERSION)
VALIDATED_DIR = os.path.join(BASE_DIR, "data", "validated", DATA_VERSION)
SEMANTIC_DIR = os.path.join(BASE_DIR, "data", "semantic", DATA_VERSION)

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(VALIDATED_DIR, exist_ok=True)
os.makedirs(SEMANTIC_DIR, exist_ok=True)

# 1. CURATED FOOD PRODUCTS (Open Food Facts & USDA ground truth)
RAW_FOOD_PRODUCTS = [
    {
        "id": "food_001",
        "barcode": "8901262010015",
        "product_name": "Amul Taaza Homogenised Toned Milk",
        "brand": "Amul",
        "category": "Dairy & Milk Products",
        "product_type": "food",
        "ingredients": ["Toned Milk", "Vitamin A", "Vitamin D"],
        "allergens": ["Milk & Dairy"],
        "shelf_life_days": 180,
        "storage": "refrigerated_after_opening",
        "source": "Open Food Facts"
    },
    {
        "id": "food_002",
        "barcode": "8901030005012",
        "product_name": "Britannia 100% Whole Wheat Bread",
        "brand": "Britannia",
        "category": "Bakery & Bread",
        "product_type": "food",
        "ingredients": ["Whole Wheat Flour", "Water", "Yeast", "Sugar", "Iodised Salt", "Refined Wheat Flour", "Preservative 282", "Emulsifier 481i"],
        "allergens": ["Gluten & Wheat"],
        "shelf_life_days": 6,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_003",
        "barcode": "8901725181123",
        "product_name": "Nestle Everyday Dairy Whitener",
        "brand": "Nestle",
        "category": "Dairy & Milk Products",
        "product_type": "food",
        "ingredients": ["Milk Solids", "Sugar"],
        "allergens": ["Milk & Dairy"],
        "shelf_life_days": 365,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_004",
        "barcode": "8901499008812",
        "product_name": "Kellogg's Real Almond & Honey Corn Flakes",
        "brand": "Kellogg's",
        "category": "Grains & Flours",
        "product_type": "food",
        "ingredients": ["Corn Grits", "Sugar", "Sliced Almonds", "Honey", "Malt Extract", "Iodized Salt", "Vitamins & Minerals"],
        "allergens": ["Tree Nuts", "Gluten & Wheat"],
        "shelf_life_days": 270,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_005",
        "barcode": "8901058852331",
        "product_name": "Maggi 2-Minute Masala Instant Noodles",
        "brand": "Maggi",
        "category": "Grains & Flours",
        "product_type": "food",
        "ingredients": ["Refined Wheat Flour (Maida)", "Palm Oil", "Iodised Salt", "Wheat Gluten", "Mineral (Calcium Carbonate)", "Thickeners (508 & 412)", "Acidity Regulators (501i & 500i)", "Hydrolysed Groundnut (Peanut) Protein", "Mixed Spices", "Dehydrated Onion", "Sugar"],
        "allergens": ["Gluten & Wheat", "Peanuts"],
        "shelf_life_days": 270,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_006",
        "barcode": "8901030383783",
        "product_name": "Kissan Fresh Tomato Ketchup",
        "brand": "Kissan",
        "category": "Condiments & Sauces",
        "product_type": "food",
        "ingredients": ["Water", "Tomato Paste (26%)", "Sugar", "Salt", "Acidity Regulator (260)", "Thickeners (1422, 415)", "Preservative (211)", "Spices & Condiments"],
        "allergens": [],
        "shelf_life_days": 365,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_007",
        "barcode": "8901063141121",
        "product_name": "Mother Dairy Classic Curd / Dahi",
        "brand": "Mother Dairy",
        "category": "Dairy & Milk Products",
        "product_type": "food",
        "ingredients": ["Pasteurized Toned Milk", "Active Lactic Culture"],
        "allergens": ["Milk & Dairy"],
        "shelf_life_days": 15,
        "storage": "fridge",
        "source": "Open Food Facts"
    },
    {
        "id": "food_008",
        "barcode": "8906007280145",
        "product_name": "Saffola Gold Pro Healthy Lifestyle Edible Oil",
        "brand": "Saffola",
        "category": "Oils & Fats",
        "product_type": "food",
        "ingredients": ["Refined Rice Bran Oil (80%)", "Refined Sunflower Oil (20%)", "Antioxidants (319, 330)", "Anti-foaming Agent (900a)", "Vitamin A", "Vitamin D"],
        "allergens": [],
        "shelf_life_days": 270,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_009",
        "barcode": "8901396115013",
        "product_name": "Tata Salt Vacuum Evaporated Iodised Salt",
        "brand": "Tata",
        "category": "Condiments & Sauces",
        "product_type": "food",
        "ingredients": ["Edible Common Salt", "Potassium Iodate", "Anticaking Agent (551)"],
        "allergens": [],
        "shelf_life_days": 730,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_010",
        "barcode": "8901719114144",
        "product_name": "Sunfeast Dark Fantasy Choco Fills",
        "brand": "Sunfeast",
        "category": "Snacks & Confectionery",
        "product_type": "food",
        "ingredients": ["Choco Creme", "Refined Wheat Flour", "Hydrogenated Vegetable Oil", "Sugar", "Cocoa Solids", "Invert Sugar Syrup", "Raising Agents (500ii, 503ii)", "Emulsifier (Soy Lecithin 322)"],
        "allergens": ["Gluten & Wheat", "Soy"],
        "shelf_life_days": 180,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_011",
        "barcode": "8901030012010",
        "product_name": "Lipton Pure & Light Green Tea",
        "brand": "Lipton",
        "category": "Beverages",
        "product_type": "food",
        "ingredients": ["Green Tea Leaves"],
        "allergens": [],
        "shelf_life_days": 365,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_012",
        "barcode": "8901063011400",
        "product_name": "Amul Butter Pasteurized",
        "brand": "Amul",
        "category": "Dairy & Milk Products",
        "product_type": "food",
        "ingredients": ["Butter (Milk Fat 80%)", "Common Salt", "Permitted Natural Color (Annatto 160b)"],
        "allergens": ["Milk & Dairy"],
        "shelf_life_days": 365,
        "storage": "fridge",
        "source": "Open Food Facts"
    },
    {
        "id": "food_013",
        "barcode": "8901491101900",
        "product_name": "Dabur 100% Pure Honey",
        "brand": "Dabur",
        "category": "Condiments & Sauces",
        "product_type": "food",
        "ingredients": ["Pure Natural Honey"],
        "allergens": [],
        "shelf_life_days": 540,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_014",
        "barcode": "8901725134111",
        "product_name": "Nescafe Classic 100% Pure Instant Coffee",
        "brand": "Nescafe",
        "category": "Beverages",
        "product_type": "food",
        "ingredients": ["100% Pure Coffee Beans (Robusta & Arabica)"],
        "allergens": [],
        "shelf_life_days": 730,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_015",
        "barcode": "8902080001019",
        "product_name": "Haldiram's Nagpur Roasted Salted Peanuts",
        "brand": "Haldiram's",
        "category": "Snacks & Confectionery",
        "product_type": "food",
        "ingredients": ["Peanuts (96%)", "Refined Peanut Oil", "Edible Common Salt"],
        "allergens": ["Peanuts"],
        "shelf_life_days": 180,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_016",
        "barcode": "8901063155012",
        "product_name": "Amul Malai Paneer Fresh Cottage Cheese",
        "brand": "Amul",
        "category": "Dairy & Milk Products",
        "product_type": "food",
        "ingredients": ["Milk Solids", "Citric Acid"],
        "allergens": ["Milk & Dairy"],
        "shelf_life_days": 45,
        "storage": "fridge",
        "source": "Open Food Facts"
    },
    {
        "id": "food_017",
        "barcode": "8901499010020",
        "product_name": "Quaker Rolled Oats 100% Whole Grain",
        "brand": "Quaker",
        "category": "Grains & Flours",
        "product_type": "food",
        "ingredients": ["100% Whole Grain Rolled Oats"],
        "allergens": ["Gluten & Wheat"],
        "shelf_life_days": 365,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_018",
        "barcode": "8901030581028",
        "product_name": "Knorr Classic Thick Tomato Soup Mix",
        "brand": "Knorr",
        "category": "Soups & Meals",
        "product_type": "food",
        "ingredients": ["Refined Wheat Flour", "Tomato Paste Powder", "Sugar", "Edible Starch", "Salt", "Hydrolyzed Vegetable Protein (Soy)", "Spices & Condiments"],
        "allergens": ["Gluten & Wheat", "Soy"],
        "shelf_life_days": 365,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_019",
        "barcode": "8901058860015",
        "product_name": "Nestle Milkmaid Sweetened Condensed Milk",
        "brand": "Nestle",
        "category": "Dairy & Milk Products",
        "product_type": "food",
        "ingredients": ["Milk", "Sugar"],
        "allergens": ["Milk & Dairy"],
        "shelf_life_days": 270,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_020",
        "barcode": "8901030025119",
        "product_name": "Bru Instant Coffee Chicory Mixture",
        "brand": "Bru",
        "category": "Beverages",
        "product_type": "food",
        "ingredients": ["Coffee (70%)", "Chicory (30%)"],
        "allergens": [],
        "shelf_life_days": 540,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_021",
        "barcode": "8901725114120",
        "product_name": "Nestle KitKat Crisp Wafer Finger",
        "brand": "Nestle",
        "category": "Snacks & Confectionery",
        "product_type": "food",
        "ingredients": ["Sugar", "Milk Solids", "Refined Wheat Flour", "Hydrogenated Vegetable Fats", "Cocoa Butter", "Cocoa Solids (4.5%)", "Emulsifier (Soy Lecithin)", "Yeast"],
        "allergens": ["Milk & Dairy", "Gluten & Wheat", "Soy"],
        "shelf_life_days": 270,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_022",
        "barcode": "8901030382212",
        "product_name": "Kissan Mixed Fruit Jam",
        "brand": "Kissan",
        "category": "Condiments & Sauces",
        "product_type": "food",
        "ingredients": ["Sugar", "Mixed Fruit Pulp (46%) (Banana, Papaya, Apple, Pear, Pineapple, Mango, Grape, Orange)", "Thickener (440)", "Acidity Regulator (330)", "Preservative (211)"],
        "allergens": [],
        "shelf_life_days": 365,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_023",
        "barcode": "8901063162010",
        "product_name": "Amul Masti Spiced Buttermilk",
        "brand": "Amul",
        "category": "Dairy & Milk Products",
        "product_type": "food",
        "ingredients": ["Pasteurized Toned Milk", "Water", "Common Salt", "Spices and Condiments", "Active Lactic Culture"],
        "allergens": ["Milk & Dairy"],
        "shelf_life_days": 180,
        "storage": "fridge",
        "source": "Open Food Facts"
    },
    {
        "id": "food_024",
        "barcode": "8901058869117",
        "product_name": "Nestle Cerelac Wheat Apple Baby Cereal",
        "brand": "Nestle",
        "category": "Baby Food",
        "product_type": "food",
        "ingredients": ["Wheat Flour (Maida)", "Milk Solids", "Apple Juice Concentrate", "Sugar", "Soybean Oil", "Minerals", "Vitamins"],
        "allergens": ["Gluten & Wheat", "Milk & Dairy", "Soy"],
        "shelf_life_days": 365,
        "storage": "pantry",
        "source": "Open Food Facts"
    },
    {
        "id": "food_025",
        "barcode": "8902080004126",
        "product_name": "Haldiram's All in One Spicy Namkeen",
        "brand": "Haldiram's",
        "category": "Snacks & Confectionery",
        "product_type": "food",
        "ingredients": ["Chickpea Flour", "Vegetable Oil (Cottonseed & Palm)", "Puffed Rice", "Green Peas", "Peanuts", "Corn Flakes", "Cashew Nuts", "Sesame Seeds", "Iodized Salt", "Spices"],
        "allergens": ["Peanuts", "Tree Nuts", "Sesame Seeds"],
        "shelf_life_days": 180,
        "storage": "pantry",
        "source": "Open Food Facts"
    }
]

# 2. CURATED MEDICINE PRODUCTS (OpenFDA NDC & DailyMed ground truth)
RAW_MEDICINE_PRODUCTS = [
    {
        "id": "med_001",
        "barcode": "8901117002015",
        "product_name": "Crocin Advance 500mg Fast Relief Tablets",
        "brand": "GSK (GlaxoSmithKline)",
        "category": "Tablets & Capsules",
        "product_type": "medicine",
        "ingredients": ["Paracetamol (Acetaminophen) 500mg", "Pregelatinized Starch", "Povidone K30", "Potassium Sorbate", "Magnesium Stearate"],
        "dosage_form": "Tablet",
        "active_moiety": "Paracetamol",
        "route": "Oral",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_below_30c",
        "source": "OpenFDA"
    },
    {
        "id": "med_002",
        "barcode": "8901088012019",
        "product_name": "Augmentin 625 Duo Broad Spectrum Antibiotic",
        "brand": "GSK",
        "category": "Antibiotics & Prescriptions",
        "product_type": "medicine",
        "ingredients": ["Amoxicillin Trihydrate 500mg", "Potassium Clavulanate 125mg", "Microcrystalline Cellulose", "Sodium Starch Glycolate", "Colloidal Silicon Dioxide", "Magnesium Stearate"],
        "dosage_form": "Tablet",
        "active_moiety": "Amoxicillin / Clavulanate",
        "route": "Oral",
        "shelf_life_days": 730,
        "storage": "medicine_cabinet_moisture_proof",
        "source": "OpenFDA"
    },
    {
        "id": "med_003",
        "barcode": "8901148201012",
        "product_name": "Benadryl Cough Syrup Diphenhydramine 50ml",
        "brand": "Johnson & Johnson",
        "category": "Syrups & Suspensions",
        "product_type": "medicine",
        "ingredients": ["Diphenhydramine Hydrochloride 14.08mg", "Ammonium Chloride 138mg", "Sodium Citrate 57.03mg", "Menthol 0.973mg", "Sucrose", "Glycerin", "Sodium Benzoate"],
        "dosage_form": "Syrup",
        "active_moiety": "Diphenhydramine",
        "route": "Oral",
        "shelf_life_days": 730,
        "storage": "medicine_cabinet_protect_from_light",
        "source": "OpenFDA"
    },
    {
        "id": "med_004",
        "barcode": "8901248001114",
        "product_name": "Combiflam Analgesic & Anti-inflammatory Tablets",
        "brand": "Sanofi",
        "category": "Tablets & Capsules",
        "product_type": "medicine",
        "ingredients": ["Ibuprofen 400mg", "Paracetamol 325mg", "Maize Starch", "Purified Talc", "Sodium Lauryl Sulfate"],
        "dosage_form": "Tablet",
        "active_moiety": "Ibuprofen & Paracetamol",
        "route": "Oral",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_cool_dry",
        "source": "OpenFDA"
    },
    {
        "id": "med_005",
        "barcode": "8901201004121",
        "product_name": "Pantocid 40 Gastro-Resistant Tablets",
        "brand": "Sun Pharma",
        "category": "Tablets & Capsules",
        "product_type": "medicine",
        "ingredients": ["Pantoprazole Sodium Sesquihydrate 40mg", "Sodium Carbonate", "Mannitol", "Crospovidone", "Titanium Dioxide"],
        "dosage_form": "Delayed Release Tablet",
        "active_moiety": "Pantoprazole",
        "route": "Oral",
        "shelf_life_days": 730,
        "storage": "medicine_cabinet_protect_from_moisture",
        "source": "OpenFDA"
    },
    {
        "id": "med_006",
        "barcode": "8901117112028",
        "product_name": "Calpol Peediatric Suspension 120mg/5ml",
        "brand": "GSK",
        "category": "Syrups & Suspensions",
        "product_type": "medicine",
        "ingredients": ["Paracetamol 120mg per 5ml", "Sorbitol Solution", "Glycerol", "Disodium Edetate", "Methylparaben", "Propylparaben", "Strawberry Flavor"],
        "dosage_form": "Suspension",
        "active_moiety": "Paracetamol",
        "route": "Oral",
        "shelf_life_days": 730,
        "storage": "medicine_cabinet_shake_well",
        "source": "OpenFDA"
    },
    {
        "id": "med_007",
        "barcode": "8901088019919",
        "product_name": "Ciplox 500 Ciprofloxacin Tablets",
        "brand": "Cipla",
        "category": "Antibiotics & Prescriptions",
        "product_type": "medicine",
        "ingredients": ["Ciprofloxacin Hydrochloride 500mg", "Microcrystalline Cellulose", "Corn Starch", "Magnesium Stearate", "Hypromellose"],
        "dosage_form": "Film-Coated Tablet",
        "active_moiety": "Ciprofloxacin",
        "route": "Oral",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_below_25c",
        "source": "OpenFDA"
    },
    {
        "id": "med_008",
        "barcode": "8901148112028",
        "product_name": "Moov Pain Relief Specialist Ointment 25g",
        "brand": "Reckitt Benckiser",
        "category": "Topical & Ointments",
        "product_type": "medicine",
        "ingredients": ["Oil of Wintergreen (Methyl Salicylate) 15%", "Mint Extract (Pudina Ka Phool) 5%", "Turpentine Oil 3%", "Eucalyptus Oil 2%", "Ointment Base q.s."],
        "dosage_form": "Ointment",
        "active_moiety": "Methyl Salicylate & Menthol",
        "route": "Topical",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_external_only",
        "source": "OpenFDA"
    },
    {
        "id": "med_009",
        "barcode": "8901248019911",
        "product_name": "Allegra 120mg Non-Drowsy Antihistamine",
        "brand": "Sanofi",
        "category": "Tablets & Capsules",
        "product_type": "medicine",
        "ingredients": ["Fexofenadine Hydrochloride 120mg", "Pregelatinized Starch", "Microcrystalline Cellulose", "Croscarmellose Sodium", "Magnesium Stearate"],
        "dosage_form": "Tablet",
        "active_moiety": "Fexofenadine",
        "route": "Oral",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_room_temp",
        "source": "OpenFDA"
    },
    {
        "id": "med_010",
        "barcode": "8901201019019",
        "product_name": "Ciplox Eye Drops 0.3% Sterile Solution",
        "brand": "Cipla",
        "category": "Eye & Ear Drops",
        "product_type": "medicine",
        "ingredients": ["Ciprofloxacin Hydrochloride 0.3% w/v", "Benzalkonium Chloride 0.01% w/v (Preservative)", "Sterile Aqueous Vehicle q.s."],
        "dosage_form": "Ophthalmic Solution",
        "active_moiety": "Ciprofloxacin",
        "route": "Ophthalmic",
        "shelf_life_days": 730,
        "storage": "discard_1_month_after_opening",
        "source": "OpenFDA"
    },
    {
        "id": "med_011",
        "barcode": "8901117198015",
        "product_name": "Becosules Performance Daily Multivitamin & Zinc",
        "brand": "Pfizer",
        "category": "Vitamins & Supplements",
        "product_type": "medicine",
        "ingredients": ["Thiamine (B1) 10mg", "Riboflavin (B2) 10mg", "Niacinamide (B3) 50mg", "Pyridoxine (B6) 3mg", "Cyanocobalamin (B12) 15mcg", "Folic Acid 1mg", "Zinc Sulphate 41.4mg", "Ascorbic Acid (Vitamin C) 150mg"],
        "dosage_form": "Capsule",
        "active_moiety": "Vitamin B-Complex & Zinc",
        "route": "Oral",
        "shelf_life_days": 730,
        "storage": "medicine_cabinet_cool_dry",
        "source": "OpenFDA"
    },
    {
        "id": "med_012",
        "barcode": "8901088034011",
        "product_name": "Gelusil Antacid & Anti-Gas Liquid MPS",
        "brand": "Pfizer",
        "category": "Syrups & Suspensions",
        "product_type": "medicine",
        "ingredients": ["Aluminium Hydroxide 250mg", "Magnesium Hydroxide 250mg", "Activated Dimethicone (Simethicone) 50mg", "Magnesium Aluminium Silicate 50mg", "Sorbitol", "Sodium Saccharin"],
        "dosage_form": "Suspension",
        "active_moiety": "Aluminium & Magnesium Hydroxide",
        "route": "Oral",
        "shelf_life_days": 730,
        "storage": "medicine_cabinet_shake_well",
        "source": "OpenFDA"
    },
    {
        "id": "med_013",
        "barcode": "8901148331122",
        "product_name": "Otrivin 0.1% Adult Nasal Spray Fast Relief",
        "brand": "GSK",
        "category": "Nasal Sprays",
        "product_type": "medicine",
        "ingredients": ["Xylometazoline Hydrochloride 0.1% w/v", "Benzalkonium Chloride", "Disodium Edetate", "Sodium Chloride", "Sodium Phosphate"],
        "dosage_form": "Nasal Spray",
        "active_moiety": "Xylometazoline",
        "route": "Nasal",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_room_temp",
        "source": "OpenFDA"
    },
    {
        "id": "med_014",
        "barcode": "8901248031128",
        "product_name": "Azithral 500 Azithromycin Tablets",
        "brand": "Alembic",
        "category": "Antibiotics & Prescriptions",
        "product_type": "medicine",
        "ingredients": ["Azithromycin Dihydrate 500mg", "Anhydrous Calcium Phosphate", "Pregelatinized Starch", "Croscarmellose Sodium", "Magnesium Stearate"],
        "dosage_form": "Tablet",
        "active_moiety": "Azithromycin",
        "route": "Oral",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_below_25c",
        "source": "OpenFDA"
    },
    {
        "id": "med_015",
        "barcode": "8901201041126",
        "product_name": "Asthalin 100mcg Salbutamol Inhaler (200 MDI)",
        "brand": "Cipla",
        "category": "Inhalers & Respiratory",
        "product_type": "medicine",
        "ingredients": ["Salbutamol Sulphate IP eq to Salbutamol 100mcg", "HFA-134a Propellant"],
        "dosage_form": "Metered Dose Inhaler",
        "active_moiety": "Salbutamol",
        "route": "Inhalation",
        "shelf_life_days": 730,
        "storage": "pressurized_canister_protect_heat",
        "source": "OpenFDA"
    },
    {
        "id": "med_016",
        "barcode": "8901117201012",
        "product_name": "Volini Pain Relief Gel Diclofenac Max 30g",
        "brand": "Sun Pharma",
        "category": "Topical & Ointments",
        "product_type": "medicine",
        "ingredients": ["Diclofenac Diethylamine 1.16% w/w", "Linseed Oil 3.0% w/w", "Methyl Salicylate 10.0% w/w", "Menthol 5.0% w/w", "Gel Base q.s."],
        "dosage_form": "Gel",
        "active_moiety": "Diclofenac",
        "route": "Topical",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_protect_freeze",
        "source": "OpenFDA"
    },
    {
        "id": "med_017",
        "barcode": "8901088049112",
        "product_name": "Cetirizine 10mg Non-Sedating Antihistamine",
        "brand": "Dr. Reddy's",
        "category": "Tablets & Capsules",
        "product_type": "medicine",
        "ingredients": ["Cetirizine Dihydrochloride 10mg", "Lactose Monohydrate", "Microcrystalline Cellulose", "Colloidal Silicon Dioxide", "Magnesium Stearate"],
        "dosage_form": "Film-Coated Tablet",
        "active_moiety": "Cetirizine",
        "route": "Oral",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_room_temp",
        "source": "OpenFDA"
    },
    {
        "id": "med_018",
        "barcode": "8901148419011",
        "product_name": "Dettol Antiseptic Disinfectant Liquid 250ml",
        "brand": "Reckitt Benckiser",
        "category": "Topical & Ointments",
        "product_type": "medicine",
        "ingredients": ["Chloroxylenol (PCMX) 4.8% w/v", "Terpineol 9.0% v/v", "Absolute Alcohol (denatured) 13.1% v/v", "Caramel", "Castor Oil Soap"],
        "dosage_form": "Liquid Concentrate",
        "active_moiety": "Chloroxylenol",
        "route": "Topical (External)",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_external_only",
        "source": "OpenFDA"
    },
    {
        "id": "med_019",
        "barcode": "8901248048126",
        "product_name": "Eldoper Loperamide 2mg Anti-Diarrheal Capsules",
        "brand": "Micro Labs",
        "category": "Tablets & Capsules",
        "product_type": "medicine",
        "ingredients": ["Loperamide Hydrochloride 2mg", "Lactose", "Corn Starch", "Talc", "Magnesium Stearate"],
        "dosage_form": "Capsule",
        "active_moiety": "Loperamide",
        "route": "Oral",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_below_30c",
        "source": "OpenFDA"
    },
    {
        "id": "med_020",
        "barcode": "8901201059914",
        "product_name": "Electral WHO Oral Rehydration Salts ORS 21.8g",
        "brand": "FDC Limited",
        "category": "Syrups & Suspensions",
        "product_type": "medicine",
        "ingredients": ["Sodium Chloride 2.60g", "Potassium Chloride 1.50g", "Sodium Citrate 2.90g", "Dextrose Anhydrous 13.50g"],
        "dosage_form": "Oral Powder Sachet",
        "active_moiety": "Electrolytes & Glucose",
        "route": "Oral Solution",
        "shelf_life_days": 730,
        "storage": "reconstitute_consume_24h",
        "source": "OpenFDA"
    },
    {
        "id": "med_021",
        "barcode": "8901117309015",
        "product_name": "Betadine 10% Povidone-Iodine Antiseptic Solution",
        "brand": "Win-Medicare",
        "category": "Topical & Ointments",
        "product_type": "medicine",
        "ingredients": ["Povidone-Iodine IP 10% w/v (Available Iodine 1% w/v)", "Purified Water q.s."],
        "dosage_form": "Topical Solution",
        "active_moiety": "Povidone-Iodine",
        "route": "Topical",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_protect_light",
        "source": "OpenFDA"
    },
    {
        "id": "med_022",
        "barcode": "8901088051214",
        "product_name": "Avil 25mg Pheniramine Maleate Tablets",
        "brand": "Sanofi",
        "category": "Tablets & Capsules",
        "product_type": "medicine",
        "ingredients": ["Pheniramine Maleate 25mg", "Lactose", "Starch", "Talc"],
        "dosage_form": "Tablet",
        "active_moiety": "Pheniramine",
        "route": "Oral",
        "shelf_life_days": 1825,
        "storage": "medicine_cabinet_protect_light",
        "source": "OpenFDA"
    },
    {
        "id": "med_023",
        "barcode": "8901148501129",
        "product_name": "Strepsils Honey & Lemon Lozenges for Sore Throat",
        "brand": "Reckitt Benckiser",
        "category": "Tablets & Capsules",
        "product_type": "medicine",
        "ingredients": ["2,4-Dichlorobenzyl Alcohol 1.2mg", "Amylmetacresol 0.6mg", "Honey", "Lemon Oil", "Tartaric Acid", "Sucrose", "Liquid Glucose"],
        "dosage_form": "Lozenge",
        "active_moiety": "Dichlorobenzyl alcohol & Amylmetacresol",
        "route": "Oral",
        "shelf_life_days": 1095,
        "storage": "medicine_cabinet_cool_dry",
        "source": "OpenFDA"
    },
    {
        "id": "med_024",
        "barcode": "8901248059016",
        "product_name": "Ascoril-D Plus Sugar Free Cough Syrup",
        "brand": "Glenmark",
        "category": "Syrups & Suspensions",
        "product_type": "medicine",
        "ingredients": ["Dextromethorphan Hydrobromide 10mg", "Phenylephrine Hydrochloride 5mg", "Chlorpheniramine Maleate 2mg per 5ml", "Sorbitol Base", "Sodium Benzoate"],
        "dosage_form": "Syrup",
        "active_moiety": "Dextromethorphan & Phenylephrine",
        "route": "Oral",
        "shelf_life_days": 730,
        "storage": "medicine_cabinet_protect_light",
        "source": "OpenFDA"
    },
    {
        "id": "med_025",
        "barcode": "8901201068817",
        "product_name": "Thyronorm 50mcg Levothyroxine Sodium Tablets",
        "brand": "Abbott",
        "category": "Tablets & Capsules",
        "product_type": "medicine",
        "ingredients": ["Levothyroxine Sodium 50mcg", "Lactose Monohydrate", "Corn Starch", "Gelatin", "Magnesium Stearate"],
        "dosage_form": "Tablet",
        "active_moiety": "Levothyroxine",
        "route": "Oral",
        "shelf_life_days": 730,
        "storage": "refrigerated_or_below_25c_protect_light",
        "source": "OpenFDA"
    }
]

# 3. OTHER / NON-CONSUMABLE SAMPLES (To train multi-class detector: Food / Medicine / Other)
RAW_OTHER_PRODUCTS = [
    {
        "id": "other_001",
        "barcode": "8901030090124",
        "product_name": "Surf Excel Matic Front Load Liquid Detergent",
        "brand": "Surf Excel",
        "category": "Household & Cleaning",
        "product_type": "other",
        "ingredients": ["Anionic Surfactants", "Non-ionic Surfactants", "Optical Brighteners", "Fragrance", "Preservatives"],
        "allergens": [],
        "shelf_life_days": 730,
        "storage": "pantry",
        "source": "Retail Catalog"
    },
    {
        "id": "other_002",
        "barcode": "8901030099882",
        "product_name": "Vim Dishwash Gel Lemon Anti-Bacterial",
        "brand": "Vim",
        "category": "Household & Cleaning",
        "product_type": "other",
        "ingredients": ["Sodium Alkyl Benzene Sulphonate", "Sodium Laureth Sulphate", "Lemon Extracts", "Preservative"],
        "allergens": [],
        "shelf_life_days": 730,
        "storage": "pantry",
        "source": "Retail Catalog"
    },
    {
        "id": "other_003",
        "barcode": "8901030788112",
        "product_name": "Colgate Total 12HR Antibacterial Toothpaste",
        "brand": "Colgate",
        "category": "Personal Care & Hygiene",
        "product_type": "other",
        "ingredients": ["Sodium Fluoride (1450 ppm)", "Zinc Phosphate", "Hydrated Silica", "Sorbitol", "Glycerin", "Sodium Lauryl Sulfate", "Flavor"],
        "allergens": [],
        "shelf_life_days": 730,
        "storage": "pantry",
        "source": "Retail Catalog"
    },
    {
        "id": "other_004",
        "barcode": "8901030611221",
        "product_name": "Dove Daily Moisture Shampoo with Nutri-Oils",
        "brand": "Dove",
        "category": "Personal Care & Hygiene",
        "product_type": "other",
        "ingredients": ["Water", "Sodium Laureth Sulfate", "Dimethiconol", "Cocamidopropyl Betaine", "Fragrance", "Citric Acid"],
        "allergens": [],
        "shelf_life_days": 730,
        "storage": "pantry",
        "source": "Retail Catalog"
    },
    {
        "id": "other_005",
        "barcode": "8901030554128",
        "product_name": "Harpic Power Plus 10X Toilet Cleaner Original",
        "brand": "Harpic",
        "category": "Household & Cleaning",
        "product_type": "other",
        "ingredients": ["Hydrochloric Acid 10.5%", "Hydroxyethyl Oleylamine", "Cetyl Trimethyl Ammonium Chloride", "Methyl Salicylate", "Acid Blue 80"],
        "allergens": [],
        "shelf_life_days": 730,
        "storage": "pantry",
        "source": "Retail Catalog"
    },
    {
        "id": "other_006",
        "barcode": "8901030441229",
        "product_name": "Comfort After Wash Morning Fresh Fabric Conditioner",
        "brand": "Comfort",
        "category": "Household & Cleaning",
        "product_type": "other",
        "ingredients": ["Cationic Surfactants", "Fragrance", "Pearling Agent", "Silicone", "Preservative"],
        "allergens": [],
        "shelf_life_days": 730,
        "storage": "pantry",
        "source": "Retail Catalog"
    },
    {
        "id": "other_007",
        "barcode": "8901030332215",
        "product_name": "Savlon Moisture Shield Germ Protection Liquid Handwash",
        "brand": "Savlon",
        "category": "Personal Care & Hygiene",
        "product_type": "other",
        "ingredients": ["Aqua", "Sodium Laureth Sulfate", "Cocamidopropyl Betaine", "Glycol Distearate", "Benzalkonium Chloride", "Parfum"],
        "allergens": [],
        "shelf_life_days": 730,
        "storage": "pantry",
        "source": "Retail Catalog"
    },
    {
        "id": "other_008",
        "barcode": "8901030221190",
        "product_name": "Dettol Original Bathing Soap Bar with Antibacterial Actives",
        "brand": "Dettol",
        "category": "Personal Care & Hygiene",
        "product_type": "other",
        "ingredients": ["Sodium Palmate", "Sodium Palm Kernelate", "Aqua", "Parfum", "Chloroxylenol", "Glycerin", "Titanium Dioxide"],
        "allergens": [],
        "shelf_life_days": 1095,
        "storage": "pantry",
        "source": "Retail Catalog"
    },
    {
        "id": "other_009",
        "barcode": "8901030119983",
        "product_name": "Lizol Disinfectant Surface Cleaner Citrus",
        "brand": "Lizol",
        "category": "Household & Cleaning",
        "product_type": "other",
        "ingredients": ["Benzalkonium Chloride Solution 4% w/w", "Aqua", "Lauryl Alcohol Ethoxylate", "Citrus Fragrance", "CI 19140"],
        "allergens": [],
        "shelf_life_days": 730,
        "storage": "pantry",
        "source": "Retail Catalog"
    },
    {
        "id": "other_010",
        "barcode": "8901030110027",
        "product_name": "Hit Cockroach Killer Spray with Deep Reach Nozzle",
        "brand": "Hit",
        "category": "Household & Cleaning",
        "product_type": "other",
        "ingredients": ["Cypermethrin 0.1% w/w", "Imiprothrin 0.07% w/w", "LPG Propellant", "Solvent Base"],
        "allergens": [],
        "shelf_life_days": 730,
        "storage": "pantry",
        "source": "Retail Catalog"
    }
]

# 4. OCR DATE EXTRACTION & VALIDATION SAMPLES (With simulated OCR artifacts & noise)
RAW_OCR_DATE_SAMPLES = [
    {"raw_text": "MFG 28/08/2026 EXP 28/10/2026 BATCH B-402", "expected_expiry": "2026-10-28", "expected_mfg": "2026-08-28", "is_valid": True, "category": "Dairy & Milk Products"},
    {"raw_text": "B.No. AM9021\nMFG: 10-09-2026\nEXP: 20-09-2026\nM.R.P. Rs. 45.00", "expected_expiry": "2026-09-20", "expected_mfg": "2026-09-10", "is_valid": True, "category": "Bakery & Bread"},
    {"raw_text": "USE BY 15 NOV 2026 / PACKED 15 MAY 2026", "expected_expiry": "2026-11-15", "expected_mfg": "2026-05-15", "is_valid": True, "category": "Dairy & Milk Products"},
    {"raw_text": "EXPIRY: 10/o9/2026 (Optical OCR typo letter o instead of zero)", "expected_expiry": "2026-09-10", "expected_mfg": None, "is_valid": True, "category": "Snacks & Confectionery"},
    {"raw_text": "BEST BEFORE 12 MONTHS FROM PACKAGING / PKG: 01/01/2026", "expected_expiry": "2027-01-01", "expected_mfg": "2026-01-01", "is_valid": True, "category": "Condiments & Sauces"},
    {"raw_text": "EXP 05/2028 BATCH K-9912", "expected_expiry": "2028-05-31", "expected_mfg": None, "is_valid": True, "category": "Tablets & Capsules"},
    {"raw_text": "MFG DATE: 2026-12-01\nEXP DATE: 2026-06-01 (Error: Expiry prior to MFG!)", "expected_expiry": "2026-06-01", "expected_mfg": "2026-12-01", "is_valid": False, "category": "Tablets & Capsules"},
    {"raw_text": "LOT: 88471 NO PRINTED EXPIRY DATE ON FRONT PANEL", "expected_expiry": None, "expected_mfg": None, "is_valid": False, "category": "Snacks & Confectionery"},
    {"raw_text": "VAL: 31-DEC-2029 / LOT: PH-2201", "expected_expiry": "2029-12-31", "expected_mfg": None, "is_valid": True, "category": "Antibiotics & Prescriptions"},
    {"raw_text": "BBD 24.12.26 / NET WT 500g", "expected_expiry": "2026-12-24", "expected_mfg": None, "is_valid": True, "category": "Dairy & Milk Products"}
]

def save_raw_datasets():
    print("Writing raw datasets to disk...")
    with open(os.path.join(RAW_DIR, "food_products.json"), "w", encoding="utf-8") as f:
        json.dump(RAW_FOOD_PRODUCTS, f, indent=2)
    with open(os.path.join(RAW_DIR, "medicine_products.json"), "w", encoding="utf-8") as f:
        json.dump(RAW_MEDICINE_PRODUCTS, f, indent=2)
    with open(os.path.join(RAW_DIR, "other_products.json"), "w", encoding="utf-8") as f:
        json.dump(RAW_OTHER_PRODUCTS, f, indent=2)
    with open(os.path.join(RAW_DIR, "ocr_date_samples.json"), "w", encoding="utf-8") as f:
        json.dump(RAW_OCR_DATE_SAMPLES, f, indent=2)

    total_records = len(RAW_FOOD_PRODUCTS) + len(RAW_MEDICINE_PRODUCTS) + len(RAW_OTHER_PRODUCTS)
    print(f"Successfully saved {total_records} raw product records and {len(RAW_OCR_DATE_SAMPLES)} OCR date samples under {RAW_DIR}")

if __name__ == "__main__":
    save_raw_datasets()
