package com.bitebeforeexpiry.app.domain.engine

import com.bitebeforeexpiry.app.domain.model.Ingredient

object AllergyMatchingEngine {

    private val ALLERGEN_SYNONYM_MAP = mapOf(
        "Milk" to listOf("milk", "lactose", "whey", "casein", "butter", "cream", "cheese", "yogurt", "milk solids", "milk powder", "ghee", "curd"),
        "Peanuts" to listOf("peanut", "peanuts", "groundnut", "arachis", "peanut oil", "peanut flour", "peanut butter"),
        "Tree Nuts" to listOf("almond", "walnut", "cashew", "pistachio", "hazelnut", "pecan", "macadamia", "brazil nut", "chestnut"),
        "Soy" to listOf("soy", "soya", "soybean", "soy lecithin", "edamame", "tofu", "soy sauce", "soy protein"),
        "Wheat" to listOf("wheat", "flour", "semolina", "spelt", "durum", "farina", "wheat flour", "wheat gluten", "atta", "maida"),
        "Gluten" to listOf("gluten", "barley", "rye", "wheat", "oats", "malt"),
        "Egg" to listOf("egg", "eggs", "egg white", "egg yolk", "albumin", "lysozyme", "ovalbumin", "mayonnaise"),
        "Fish" to listOf("fish", "salmon", "tuna", "cod", "tilapia", "anchovy", "fish gelatin", "fish sauce"),
        "Shellfish" to listOf("shrimp", "prawn", "crab", "lobster", "crawfish", "mussel", "oyster", "clam", "squid"),
        "Sesame" to listOf("sesame", "tahini", "sesame seed", "sesame oil", "til")
    )

    data class AllergyMatchResult(
        val isAllergenDetected: Boolean,
        val matchedAllergens: List<String>,
        val matchedIngredients: List<String>,
        val disclaimer: String = "Potential allergen match detected based on ingredient names. Always verify the actual product package label."
    )

    fun checkAllergens(
        ingredients: List<Ingredient>,
        userSelectedAllergens: Set<String>,
        customAllergens: List<String> = emptyList()
    ): AllergyMatchResult {
        if (userSelectedAllergens.isEmpty() && customAllergens.isEmpty()) {
            return AllergyMatchResult(false, emptyList(), emptyList())
        }

        val matchedAllergens = mutableSetOf<String>()
        val matchedIngredients = mutableSetOf<String>()

        val ingredientTextList = ingredients.map { it.name.lowercase() }

        // Check standard selected allergens
        for (allergenCategory in userSelectedAllergens) {
            val synonyms = ALLERGEN_SYNONYM_MAP[allergenCategory] ?: listOf(allergenCategory.lowercase())
            for (ingredient in ingredientTextList) {
                for (synonym in synonyms) {
                    if (ingredient.contains(synonym)) {
                        matchedAllergens.add(allergenCategory)
                        matchedIngredients.add(ingredient)
                    }
                }
            }
        }

        // Check custom allergens
        for (custom in customAllergens) {
            val customLower = custom.trim().lowercase()
            if (customLower.isEmpty()) continue
            for (ingredient in ingredientTextList) {
                if (ingredient.contains(customLower)) {
                    matchedAllergens.add(custom)
                    matchedIngredients.add(ingredient)
                }
            }
        }

        return AllergyMatchResult(
            isAllergenDetected = matchedAllergens.isNotEmpty(),
            matchedAllergens = matchedAllergens.toList(),
            matchedIngredients = matchedIngredients.toList()
        )
    }
}
