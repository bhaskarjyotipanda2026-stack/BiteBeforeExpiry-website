// Rich database of common grocery and pharmaceutical ingredients with descriptions, health notes, and translations

export const INGREDIENT_KNOWLEDGE_BASE = {
  // Food Ingredients & Additives
  "milk solids": {
    translations: {
      hi: "दूध के ठोस पदार्थ",
      te: "పాల ఘనపదార్థాలు",
      ta: "பால் திடப்பொருட்கள்",
      bn: "দুধের কঠিন অংশ",
      mr: "दुधाचे घन घटक",
      es: "Sólidos lácteos"
    },
    whatItIs: "Dehydrated components of milk including proteins (casein, whey), lactose, and minerals.",
    commonUse: "Improves texture, creamy mouthfeel, and nutritional density in dairy and confectionery products.",
    allergenOrCaution: "Contains lactose. Unsuitable for individuals with dairy allergy or severe lactose intolerance."
  },
  "pasteurized whole milk": {
    translations: {
      hi: "पाश्चुरीकृत पूर्ण दूध",
      te: "పాశ్చరైజ్డ్ హోల్ మిల్క్",
      ta: "பாஸ்டுரைஸ் செய்யப்பட்ட முழு பால்",
      bn: "পাস্তুরিত খাঁটি দুধ",
      mr: "पाश्चराईज्ड संपूर्ण दूध",
      es: "Leche entera pasteurizada"
    },
    whatItIs: "Fresh cow or buffalo milk heat-treated to destroy harmful bacteria while preserving vitamins.",
    commonUse: "Primary base nutrient providing calcium, high-quality proteins, and essential fatty acids.",
    allergenOrCaution: "Contains dairy allergen (casein and whey) and lactose."
  },
  "sugar": {
    translations: {
      hi: "चीनी",
      te: "చక్కెర",
      ta: "சர்க்கரை",
      bn: "চিনি",
      mr: "साखर",
      es: "Azúcar"
    },
    whatItIs: "Refined carbohydrate sucrose typically extracted from sugar cane or sugar beet.",
    commonUse: "Adds sweetness, balances acidity, and acts as a mild natural preservative in syrups and jams.",
    allergenOrCaution: "Diabetic caution: High glycemic index; excessive consumption increases tooth decay and metabolic risk."
  },
  "citric acid": {
    translations: {
      hi: "साइट्रिक एसिड (नींबू सत्व)",
      te: "సిట్రిక్ యాసిడ్",
      ta: "சிட்ரிக் அமிலம்",
      bn: "সাইট্রিক অ্যাসিড",
      mr: "सायट्रिक ॲसिड",
      es: "Ácido cítrico"
    },
    whatItIs: "A naturally occurring organic weak acid found in citrus fruits like lemons and oranges (E330).",
    commonUse: "Used as a tartness regulator, antioxidant synergist, and preservative to inhibit mold growth.",
    allergenOrCaution: "Generally recognized as safe (GRAS). Can cause tooth enamel erosion if consumed in concentrated forms."
  },
  "sodium benzoate": {
    translations: {
      hi: "सोडियम बेंजोएट",
      te: "సోడియం బెంజోయేట్",
      ta: "சோடியம் பென்சோயேட்",
      bn: "সোডিয়াম বেনজোয়েট",
      mr: "सोडियम बेंझोएट",
      es: "Benzoato de sodio"
    },
    whatItIs: "A widely used food preservative salt (E211) derived from benzoic acid.",
    commonUse: "Prevents proliferation of harmful bacteria, yeast, and fungal mold in acidic foods, jams, and sodas.",
    allergenOrCaution: "Caution: In the presence of Vitamin C (ascorbic acid), trace amounts of benzene may form. Avoid if allergic to benzoates."
  },
  "potassium sorbate": {
    translations: {
      hi: "पोटेशियम सोर्बेट",
      te: "పొటాషియం సోర్బేట్",
      ta: "பொட்டாசியம் சோர்பேட்",
      bn: "পটাসিয়াম সরবেট",
      mr: "पोटॅशियम सॉर्बेट",
      es: "Sorbato de potasio"
    },
    whatItIs: "A gentle antimicrobial food preservative (E202) synthesized from sorbic acid.",
    commonUse: "Extends shelf life of cheese, wine, yogurt, baked goods, and syrups by blocking yeast spores.",
    allergenOrCaution: "Safe and metabolizes like normal dietary fatty acids. Rare skin or respiratory contact allergies."
  },
  "xanthan gum": {
    translations: {
      hi: "जैंथन गम",
      te: "క్సాంతన్ గమ్",
      ta: "சாந்தன் கம்",
      bn: "জ্যান্থান গাম",
      mr: "झँथन गम",
      es: "Goma xantana"
    },
    whatItIs: "A natural carbohydrate polysaccharide produced through fermentation by Xanthomonas campestris bacterium.",
    commonUse: "Stabilizer and thickener preventing salad dressings, gluten-free breads, and sauces from separating.",
    allergenOrCaution: "High doses can have a mild laxative effect. Often derived from corn or wheat substrate."
  },
  "soy lecithin": {
    translations: {
      hi: "सोया लेसिथिन",
      te: "సోయా లెసిథిన్",
      ta: "சோயா லெசித்தின்",
      bn: "সয়া লেসিথিন",
      mr: "सोया लेसिथिन",
      es: "Lecitina de soja"
    },
    whatItIs: "A natural mixture of phospholipids extracted from non-GMO or refined soybean oil.",
    commonUse: "Emulsifier that keeps oils and water smoothly blended together in chocolate, baked goods, and spreads.",
    allergenOrCaution: "Allergen warning: Derived from soybeans; usually tolerated by soy-allergic individuals due to minimal soy protein, but check with a physician."
  },
  "wheat flour": {
    translations: {
      hi: "गेहूं का आटा / मैदा",
      te: "గోధుమ పిండి",
      ta: "கோதுமை மாவு",
      bn: "গমের আটা",
      mr: "गव्हाचे पीठ",
      es: "Harina de trigo"
    },
    whatItIs: "Milled powder prepared from grains of wheat containing starch, gluten proteins, and dietary fiber.",
    commonUse: "Core structural base for bakery, noodles, pasta, and snacks.",
    allergenOrCaution: "Contains gluten. Strictly unsuitable for patients with Celiac disease or gluten intolerance."
  },
  "iodized salt": {
    translations: {
      hi: "आयोडीनयुक्त नमक",
      te: "అయోడైజ్డ్ ఉప్పు",
      ta: "அயோடைஸ் செய்யப்பட்ட உப்பு",
      bn: "আয়োডিনযুক্ত লবণ",
      mr: "आयोडीनयुक्त मीठ",
      es: "Sal yodada"
    },
    whatItIs: "Sodium chloride fortified with minute quantities of potassium iodate to support thyroid health.",
    commonUse: "Flavor enhancer, electrolyte donor, and natural microbial preserver.",
    allergenOrCaution: "Hypertension warning: Excessive dietary sodium intake contributes to elevated blood pressure."
  },
  "palm oil": {
    translations: {
      hi: "पाम तेल",
      te: "పామ్ ఆయిల్",
      ta: "பாமாயில்",
      bn: "পাম তেল",
      mr: "पाम तेल",
      es: "Aceite de palma"
    },
    whatItIs: "Edible vegetable oil extracted from the mesocarp of oil palm fruit.",
    commonUse: "Provides crispness and stability against oxidation in fried snacks, biscuits, and bakery items.",
    allergenOrCaution: "High in saturated fatty acids (palmitic acid). Moderate consumption recommended for cardiovascular health."
  },
  "monosodium glutamate": {
    translations: {
      hi: "मोनोसोडियम ग्लूटामेट (अजीनोमोटो)",
      te: "మోనోసోడియం గ్లుటామేట్",
      ta: "மோனோசோடியம் குளுட்டமேట్",
      bn: "মনোসোডিয়াম গ্লুটামেট",
      mr: "मोनोसोडियम ग्लुटामेट",
      es: "Glutamato monosódico"
    },
    whatItIs: "The sodium salt of glutamic acid, an amino acid occurring naturally in tomatoes and cheese.",
    commonUse: "Imparts savory 'umami' flavor in noodles, soups, savory snacks, and seasoning blends.",
    allergenOrCaution: "Contains sodium. Some sensitive people report transient flushing or headache (glutamate sensitivity)."
  },

  // Pharmaceutical Active Compounds & Excipients
  "paracetamol": {
    translations: {
      hi: "पैरासिटामोल (एसिटामिनोफेन)",
      te: "పారాసిటమాల్",
      ta: "பாராசிட்டமால்",
      bn: "প্যারাসিটামল",
      mr: "पॅरासिटामॉल",
      es: "Paracetamol"
    },
    whatItIs: "An analgesic (pain reliever) and antipyretic (fever reducer) compound acting primarily on the central nervous system.",
    commonUse: "Treats mild to moderate body pain, headaches, dental aches, and feverish viral conditions.",
    allergenOrCaution: "CRITICAL: Do not exceed 4000mg/day. Overdose causes severe liver toxicity. Do not combine with alcohol or other paracetamol medicines."
  },
  "amoxicillin trihydrate": {
    translations: {
      hi: "एमोक्सिसिलिन ट्राइहाइड्रेट",
      te: "అమోక్సిసిలిన్ ట్రైహైడ్రేట్",
      ta: "அமாக்சிசிலின் ட்ரைஹைட்ரேட்",
      bn: "অ্যামোক্সিসিলিন ট্রাইহাইড্রেট",
      mr: "एमॉक्सिसिलिन ट्रायहायड्रेट",
      es: "Amoxicilina trihidrato"
    },
    whatItIs: "A broad-spectrum beta-lactam penicillin-class antibiotic that inhibits bacterial cell wall synthesis.",
    commonUse: "Prescription treatment for bacterial infections of the chest, throat, ears, urinary tract, and skin.",
    allergenOrCaution: "PENICILLIN ALLERGY WARNING: Can cause severe anaphylactic reactions in allergic individuals. Always finish the prescribed course."
  },
  "ibuprofen": {
    translations: {
      hi: "इबुप्रोफेन",
      te: "ఐబుప్రోఫెన్",
      ta: "ஐபூபுரூஃபன்",
      bn: "আইবুপ্রোফেন",
      mr: "इबुप्रोफेन",
      es: "Ibuprofeno"
    },
    whatItIs: "A non-steroidal anti-inflammatory drug (NSAID) that inhibits prostaglandin synthesis enzymes (COX-1 & COX-2).",
    commonUse: "Reduces inflammation, swelling, menstrual cramps, arthritis stiffness, and pain.",
    allergenOrCaution: "Take with food or milk to prevent gastric irritation or stomach ulcers. Caution with kidney disease or high blood pressure."
  },
  "cetirizine dihydrochloride": {
    translations: {
      hi: "सिटिरिज़िन डाइहाइड्रोक्लोराइड",
      te: "సెటిరిజైన్ డైహైడ్రోక్లోరైడ్",
      ta: "செட்டிரிசைன் டைஹைட்ரோகுளோரைடு",
      bn: "সেটিরিজিন ডাইহাইড্রোক্লোরাইড",
      mr: "सेटिरीझिन डायहायड्रोक्लोराईड",
      es: "Diclorhidrato de cetirizina"
    },
    whatItIs: "A second-generation selective peripheral H1 receptor antagonist (antihistamine).",
    commonUse: "Relieves seasonal allergy symptoms, runny nose, sneezing, itchy watery eyes, and urticaria hives.",
    allergenOrCaution: "May cause mild drowsiness. Avoid operating heavy machinery or drinking alcohol when starting."
  },
  "metformin hydrochloride": {
    translations: {
      hi: "मेटफॉर्मिन हाइड्रोक्लोराइड",
      te: "మెట్‌ఫార్మిన్ హైడ్రోక్లోరైడ్",
      ta: "மெட்ஃபோர்மின் ஹைட்ரோகுளோரைடு",
      bn: "মেটফর্মিন হাইড্রোক্লোরাইড",
      mr: "मेटफॉर्मिन हायड्रोक्लोराईड",
      es: "Clorhidrato de metformina"
    },
    whatItIs: "A biguanide antihyperglycemic agent that reduces hepatic glucose production and boosts insulin sensitivity.",
    commonUse: "First-line oral prescription therapy for managing Type 2 Diabetes Mellitus.",
    allergenOrCaution: "Take with meals to minimize gastrointestinal discomfort. Caution in patients with kidney impairment."
  },
  "magnesium stearate": {
    translations: {
      hi: "मैग्नीशियम स्टीयरेट",
      te: "మెగ్నీషియం స్టీయరేట్",
      ta: "மெக்னீசியம் ஸ்டீயரேட்",
      bn: "ম্যাগনেসিয়াম স্টিয়ারেট",
      mr: "मॅग्नेशियम स्टीअरेट",
      es: "Estearato de magnesio"
    },
    whatItIs: "A salt composed of magnesium and stearic acid commonly used as a pharmaceutical lubricant.",
    commonUse: "Prevents tablet powders and capsules from sticking to manufacturing machinery during pressing.",
    allergenOrCaution: "Safe excipient present in minute traces. Inert and non-toxic."
  },
  "microcrystalline cellulose": {
    translations: {
      hi: "माइक्रोक्रिस्टलाइन सेल्यूलोज",
      te: "మైక్రోక్రిస్టలైన్ సెల్యులోజ్",
      ta: "மைக்ரோ கிரிஸ்டலின் செல்லுலோஸ்",
      bn: "মাইক্রোক্রিস্টালাইন সেলুলোজ",
      mr: "मायक्रोक्रिस्टलाईन सेल्युलोज",
      es: "Celulosa microcristalina"
    },
    whatItIs: "Purified, partially depolymerized plant-based dietary cellulose used as an inactive binder.",
    commonUse: "Gives tablets physical hardness, disintegrating smoothly in the stomach to release the active medicine.",
    allergenOrCaution: "Non-absorbable dietary fiber. Completely harmless and hypoallergenic."
  }
};

// Fallback dynamic generator for ingredients not explicitly in dictionary
export function getIngredientFallbackExplanation(ingredientName) {
  const clean = ingredientName.toLowerCase().trim();
  
  if (clean.includes('acid') || clean.includes('benzoate') || clean.includes('sorbate')) {
    return {
      whatItIs: `An approved food acidity regulator or preservative compound (${ingredientName}).`,
      commonUse: "Maintains optimal pH, preserves freshness, and prevents bacterial spoiling.",
      allergenOrCaution: "Generally safe in approved quantities. People with chemical sensitivities should monitor intake."
    };
  }
  if (clean.includes('oil') || clean.includes('fat') || clean.includes('lipid')) {
    return {
      whatItIs: `An edible culinary lipid or vegetable fat source (${ingredientName}).`,
      commonUse: "Provides moisture, texture, shelf stability, and flavor delivery.",
      allergenOrCaution: "Check saturated fat levels if monitoring cardiovascular cholesterol."
    };
  }
  if (clean.includes('extract') || clean.includes('powder') || clean.includes('spice') || clean.includes('flavour') || clean.includes('flavor')) {
    return {
      whatItIs: `A food flavoring or aroma seasoning extract (${ingredientName}).`,
      commonUse: "Enhances pleasant taste, aroma, and visual appeal.",
      allergenOrCaution: "Check personal allergy history for specific botanical herbs or spices."
    };
  }
  if (clean.includes('gum') || clean.includes('starch') || clean.includes('cellulose')) {
    return {
      whatItIs: `A plant- or microbial-derived polysaccharide thickener and stabilizing agent.`,
      commonUse: "Improves consistency, viscosity, and prevents separation of ingredients.",
      allergenOrCaution: "Generally gentle on digestion; high quantities might cause mild bloating."
    };
  }
  if (clean.includes('mg') || clean.includes('usp') || clean.includes('ip') || clean.includes('bp') || clean.includes('hydrochloride')) {
    return {
      whatItIs: `A medicinal active ingredient or pharmaceutical-grade excipient (${ingredientName}).`,
      commonUse: "Formulated according to pharmacopoeia standards for therapeutic dosage.",
      allergenOrCaution: "Use strictly under medical supervision or as prescribed on dosage instructions."
    };
  }

  return {
    whatItIs: `Standard commercial ingredient used in food or pharmaceutical preparation (${ingredientName}).`,
    commonUse: "Contributes to structure, nutritional profile, stability, or taste.",
    allergenOrCaution: "Check product label warnings for any specific dietary cautions or sensitivities."
  };
}
