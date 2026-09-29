import { INGREDIENT_KNOWLEDGE_BASE, getIngredientFallbackExplanation } from '../data/ingredientDatabase';

/**
 * Calls OpenAI API (if configured)
 */
async function callOpenAiApi(prompt, systemPrompt, apiKey) {
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('{{API_KEY_HERE}}')) {
    return null;
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    }
  } catch (err) {
    console.warn('OpenAI API call failed:', err);
  }
  return null;
}

/**
 * Calls Anthropic Claude API (if configured)
 */
async function callClaudeApi(prompt, systemPrompt, apiKey) {
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('{{API_KEY_HERE}}')) {
    return null;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text?.trim() || null;
    }
  } catch (err) {
    console.warn('Claude API call failed:', err);
  }
  return null;
}

/**
 * Explains an ingredient in simple terms:
 * 1. What it is
 * 2. Common use
 * 3. Allergen/caution note
 */
export async function explainIngredient(ingredientName, language = 'en', apiKeys = {}) {
  const cleanName = ingredientName.trim();
  const lower = cleanName.toLowerCase();

  // 1. Try LLM if user provided OpenAI or Claude API keys
  const prompt = `Explain the food or medicine ingredient "${cleanName}" in simple terms for everyday consumers (elderly or non-technical). Respond with 1-3 sentences covering: (1) what it is, (2) common use, and (3) any allergen or health caution. If language is '${language}' and not 'en', provide the explanation in '${language}'. Output in JSON format with keys: "whatItIs", "commonUse", "allergenOrCaution".`;
  const systemPrompt = "You are a concise, empathetic clinical pharmacist and food safety expert.";

  let llmResponse = null;
  if (apiKeys.openaiApiKey && !apiKeys.openaiApiKey.includes('{{API_KEY_HERE}}')) {
    llmResponse = await callOpenAiApi(prompt, systemPrompt, apiKeys.openaiApiKey);
  } else if (apiKeys.claudeApiKey && !apiKeys.claudeApiKey.includes('{{API_KEY_HERE}}')) {
    llmResponse = await callClaudeApi(prompt, systemPrompt, apiKeys.claudeApiKey);
  }

  if (llmResponse) {
    try {
      const parsed = JSON.parse(llmResponse.replace(/```json|```/g, '').trim());
      if (parsed.whatItIs) return parsed;
    } catch (_) {
      return {
        whatItIs: llmResponse,
        commonUse: 'Active or structural ingredient.',
        allergenOrCaution: 'Review standard package directions.'
      };
    }
  }

  // 2. Curated database match
  for (const [key, data] of Object.entries(INGREDIENT_KNOWLEDGE_BASE)) {
    if (lower.includes(key) || key.includes(lower)) {
      return {
        whatItIs: data.whatItIs,
        commonUse: data.commonUse,
        allergenOrCaution: data.allergenOrCaution
      };
    }
  }

  // 3. Fallback generator
  return getIngredientFallbackExplanation(cleanName);
}

/**
 * Estimates reasonable shelf-life expiry date for undated items
 * Uses prompt: "Based on typical shelf life, estimate a reasonable expiry date range for '{itemName}' (category: {category}), assuming it was purchased/opened today ({currentDate}). Give a single best-estimate date and briefly explain your reasoning in one sentence."
 */
export async function estimateExpiry(itemName, category = 'Other Grocery', currentDate = null, apiKeys = {}) {
  const today = currentDate || new Date().toISOString().split('T')[0];

  const prompt = `Based on typical shelf life, estimate a reasonable expiry date range for '${itemName}' (category: ${category}), assuming it was purchased/opened today (${today}). Give a single best-estimate date in YYYY-MM-DD format and briefly explain your reasoning in one sentence. Respond in JSON format: {"estimatedExpiryDate": "YYYY-MM-DD", "shelfLifeDays": number, "reasoning": "one sentence explanation"}`;
  const systemPrompt = "You are an expert food technologist and household pantry safety AI.";

  let llmResponse = null;
  if (apiKeys.openaiApiKey && !apiKeys.openaiApiKey.includes('{{API_KEY_HERE}}')) {
    llmResponse = await callOpenAiApi(prompt, systemPrompt, apiKeys.openaiApiKey);
  } else if (apiKeys.claudeApiKey && !apiKeys.claudeApiKey.includes('{{API_KEY_HERE}}')) {
    llmResponse = await callClaudeApi(prompt, systemPrompt, apiKeys.claudeApiKey);
  }

  if (llmResponse) {
    try {
      const parsed = JSON.parse(llmResponse.replace(/```json|```/g, '').trim());
      if (parsed.estimatedExpiryDate && parsed.reasoning) {
        return parsed;
      }
    } catch (_) {}
  }

  // Realistic shelf-life rules engine
  return calculateHeuristicShelfLife(itemName, category, today);
}

// Comprehensive culinary & pharmaceutical shelf-life database
function calculateHeuristicShelfLife(itemName, category, baseDateStr) {
  const name = itemName.toLowerCase();
  const cat = category.toLowerCase();
  const baseDate = new Date(baseDateStr);

  let days = 7;
  let reason = 'Standard perishable shelf life under normal refrigeration.';

  if (name.includes('milk') || name.includes('dairy')) {
    days = 5;
    reason = 'Fresh milk typically retains peak freshness for 4-5 days after opening when refrigerated.';
  } else if (name.includes('paneer') || name.includes('cottage cheese')) {
    days = 4;
    reason = 'Fresh artisanal paneer has high moisture and typically lasts 4-5 days kept refrigerated.';
  } else if (name.includes('bread') || name.includes('bun') || name.includes('bakery')) {
    days = 4;
    reason = 'Fresh bakery bread is free of heavy preservatives and best consumed within 3-4 days.';
  } else if (name.includes('yogurt') || name.includes('curd') || name.includes('dahi')) {
    days = 7;
    reason = 'Yogurt with active live cultures stays fresh for 7-10 days refrigerated.';
  } else if (name.includes('egg') || cat.includes('egg')) {
    days = 21;
    reason = 'Fresh refrigerated whole eggs remain safe and viable for approximately 3-4 weeks.';
  } else if (name.includes('chicken') || name.includes('meat') || name.includes('fish')) {
    days = 2;
    reason = 'Fresh raw poultry, seafood, or ground meats should be cooked or frozen within 1-2 days.';
  } else if (name.includes('apple') || name.includes('orange') || name.includes('citrus')) {
    days = 14;
    reason = 'Firm fruits maintain quality for 2-3 weeks in cool crisper storage.';
  } else if (name.includes('berry') || name.includes('strawberry') || name.includes('spinach') || name.includes('leaf')) {
    days = 4;
    reason = 'Delicate leafy greens and fresh berries are prone to moisture decay within 3-5 days.';
  } else if (name.includes('rice') || name.includes('flour') || name.includes('grain') || name.includes('dal')) {
    days = 180;
    reason = 'Dry pantry staples remain shelf-stable for 6 months in an airtight container.';
  } else if (name.includes('chip') || name.includes('biscuit') || name.includes('snack')) {
    days = 60;
    reason = 'Packaged dry snacks typically stay crispy for 2 months if sealed away from humidity.';
  } else if (name.includes('syrup') || name.includes('liquid') || cat.includes('syrup')) {
    days = 30;
    reason = 'Opened medicinal oral liquids and cough syrups should typically be used within 30 days.';
  } else if (name.includes('eye drop') || name.includes('ear drop') || cat.includes('drops')) {
    days = 28;
    reason = 'Strict ophthalmic sterility guidelines advise discarding eye drops 28 days after first opening.';
  } else if (name.includes('antibiotic') || cat.includes('antibiotic')) {
    days = 14;
    reason = 'Reconstituted oral antibiotic suspensions degrade rapidly and must be discarded after 10-14 days.';
  } else if (name.includes('tablet') || name.includes('capsule') || cat.includes('tablet')) {
    days = 365;
    reason = 'Dry prescription tablets generally remain chemically stable for 12 months when protected from moisture.';
  } else if (cat.includes('vegetable')) {
    days = 6;
    reason = 'Fresh vegetables retain optimal crispness and nutrients for about 5-7 days refrigerated.';
  }

  const targetDate = new Date(baseDate);
  targetDate.setDate(targetDate.getDate() + days);

  return {
    estimatedExpiryDate: targetDate.toISOString().split('T')[0],
    shelfLifeDays: days,
    reasoning: reason
  };
}
