package com.bitebeforeexpiry.app.ai

import com.bitebeforeexpiry.app.domain.model.Ingredient

data class IngredientAnalysis(
    val explanation: String,
    val purpose: String,
    val allergenStatus: String,
    val confidence: Float = 0.95f
)

interface IngredientAnalyzer {
    suspend fun analyze(
        ingredientName: String,
        category: String = "Food",
        language: String = "en"
    ): IngredientAnalysis
}

class MockIngredientAnalyzer : IngredientAnalyzer {

    private val DATABASE = mapOf(
        "sugar" to IngredientAnalysis(
            explanation = "A common sweetener derived from sugar cane or sugar beet.",
            purpose = "Sweetener & flavor enhancer",
            allergenStatus = "None"
        ),
        "milk solids" to IngredientAnalysis(
            explanation = "Dehydrated milk component containing lactose, proteins, and minerals.",
            purpose = "Texture, creaminess & protein source",
            allergenStatus = "Milk Allergen"
        ),
        "cocoa" to IngredientAnalysis(
            explanation = "Powder made from roasted, ground cacao seeds.",
            purpose = "Chocolate flavor & natural antioxidant",
            allergenStatus = "None"
        ),
        "soy lecithin" to IngredientAnalysis(
            explanation = "An emulsifier derived from soybeans that binds fats and liquids.",
            purpose = "Emulsifier & texture stabilizer",
            allergenStatus = "Soy Allergen"
        ),
        "citric acid" to IngredientAnalysis(
            explanation = "A natural weak acid found in citrus fruits.",
            purpose = "Acidity regulator & natural preservative",
            allergenStatus = "None"
        ),
        "sodium benzoate" to IngredientAnalysis(
            explanation = "A common preservative that prevents mold and microbial growth.",
            purpose = "Preservative to extend shelf life",
            allergenStatus = "Preservative"
        ),
        "xanthan gum" to IngredientAnalysis(
            explanation = "A plant-based soluble fiber produced by fermentation.",
            purpose = "Thickener & stabilizer",
            allergenStatus = "None"
        ),
        "palm oil" to IngredientAnalysis(
            explanation = "An edible vegetable oil derived from the fruit of oil palms.",
            purpose = "Fat source & texture builder",
            allergenStatus = "None"
        ),
        "peanut flour" to IngredientAnalysis(
            explanation = "De-fatted ground peanuts used for flavor and protein.",
            purpose = "Flavor & protein boost",
            allergenStatus = "Peanut Allergen"
        ),
        "paracetamol" to IngredientAnalysis(
            explanation = "An analgesic and antipyretic active pharmaceutical ingredient.",
            purpose = "Pain relief & fever reduction",
            allergenStatus = "Active Drug"
        )
    )

    override suspend fun analyze(
        ingredientName: String,
        category: String,
        language: String
    ): IngredientAnalysis {
        val key = ingredientName.trim().lowercase()
        return DATABASE[key] ?: IngredientAnalysis(
            explanation = "Common constituent used in food or consumer product formulation.",
            purpose = "Flavor, texture, or preservation agent",
            allergenStatus = "Standard Component",
            confidence = 0.80f
        )
    }
}
