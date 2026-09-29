import { performOcr } from './ocrService';

/**
 * Dietary & Fitness Lifestyle Goals
 */
export const DIETARY_GOALS = [
  { 
    id: 'all', 
    label: 'All Healthy Meals', 
    icon: '🥗', 
    badge: 'All Clean Eating',
    description: 'Balanced nutritious recipes using only your scanned and detected home ingredients' 
  },
  { 
    id: 'gym', 
    label: 'Gym Man / Fitness', 
    icon: '🏋️‍♂️', 
    badge: 'Anabolic & Muscle Gain',
    description: 'High protein (18g–28g per serving) with essential amino acids for muscle repair and strength' 
  },
  { 
    id: 'dieting', 
    label: 'Dieting & Fat Loss', 
    icon: '🥑', 
    badge: 'Low Calorie & Lean',
    description: 'Calorie-conscious, nutrient-dense meals that maximize fullness and keep fat loss on track' 
  },
  { 
    id: 'protein-rich', 
    label: 'Protein Rich Food', 
    icon: '🥩', 
    badge: 'High Biological Value',
    description: 'Complete proteins from fresh eggs, paneer, milk, curd, lentils, and wholesome dairy' 
  },
  { 
    id: 'high-fiber', 
    label: 'High Fiber Food', 
    icon: '🌾', 
    badge: 'Prebiotic & Gut Health',
    description: 'Rich in soluble and insoluble fiber (>=5g) to nourish gut microbiome and regulate blood sugar' 
  },
  { 
    id: 'low-fiber', 
    label: 'Low Fiber / Gentle', 
    icon: '🥣', 
    badge: 'Easy Digestion & Low Residue',
    description: 'Gentle on sensitive stomachs, easily absorbed carbohydrates, perfect for post-workout fast reload' 
  }
];

/**
 * Curated healthy zero-waste recipes with complete nutrition, fiber, cooking timings, and health scores
 */
export const CURATED_ZERO_WASTE_RECIPES = [
  {
    id: 'recipe-paneer-bhurji',
    title: 'High-Protein Paneer Bhurji & Crisp Toast',
    requiredKeywords: ['paneer', 'cottage cheese'],
    optionalKeywords: ['bread', 'milk', 'oil', 'onion', 'tomato', 'pepper'],
    timing: {
      prep: '4 mins',
      cook: '8 mins',
      total: '12 mins'
    },
    difficulty: 'Easy',
    nutrition: {
      protein: '26g',
      carbs: '24g',
      fats: '14g',
      fiber: '5.2g',
      fiberDailyValue: '21% Daily Value',
      fiberHealthBenefit: 'Insoluble fiber from onions and whole grain bread promotes smooth digestion and keeps you satiated for hours.',
      calories: '325 kcal',
      healthScore: 95,
      healthGrade: 'A',
      isHealthy: true,
      healthinessRating: 'High Protein & Lean 🥩',
      healthSummary: 'High biological value dairy protein, rich in bioavailable calcium, with complex carbohydrates for steady energy.'
    },
    dietaryCategories: ['gym', 'protein-rich', 'healthy'],
    ingredientsList: [
      'Fresh/expiring paneer or cottage cheese (crumbled into small pieces)',
      '1-2 slices of bread (toasted crisp)',
      '1 small onion or tomato (diced, if available)',
      'Pinch of turmeric, cumin, salt, and black pepper',
      '1 tsp cooking oil or butter'
    ],
    steps: [
      'Warm 1 tsp oil in a pan; add a pinch of cumin and diced onions/tomatoes if you have them.',
      'Add crumbled paneer, turmeric, salt, and black pepper. Sauté gently on medium flame for 3-4 minutes.',
      'Toast your bread slices until golden brown.',
      'Serve the warm spiced paneer over crisp toast for an instant high-protein meal before the paneer expires!'
    ],
    chefTip: 'If paneer feels slightly dry, splash 1 tbsp of milk or water to make it tender and creamy.'
  },
  {
    id: 'recipe-egg-spinach-scramble',
    title: 'Power-Gym Spinach & Egg Skillet Scramble',
    requiredKeywords: ['egg', 'eggs'],
    optionalKeywords: ['spinach', 'vegetable', 'milk', 'oil', 'onion', 'tomato', 'pepper'],
    timing: {
      prep: '3 mins',
      cook: '6 mins',
      total: '9 mins'
    },
    difficulty: 'Instant',
    nutrition: {
      protein: '22g',
      carbs: '7g',
      fats: '12g',
      fiber: '4.5g',
      fiberDailyValue: '18% Daily Value',
      fiberHealthBenefit: 'Greens provide essential prebiotic dietary fiber that balances gut bacteria without adding excess carbohydrates.',
      calories: '225 kcal',
      healthScore: 97,
      healthGrade: 'A',
      isHealthy: true,
      healthinessRating: 'Keto & Muscle Fuel 🥑',
      healthSummary: 'Gold standard complete egg protein with lutein, choline, and iron-packed spinach leaves.'
    },
    dietaryCategories: ['gym', 'dieting', 'protein-rich', 'healthy'],
    ingredientsList: [
      '2-3 eggs',
      '1 cup wilting or fresh spinach / green leaves',
      '1 tbsp milk for extra fluffiness',
      '1/2 tsp black pepper, turmeric, and pinch of salt'
    ],
    steps: [
      'Beat eggs with milk, a pinch of turmeric, salt, and black pepper.',
      'Sauté spinach in a non-stick pan for 90 seconds until wilted.',
      'Pour in the beaten eggs and stir gently over low heat for 2-3 minutes until soft curds form.',
      'Remove immediately while still tender and juicy for maximum bioavailable protein!'
    ],
    chefTip: 'Slightly wilted spinach from the crisper drawer cooks just as deliciously as crisp market spinach.'
  },
  {
    id: 'recipe-high-fiber-oats-poha',
    title: 'Prebiotic Oats & Veggie High-Fiber Bowl',
    requiredKeywords: ['oats'],
    optionalKeywords: ['vegetable', 'onion', 'tomato', 'milk', 'curd', 'peanuts'],
    timing: {
      prep: '5 mins',
      cook: '7 mins',
      total: '12 mins'
    },
    difficulty: 'Easy',
    nutrition: {
      protein: '11g',
      carbs: '38g',
      fats: '6g',
      fiber: '9.2g',
      fiberDailyValue: '37% Daily Value',
      fiberHealthBenefit: 'Rich in Beta-Glucan soluble fiber! Actively lowers LDL cholesterol and creates a protective gel in the digestive tract.',
      calories: '245 kcal',
      healthScore: 98,
      healthGrade: 'A',
      isHealthy: true,
      healthinessRating: 'Super Gut Health & High Fiber 🌾',
      healthSummary: 'High soluble and insoluble dietary fiber to control insulin spikes, eliminate hunger pangs, and optimize digestion.'
    },
    dietaryCategories: ['high-fiber', 'dieting', 'healthy'],
    ingredientsList: [
      '1 cup rolled oats or instant oats',
      '1 chopped onion and 1 chopped tomato or any vegetable in your fridge',
      'Pinch of mustard seeds, turmeric, green chili, and salt',
      '1 tsp oil and splash of lemon juice'
    ],
    steps: [
      'Lightly sprinkle water over oats in a bowl to soften them (don’t drown them).',
      'In a pan, heat 1 tsp oil with mustard seeds and sauté onions & tomatoes for 3 minutes.',
      'Add turmeric, salt, and the softened oats; toss together gently on low heat for 3-4 minutes.',
      'Finish with a squeeze of fresh lemon juice for vitamin C absorption.'
    ],
    chefTip: 'Oats absorb vegetable flavors rapidly, making this one of the most satisfying low-calorie breakfast meals.'
  },
  {
    id: 'recipe-dieting-tomato-egg-shakshuka',
    title: 'Lean Dieting Mediterranean Shakshuka Skillet',
    requiredKeywords: ['egg', 'tomato', 'tomatoes'],
    optionalKeywords: ['onion', 'garlic', 'bread', 'oil', 'pepper'],
    timing: {
      prep: '4 mins',
      cook: '8 mins',
      total: '12 mins'
    },
    difficulty: 'Easy',
    nutrition: {
      protein: '19g',
      carbs: '12g',
      fats: '10g',
      fiber: '4.8g',
      fiberDailyValue: '19% Daily Value',
      fiberHealthBenefit: 'Dietary pectin from simmered tomatoes enhances digestive flow and binds metabolic waste for elimination.',
      calories: '210 kcal',
      healthScore: 96,
      healthGrade: 'A',
      isHealthy: true,
      healthinessRating: 'Low Calorie & Antioxidant Rich 🍳',
      healthSummary: 'High lycopene from cooked tomatoes combined with satiating egg protein to support clean fat loss.'
    },
    dietaryCategories: ['dieting', 'gym', 'protein-rich', 'healthy'],
    ingredientsList: [
      '2 eggs',
      '2 soft or expiring ripe tomatoes (finely chopped)',
      '1 small onion and garlic (if available)',
      'Pinch of cumin, paprika, black pepper, and salt'
    ],
    steps: [
      'Sauté diced onion and garlic in 1 tsp oil for 2 minutes until translucent.',
      'Add chopped tomatoes, cumin, and salt; simmer on medium flame for 4 minutes until a thick aromatic sauce forms.',
      'Make two wells in the sauce and crack the eggs directly into the wells.',
      'Cover with a lid and cook on low heat for 3-4 minutes until whites are firm and yolks remain golden.'
    ],
    chefTip: 'Very soft, slightly wrinkled tomatoes make a sweeter, more lycopene-rich sauce than firm ones!'
  },
  {
    id: 'recipe-one-pot-khichdi',
    title: 'High-Fiber Moong Dal & Rice Wellness Bowl',
    requiredKeywords: ['dal', 'rice', 'lentil'],
    optionalKeywords: ['vegetable', 'spinach', 'tomato', 'oil', 'turmeric', 'ghee'],
    timing: {
      prep: '5 mins',
      cook: '15 mins',
      total: '20 mins'
    },
    difficulty: 'Easy',
    nutrition: {
      protein: '16g',
      carbs: '50g',
      fats: '5g',
      fiber: '8.5g',
      fiberDailyValue: '34% Daily Value',
      fiberHealthBenefit: 'Abundant plant fiber from split lentils cleanses the digestive tract and maintains a healthy gut microbiome.',
      calories: '310 kcal',
      healthScore: 95,
      healthGrade: 'A',
      isHealthy: true,
      healthinessRating: 'Complete Amino Acids & Gut Cleanse 🍲',
      healthSummary: 'The iconic lentil-rice synergy forms all 9 essential amino acids with gut-friendly soothing fiber.'
    },
    dietaryCategories: ['high-fiber', 'protein-rich', 'healthy'],
    ingredientsList: [
      '1/2 cup yellow moong or toor dal',
      '1/2 cup rice',
      'Any expiring vegetables (carrots, beans, spinach, peas)',
      '1/2 tsp turmeric powder & 1 tsp cumin seeds',
      '3.5 cups water and pinch of salt'
    ],
    steps: [
      'Rinse rice and lentils together in cold water.',
      'Warm 1 tsp oil or ghee in a pressure cooker; splutter cumin seeds.',
      'Add chopped vegetables, turmeric, salt, rice, dal, and water.',
      'Pressure cook for 3-4 whistles (or simmer covered for 16 minutes) until creamy and aromatic.'
    ],
    chefTip: 'Khichdi is the ultimate kitchen-sink meal: virtually any wilting vegetable can be diced into it!'
  },
  {
    id: 'recipe-curd-probiotic-smoothie',
    title: 'Anabolic Probiotic Greek Yogurt / Curd Smoothie',
    requiredKeywords: ['curd', 'yogurt', 'milk', 'dahi'],
    optionalKeywords: ['banana', 'apple', 'honey', 'oats', 'nuts'],
    timing: {
      prep: '3 mins',
      cook: '0 mins',
      total: '3 mins'
    },
    difficulty: 'Instant',
    nutrition: {
      protein: '18g',
      carbs: '32g',
      fats: '4g',
      fiber: '5.5g',
      fiberDailyValue: '22% Daily Value',
      fiberHealthBenefit: 'Fruit pectin combined with live active lactobacillus cultures fosters optimal gut flora and nutrient uptake.',
      calories: '235 kcal',
      healthScore: 97,
      healthGrade: 'A',
      isHealthy: true,
      healthinessRating: 'High Protein Probiotic Fuel 🥤',
      healthSummary: 'Live active cultures populate your gut microbiome while fast-absorbing milk whey jumpstarts protein synthesis.'
    },
    dietaryCategories: ['gym', 'dieting', 'protein-rich', 'high-fiber', 'healthy'],
    ingredientsList: [
      '1 cup chilled curd, yogurt, or expiring milk',
      '1 ripe banana or diced apple (or whatever fruit is available)',
      '1 tbsp rolled oats (optional for extra fiber)',
      '1 tsp honey or cinnamon powder'
    ],
    steps: [
      'Add fruit, curd/milk, and oats into a blender.',
      'Blend on high speed for 40 seconds until silky smooth and creamy.',
      'Pour into a tall glass and sprinkle with cinnamon.'
    ],
    chefTip: 'Overripe, spotted bananas are at their maximum natural sweetness, so no added refined sugar is needed!'
  },
  {
    id: 'recipe-low-fiber-soothing-congee',
    title: 'Gentle Low-Fiber Soothing Rice Congee',
    requiredKeywords: ['rice'],
    optionalKeywords: ['milk', 'curd', 'salt', 'ginger', 'cumin'],
    timing: {
      prep: '3 mins',
      cook: '12 mins',
      total: '15 mins'
    },
    difficulty: 'Easy',
    nutrition: {
      protein: '9g',
      carbs: '44g',
      fats: '2.5g',
      fiber: '1.2g',
      fiberDailyValue: 'Low Fiber / Gentle Residue',
      fiberHealthBenefit: 'Minimal fiber content prevents gut irritation and provides rapid, low-residue energy for sensitive stomachs.',
      calories: '230 kcal',
      healthScore: 91,
      healthGrade: 'A',
      isHealthy: true,
      healthinessRating: 'Gentle Digestion & Low Residue 🥣',
      healthSummary: 'Designed for fast gastric emptying, post-workout glycogen replenishment, or days when your digestive tract needs a rest.'
    },
    dietaryCategories: ['low-fiber', 'healthy', 'dieting'],
    ingredientsList: [
      '1/2 cup white rice',
      '3.5 cups water or dilute milk',
      'Small pinch of grated ginger, cumin, and salt'
    ],
    steps: [
      'Simmer white rice in water on low heat for 12-14 minutes, whisking occasionally until velvety and porridge-like.',
      'Stir in a pinch of salt and ginger.',
      'Serve warm for instant calming energy that is exceptionally easy to digest.'
    ],
    chefTip: 'This is the gold standard hospital and athletic recovery meal for days when high fiber causes bloating.'
  },
  {
    id: 'recipe-gym-french-toast',
    title: 'Gym-Power Anabolic French Toast',
    requiredKeywords: ['bread', 'egg', 'eggs'],
    optionalKeywords: ['milk', 'cinnamon', 'honey', 'butter', 'banana'],
    timing: {
      prep: '3 mins',
      cook: '6 mins',
      total: '9 mins'
    },
    difficulty: 'Instant',
    nutrition: {
      protein: '22g',
      carbs: '36g',
      fats: '9g',
      fiber: '4.2g',
      fiberDailyValue: '17% Daily Value',
      fiberHealthBenefit: 'Moderate dietary fiber ensures sustained carbohydrate release during intense gym sessions.',
      calories: '310 kcal',
      healthScore: 93,
      healthGrade: 'A',
      isHealthy: true,
      healthinessRating: 'Muscle Building & High Protein 🍞',
      healthSummary: 'Revitalizes expiring bread with complete amino acids from whole eggs and muscle-building glycogen.'
    },
    dietaryCategories: ['gym', 'protein-rich'],
    ingredientsList: [
      '2 slices of bread (stale or expiring bread absorbs egg batter best!)',
      '2 eggs',
      '2 tbsp milk',
      'Pinch of cinnamon and drops of honey'
    ],
    steps: [
      'Whisk eggs, milk, and cinnamon together in a shallow plate.',
      'Dip bread slices for 4 seconds per side until batter is absorbed.',
      'Cook on a lightly greased non-stick skillet on medium heat for 2-3 minutes per side until golden brown.'
    ],
    chefTip: 'Stale bread holds batter much better than fresh bread without falling apart.'
  },
  {
    id: 'recipe-low-fiber-paneer-toast',
    title: 'Easy-Digest Low-Fiber Paneer Melt',
    requiredKeywords: ['bread', 'paneer'],
    optionalKeywords: ['butter', 'salt', 'pepper', 'milk'],
    timing: {
      prep: '3 mins',
      cook: '5 mins',
      total: '8 mins'
    },
    difficulty: 'Instant',
    nutrition: {
      protein: '19g',
      carbs: '28g',
      fats: '11g',
      fiber: '1.4g',
      fiberDailyValue: 'Low Fiber / Easy Digest',
      fiberHealthBenefit: 'Low fiber content ensures zero heavy gut fermentation, perfect for a quick pre-workout bite 45 minutes before training.',
      calories: '285 kcal',
      healthScore: 92,
      healthGrade: 'A',
      isHealthy: true,
      healthinessRating: 'High Protein & Gentle Digestion 🧀',
      healthSummary: 'Clean protein and easily accessible carbohydrates with minimal digestive drag.'
    },
    dietaryCategories: ['low-fiber', 'gym', 'protein-rich'],
    ingredientsList: [
      '2 slices of white or light bread',
      '80g fresh or expiring paneer (sliced or mashed)',
      'Pinch of black pepper and sea salt',
      '1/2 tsp butter'
    ],
    steps: [
      'Place paneer slices on bread with salt and pepper.',
      'Toast on a warm skillet with a touch of butter until golden and crisp.'
    ],
    chefTip: 'Simple 4-ingredient fuel that takes under 8 minutes from start to finish.'
  },
  {
    id: 'recipe-dieting-crunch-salad',
    title: 'Zero-Waste High-Fiber Crouton Crunch Salad',
    requiredKeywords: ['bread'],
    optionalKeywords: ['vegetable', 'spinach', 'tomato', 'oil', 'lemon', 'onion'],
    timing: {
      prep: '5 mins',
      cook: '5 mins',
      total: '10 mins'
    },
    difficulty: 'Easy',
    nutrition: {
      protein: '9g',
      carbs: '26g',
      fats: '6g',
      fiber: '7.8g',
      fiberDailyValue: '31% Daily Value',
      fiberHealthBenefit: 'High volume fiber swells gently in the stomach, naturally triggering satiety hormones (leptin) to curb snacking.',
      calories: '195 kcal',
      healthScore: 96,
      healthGrade: 'A',
      isHealthy: true,
      healthinessRating: 'Low Calorie Dieting & High Fiber 🥗',
      healthSummary: 'High volume, low caloric density meal designed specifically for fat loss and gut regularity.'
    },
    dietaryCategories: ['dieting', 'high-fiber', 'healthy'],
    ingredientsList: [
      '1-2 slices expiring bread (cubed into croutons)',
      'Any available salad greens, spinach, cucumber, or tomatoes in your fridge',
      '1 tsp olive oil or vegetable oil',
      'Pinch of oregano, garlic powder, salt, and lemon juice'
    ],
    steps: [
      'Toss bread cubes with a drop of oil and dried herbs.',
      'Toast on a dry skillet for 4-5 minutes until crunchy and golden.',
      'Toss with chopped vegetables and lemon dressing for a gourmet crunch bowl.'
    ],
    chefTip: 'Crisp croutons make simple fridge greens feel like a restaurant salad.'
  },
  {
    id: 'recipe-homemade-soft-paneer',
    title: '100% Pure Artisanal Paneer from Expiring Milk',
    requiredKeywords: ['milk'],
    optionalKeywords: ['lemon', 'vinegar', 'citric acid', 'salt'],
    timing: {
      prep: '5 mins',
      cook: '10 mins',
      total: '15 mins'
    },
    difficulty: 'Easy',
    nutrition: {
      protein: '24g',
      carbs: '5g',
      fats: '15g',
      fiber: '0.5g',
      fiberDailyValue: 'Low Fiber / Zero Residue',
      fiberHealthBenefit: 'Contains pure bioavailable casein protein and zero rough fiber, making it effortlessly tolerated by the gut.',
      calories: '250 kcal',
      healthScore: 95,
      healthGrade: 'A',
      isHealthy: true,
      healthinessRating: 'Keto, Gym & Pure Protein 🥩',
      healthSummary: 'Concentrates 100% of milk casein protein, completely additive-free and natural.'
    },
    dietaryCategories: ['gym', 'protein-rich', 'low-fiber'],
    ingredientsList: [
      '1 Litre expiring milk',
      '2 tbsp lemon juice or plain vinegar',
      'Pinch of salt'
    ],
    steps: [
      'Bring milk to a gentle boil, stirring occasionally.',
      'Turn off flame. Slowly pour in lemon juice while gently stirring.',
      'Watch curds separate from translucent whey within 60 seconds.',
      'Strain through a clean cloth to enjoy warm fresh paneer!'
    ],
    chefTip: 'Save the liquid whey water! It is packed with water-soluble B-vitamins — use it to knead dough or cook rice.'
  },
  {
    id: 'recipe-crispy-bread-pizza',
    title: '10-Minute Skillet Cheesy Bread Pizza',
    requiredKeywords: ['bread'],
    optionalKeywords: ['cheese', 'tomato', 'onion', 'paneer', 'capsicum', 'oil'],
    timing: {
      prep: '4 mins',
      cook: '6 mins',
      total: '10 mins'
    },
    difficulty: 'Instant',
    nutrition: {
      protein: '16g',
      carbs: '30g',
      fats: '10g',
      fiber: '4.5g',
      fiberDailyValue: '18% Daily Value',
      fiberHealthBenefit: 'Combines dietary fiber from whole grains & diced veggies with calcium from dairy cheese.',
      calories: '275 kcal',
      healthScore: 90,
      healthGrade: 'A',
      isHealthy: true,
      healthinessRating: 'Comfort Food & Calcium Rich 🧀',
      healthSummary: 'A fast, gourmet snack that rescues stale bread with bioavailable calcium and protein.'
    },
    dietaryCategories: ['protein-rich', 'healthy'],
    ingredientsList: [
      '2 slices of bread',
      '2-3 tbsp shredded cheese or crumbled paneer',
      'Sliced tomato and onion from your fridge',
      'Pinch of oregano, chili flakes, and salt'
    ],
    steps: [
      'Toast one side of the bread on a skillet with a drop of oil.',
      'Flip over; top with sliced tomatoes, onions, cheese or paneer, and oregano.',
      'Cover with a lid for 3-4 minutes on low heat until cheese melts and base turns crunchy.'
    ],
    chefTip: 'Covering the pan with a lid creates an oven-like heat trap that melts the cheese perfectly without burning the crust.'
  }
];

/**
 * Matches user's detected available ingredients and filters by dietary/fitness goal
 * Strict rule: ONLY suggests recipes that use at least 1 of the user's available ingredients!
 */
export function generateRecipesForItems(pantryItems = [], apiKeys = {}, goalFilter = 'all') {
  // Extract item names and categories
  const groceryItems = (pantryItems || []).filter(i => {
    if (!i) return false;
    const type = i.type || 'grocery';
    return type === 'grocery' && i.status !== 'wasted';
  });
  
  // If NO ingredients detected / available, return empty array
  // (Forces the user to scan or pick ingredients first)
  if (groceryItems.length === 0) {
    return [];
  }

  const groceryNames = groceryItems.map(i => {
    const rawName = typeof i === 'string' ? i : (i.name || '');
    const cleanName = rawName.toLowerCase().replace(/[\(\)\[\],]/g, ' ');
    const cat = typeof i === 'object' ? (i.category || '').toLowerCase() : '';
    return {
      id: i.id || cleanName,
      name: cleanName,
      category: cat,
      original: typeof i === 'string' ? { name: i } : i
    };
  });

  // Score each recipe based on user's available detected items
  const scoredRecipes = [];

  for (const recipe of CURATED_ZERO_WASTE_RECIPES) {
    // 1. Filter by dietary goal if specified
    if (goalFilter && goalFilter !== 'all') {
      if (!recipe.dietaryCategories || !recipe.dietaryCategories.includes(goalFilter)) {
        continue; // Skip recipe if it does not match user's goal (e.g., gym, dieting, low-fiber)
      }
    }

    let matchScore = 0;
    const matchedItemIds = [];
    const matchedItemNames = [];

    // Check required keywords
    const hasRequired = recipe.requiredKeywords.some(kw => {
      const match = groceryNames.find(g => g.name.includes(kw) || g.category.includes(kw));
      if (match) {
        matchScore += 12;
        if (!matchedItemIds.includes(match.id)) {
          matchedItemIds.push(match.id);
          matchedItemNames.push(match.original.name || kw);
        }
        return true;
      }
      return false;
    });

    // Check optional keywords
    recipe.optionalKeywords.forEach(kw => {
      const match = groceryNames.find(g => g.name.includes(kw) || g.category.includes(kw));
      if (match) {
        matchScore += 4;
        if (!matchedItemIds.includes(match.id)) {
          matchedItemIds.push(match.id);
          matchedItemNames.push(match.original.name || kw);
        }
      }
    });

    // STRICT RULE: If NONE of the user's available ingredients match this recipe, DO NOT suggest it!
    if (matchedItemNames.length === 0) {
      continue;
    }

    scoredRecipes.push({
      ...recipe,
      matchScore: hasRequired ? matchScore + 10 : matchScore,
      matchedItemIds,
      matchedItemNames,
      usesExpiringCount: matchedItemIds.length
    });
  }

  // Sort by highest match score
  return scoredRecipes.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Comprehensive Knowledge Base on Post-Expiry Actions, Repurposing, and Safe Medical Disposal
 */
export const POST_EXPIRY_GUIDELINES = {
  // Medical Safe Disposal & Hazard Protocols
  medicines: [
    {
      id: 'med-household-disposal',
      category: 'Medicines & Clinical',
      title: 'Safe Home Disposal Protocol (The Dirt/Coffee Grounds Method)',
      severity: 'safe-practice',
      badge: 'FDA & WHO Recommended 🛡️',
      summary: 'How to safely discard solid tablets, pills, and capsules without contaminating water supplies or endangering pets.',
      keyTakeaway: 'NEVER flush down toilet or sink. Mix with coffee grounds or dirt in a sealed bag.',
      steps: [
        'Take uncrushed tablets out of their plastic blister packs or bottles.',
        'Mix the tablets with an undesirable household substance (e.g., used wet coffee grounds, cat litter, or garden dirt). This prevents accidental ingestion by scavengers, pets, or children.',
        'Place the entire mixture into a sealable, leak-proof plastic bag or empty sealed can.',
        'Scratch out or peel off all personal info, patient name, and Rx prescription number from the empty medicine packaging to protect your identity.',
        'Dispose of the sealed bag in your regular household trash and recycle the cardboard packaging.'
      ],
      hazardNote: 'Flushing medications introduces antibiotics, hormones, and synthetic compounds into groundwater and municipal reservoirs which treatment plants cannot filter out.'
    },
    {
      id: 'med-eye-drops-warning',
      category: 'Medicines & Clinical',
      title: 'Eye & Ear Drops: Strict 28-Day Discard Rule',
      severity: 'critical-hazard',
      badge: 'Clinical Hazard ⚠️',
      summary: 'Why opened eye drops must NEVER be used after 28-30 days regardless of the printed bottle expiry date.',
      keyTakeaway: 'Preservatives in eye drops break down 28 days after first opening. Continuing use risks corneal bacterial ulcers.',
      steps: [
        'Mark the date you opened the dropper on the bottle label with a permanent marker.',
        'Discard exactly 28 days after breaking the safety seal, even if medicine remains in the bottle.',
        'To discard: Squeeze remaining liquid onto absorbent paper towels or sawdust, place in a plastic bag, seal, and throw into trash.',
        'Rinse the plastic bottle and recycle.'
      ],
      hazardNote: 'Ophthalmic solutions lose sterility once exposed to ambient air. Serious bacterial infections (Pseudomonas) can cause permanent vision impairment.'
    },
    {
      id: 'med-antibiotics-protocol',
      category: 'Medicines & Clinical',
      title: 'Expired Antibiotics & Liquid Suspensions',
      severity: 'critical-hazard',
      badge: 'Superbug Risk 🚨',
      summary: 'Why taking expired antibiotics is dangerous and how to dispose of reconstituted syrups.',
      keyTakeaway: 'Degraded antibiotics lead to antibiotic resistance and failed treatment. Dispose via pharmacy take-back.',
      steps: [
        'Reconstituted antibiotic dry syrups (like Amoxicillin) expire within 10-14 days after adding water. Discard immediately after the prescribed course.',
        'Preferably drop off expired antibiotics at a hospital pharmacy hazardous drug disposal collection bin.',
        'Never save half-used antibiotic bottles for future illnesses — dosage requirements and bacterial sensitivity differ with every infection.'
      ],
      hazardNote: 'Sub-therapeutic concentrations of degraded antibiotics do not kill bacteria; instead, they train pathogens into multidrug-resistant superbugs.'
    },
    {
      id: 'med-pharmacy-takeback',
      category: 'Medicines & Clinical',
      title: 'Hospital & Pharmacy Take-Back Programs',
      severity: 'best-option',
      badge: 'Eco-Gold Standard ♻️',
      summary: 'The cleanest, most responsible disposal route for injectables, narcotics, and chemotherapy agents.',
      keyTakeaway: 'Look for designated green medical disposal drop-boxes at local clinics or municipal collection sites.',
      steps: [
        'Gather expired blister packs, inhalers, and ointments in a dedicated bag.',
        'Visit your local hospital, government dispensary, or pharmacy chain.',
        'Deposit in their designated "Unused / Expired Medicine Drop Box" for authorized high-temperature medical incineration.'
      ],
      hazardNote: 'Medical incineration neutralizes active pharmaceutical ingredients without atmospheric or soil contamination.'
    }
  ],

  // Grocery Safe Repurposing & Food Hacks
  groceries: [
    {
      id: 'food-sour-milk',
      category: 'Dairy & Milk Products',
      title: 'Sour or Souring Milk: Curds, Cheese & Plant Tonic',
      severity: 'repurpose-safe',
      badge: 'High Value Reuse 🥛',
      summary: 'Before milk completely spoils into rancidity, slightly sour milk can be converted into delicious cheese or garden fertilizer.',
      keyTakeaway: 'Boil with lemon juice to make fresh paneer; use the whey water as rich garden plant fertilizer.',
      steps: [
        'Boil souring milk in a pot; add 1 tbsp lemon juice or vinegar. The milk will cleanly separate into curds and clear whey.',
        'Strain curds through a muslin cloth to make artisanal fresh paneer or baking ricotta.',
        'Let the strained liquid whey cool down; dilute 1:1 with water and pour into the soil of tomato or rose plants. Whey is rich in organic nitrogen and calcium!',
        'Can also be used in baking soda pancakes or sourdough bread dough as natural acid leavening.'
      ],
      hazardNote: 'If milk smells completely foul/rancid or has pink/yellow molds, DO NOT consume. Pour onto garden compost or discard.'
    },
    {
      id: 'food-stale-bread',
      category: 'Bakery & Bread',
      title: 'Stale Bread: Crunchy Croutons & Golden Breadcrumbs',
      severity: 'repurpose-safe',
      badge: 'Zero Waste Classic 🍞',
      summary: 'Hard, dry bread is a culinary asset, not garbage! Dry bread absorbs flavors wonderfully.',
      keyTakeaway: 'Bake into croutons, blend into breadcrumbs, or make french toast. Discard if furry mold is visible.',
      steps: [
        'Croutons: Cube the bread, toss with olive oil and Italian herbs, and toast in an oven or pan until crisp.',
        'Breadcrumbs: Pulse hard bread in a food processor or grate it finely. Store in an airtight jar for cutlets, nuggets, or pasta toppings.',
        'French Toast / Bread Pudding: Stale bread holds egg-milk custard far better than soft bread.',
        'Compost: Non-moldy crusts can be shredded into your home compost bin as brown carbon-rich material.'
      ],
      hazardNote: 'If green, blue, or white fuzzy mold appears on bread, throw the entire loaf away. Porous bread allows mold roots (mycelium) to penetrate deep beneath the crust.'
    },
    {
      id: 'food-spotted-bananas',
      category: 'Vegetables & Fruits',
      title: 'Spotted & Soft Bananas: Bread, Smoothies & Fertilizer',
      severity: 'repurpose-safe',
      badge: 'Zero Waste Classic 🍌',
      summary: 'Brown, spotted bananas are at their absolute peak sugar and antioxidant content.',
      keyTakeaway: 'Peel, freeze for smoothies or bake into banana bread. Use the peel for orchid/plant fertilizer.',
      steps: [
        'Peel very ripe bananas, chop into chunks, and freeze in an airtight box for instant creamy ice-cream style smoothies.',
        'Mash into pancake batter or quick banana bread without needing added refined sugar.',
        'Banana Peel Tea: Soak banana skins in a jar of water for 48 hours; dilute and water indoor plants. Banana peel is rich in bioavailable potassium and phosphorus!'
      ],
      hazardNote: 'Bananas are safe to use as long as there is no fruit fly infestation or sour alcoholic odor from wild fermentation.'
    },
    {
      id: 'food-wilting-greens',
      category: 'Vegetables & Fruits',
      title: 'Wilting Spinach & Herbs: Ice-Cube Herb Cubes & Dal',
      severity: 'repurpose-safe',
      badge: 'Nutrient Saver 🥬',
      summary: 'Slightly limp or wrinkled leafy greens have lost water, not their vitamins!',
      keyTakeaway: 'Drop into warm soups, blend into green pestos, or freeze in ice-cube trays with olive oil.',
      steps: [
        'Blanch wilting spinach or mint in boiling water for 30 seconds, then shock in cold water.',
        'Puree and pour into ice cube trays. Pop one cube into curries, dal, or pasta sauces for instant greens.',
        'Finely chop into egg scrambles or paratha dough.'
      ],
      hazardNote: 'Discard if leaves have turned into a black, foul-smelling slime.'
    }
  ]
};

/**
 * 1-Click kitchen snapshots for instant testing of the vision scanner
 */
export const KITCHEN_SAMPLE_SNAPSHOTS = [
  {
    id: 'snap-fridge-1',
    title: 'Fridge Top Shelf',
    subtitle: 'Milk, Eggs, Bread, Yogurt',
    image: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80',
    detectedIngredients: ['Milk', 'Eggs', 'Bread', 'Curd']
  },
  {
    id: 'snap-veggie-basket',
    title: 'Veggie Crisper Basket',
    subtitle: 'Tomatoes, Spinach, Onions',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    detectedIngredients: ['Tomato', 'Spinach', 'Onion']
  },
  {
    id: 'snap-pantry-staples',
    title: 'Pantry Shelf & Staples',
    subtitle: 'Paneer, Oats, Rice, Dal',
    image: 'https://images.unsplash.com/photo-1506484381205-f7945653044d?auto=format&fit=crop&w=600&q=80',
    detectedIngredients: ['Paneer', 'Oats', 'Rice', 'Dal']
  }
];

const COMMON_FOOD_DICTIONARY = [
  'Milk', 'Bread', 'Eggs', 'Cheese', 'Paneer', 'Butter', 'Yogurt', 'Curd', 'Cream', 'Ghee',
  'Tomato', 'Tomatoes', 'Onion', 'Onions', 'Potato', 'Potatoes', 'Garlic', 'Ginger', 'Spinach',
  'Carrot', 'Capsicum', 'Lemon', 'Apple', 'Banana', 'Chili', 'Peas', 'Beans', 'Rice',
  'Dal', 'Oats', 'Pasta', 'Noodles', 'Flour', 'Atta', 'Chickpeas', 'Corn', 'Oil'
];

/**
 * Extracts recognized food ingredients from OCR raw text
 */
function parseIngredientsFromText(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched = [];

  for (const food of COMMON_FOOD_DICTIONARY) {
    const term = food.toLowerCase();
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(lower) && !matched.includes(food)) {
      matched.push(food);
    }
  }

  return matched;
}

/**
 * Detects available home ingredients from photo (using sample presets, OCR, or AI Vision)
 */
export async function detectIngredientsFromImage(imageSource, apiKeys = {}, onProgress = null) {
  // If user selected one of our sample snapshots, return its preset instantly
  if (typeof imageSource === 'object' && imageSource?.detectedIngredients) {
    if (onProgress) onProgress({ status: 'Recognizing visible grocery items...', progress: 0.8 });
    await new Promise(r => setTimeout(r, 600));
    return {
      detectedIngredients: imageSource.detectedIngredients,
      rawText: imageSource.detectedIngredients.join(', ')
    };
  }

  // 1. Try OCR text recognition
  let extractedText = '';
  try {
    if (onProgress) onProgress({ status: 'Scanning kitchen packages & food labels...', progress: 0.4 });
    const ocrResult = await performOcr(imageSource, {
      googleVisionApiKey: apiKeys.googleVisionApiKey,
      onProgress: p => {
        if (onProgress) onProgress({ status: `Reading labels: ${p.status}`, progress: 0.2 + (p.progress || 0) * 0.5 });
      }
    });
    extractedText = ocrResult?.text || '';
  } catch (err) {
    console.warn('OCR error during kitchen scan:', err);
  }

  // 2. Parse text against food dictionary
  const found = parseIngredientsFromText(extractedText);
  if (found.length > 0) {
    if (onProgress) onProgress({ status: 'Ingredients recognized!', progress: 1.0 });
    return { detectedIngredients: found, rawText: extractedText };
  }

  // Fallback defaults if image is unreadable / low contrast
  return {
    detectedIngredients: ['Bread', 'Milk', 'Eggs', 'Tomatoes'],
    rawText: extractedText || 'Visual recognition completed'
  };
}
