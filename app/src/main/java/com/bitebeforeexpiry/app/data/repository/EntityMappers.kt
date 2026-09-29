package com.bitebeforeexpiry.app.data.repository

import com.bitebeforeexpiry.app.data.local.entity.HouseholdMemberEntity
import com.bitebeforeexpiry.app.data.local.entity.ProductEntity
import com.bitebeforeexpiry.app.data.local.entity.WasteRecordEntity
import com.bitebeforeexpiry.app.domain.engine.AllergyMatchingEngine
import com.bitebeforeexpiry.app.domain.engine.AttentionEngine
import com.bitebeforeexpiry.app.domain.engine.ExpiryEngine
import com.bitebeforeexpiry.app.domain.model.*

fun ProductEntity.toDomainModel(userSelectedAllergens: Set<String> = emptySet()): Product {
    val ingredientsList = if (ingredientsJson.isEmpty()) emptyList()
    else ingredientsJson.split("|||").map { name ->
        Ingredient(name = name.trim())
    }

    val allergyMatchResult = AllergyMatchingEngine.checkAllergens(ingredientsList, userSelectedAllergens)

    val currentExpiryStatus = ExpiryEngine.calculateStatus(expiryDate)
    val remainingDays = ExpiryEngine.daysRemaining(expiryDate)
    val parsedCategory = try { ProductCategory.valueOf(category) } catch (e: Exception) { ProductCategory.FOOD }

    val calculatedPriority = AttentionEngine.determinePriority(
        expiryStatus = currentExpiryStatus,
        hasAllergenMatch = allergyMatchResult.isAllergenDetected,
        category = parsedCategory,
        daysRemaining = remainingDays
    )

    return Product(
        id = id,
        name = name,
        brand = brand,
        category = parsedCategory,
        barcode = barcode,
        imageUri = imageUri,
        manufacturingDate = manufacturingDate,
        bestBeforeDate = bestBeforeDate,
        expiryDate = expiryDate,
        labelType = labelType,
        ingredients = ingredientsList,
        nutrition = parseNutritionJson(nutritionJson),
        rawOcrText = rawOcrText,
        language = language,
        status = currentExpiryStatus,
        priority = calculatedPriority,
        quantity = quantity,
        purchasePrice = purchasePrice,
        notes = notes,
        createdAt = createdAt,
        notificationEnabled = notificationEnabled,
        allergenMatchCount = allergyMatchResult.matchedAllergens.size,
        allergenMatches = allergyMatchResult.matchedAllergens
    )
}

fun Product.toEntity(): ProductEntity {
    val ingredientsStr = ingredients.joinToString("|||") { it.name }
    val nutritionStr = formatNutritionJson(nutrition)

    return ProductEntity(
        id = id,
        name = name,
        brand = brand,
        category = category.name,
        barcode = barcode,
        imageUri = imageUri,
        manufacturingDate = manufacturingDate,
        bestBeforeDate = bestBeforeDate,
        expiryDate = expiryDate,
        labelType = labelType,
        ingredientsJson = ingredientsStr,
        nutritionJson = nutritionStr,
        rawOcrText = rawOcrText,
        language = language,
        status = status.name,
        priority = priority.name,
        quantity = quantity,
        purchasePrice = purchasePrice,
        notes = notes,
        createdAt = createdAt,
        notificationEnabled = notificationEnabled,
        allergenMatchCount = allergenMatchCount,
        allergenMatches = allergenMatches
    )
}

fun WasteRecordEntity.toDomainModel(): WasteRecord {
    val parsedCat = try { ProductCategory.valueOf(category) } catch (e: Exception) { ProductCategory.FOOD }
    return WasteRecord(
        id = id,
        productId = productId,
        productName = productName,
        category = parsedCat,
        expiryDate = expiryDate,
        discardedDate = discardedDate,
        cost = cost,
        wasSaved = wasSaved
    )
}

fun WasteRecord.toEntity(): WasteRecordEntity {
    return WasteRecordEntity(
        id = id,
        productId = productId,
        productName = productName,
        category = category.name,
        expiryDate = expiryDate,
        discardedDate = discardedDate,
        cost = cost,
        wasSaved = wasSaved
    )
}

fun HouseholdMemberEntity.toDomainModel(): HouseholdMember {
    return HouseholdMember(id = id, name = name, role = role, allergies = allergies)
}

fun HouseholdMember.toEntity(): HouseholdMemberEntity {
    return HouseholdMemberEntity(id = id, name = name, role = role, allergies = allergies)
}

private fun parseNutritionJson(json: String): NutritionInfo? {
    if (json.isEmpty()) return null
    val parts = json.split(";")
    var cal: Double? = null
    var sug: Double? = null
    var prot: Double? = null
    var sod: Double? = null
    var fib: Double? = null
    var fat: Double? = null

    for (part in parts) {
        val kv = part.split("=")
        if (kv.size == 2) {
            val k = kv[0].trim()
            val v = kv[1].trim().toDoubleOrNull()
            when (k) {
                "cal" -> cal = v
                "sug" -> sug = v
                "prot" -> prot = v
                "sod" -> sod = v
                "fib" -> fib = v
                "fat" -> fat = v
            }
        }
    }
    return NutritionInfo(
        calories = cal,
        sugar = sug,
        protein = prot,
        sodium = sod,
        fiber = fib,
        totalFat = fat
    )
}

private fun formatNutritionJson(nutrition: NutritionInfo?): String {
    if (nutrition == null) return ""
    val list = mutableListOf<String>()
    nutrition.calories?.let { list.add("cal=$it") }
    nutrition.sugar?.let { list.add("sug=$it") }
    nutrition.protein?.let { list.add("prot=$it") }
    nutrition.sodium?.let { list.add("sod=$it") }
    nutrition.fiber?.let { list.add("fib=$it") }
    nutrition.totalFat?.let { list.add("fat=$it") }
    return list.joinToString(";")
}
