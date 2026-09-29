package com.bitebeforeexpiry.app.domain.model

import java.time.LocalDate

enum class ExpiryStatus {
    SAFE,
    UPCOMING,
    USE_SOON,
    EXPIRES_TODAY,
    EXPIRED
}

enum class AttentionPriority {
    HIGH,
    MEDIUM,
    LOW
}

enum class ProductCategory(val displayName: String) {
    FOOD("Food"),
    BEVERAGE("Beverage"),
    MEDICINE("Medicine"),
    COSMETIC("Cosmetic"),
    OTHER("Other")
}

data class NutritionInfo(
    val servingSize: String? = null,
    val calories: Double? = null,
    val protein: Double? = null,
    val carbohydrates: Double? = null,
    val sugar: Double? = null,
    val totalFat: Double? = null,
    val saturatedFat: Double? = null,
    val fiber: Double? = null,
    val sodium: Double? = null
)

data class Ingredient(
    val id: String = "",
    val productId: String = "",
    val name: String,
    val explanation: String = "",
    val translatedName: String = "",
    val purpose: String = "",
    val allergenStatus: String = "None",
    val confidence: Float = 1.0f
)

data class Product(
    val id: String,
    val name: String,
    val brand: String = "",
    val category: ProductCategory = ProductCategory.FOOD,
    val barcode: String = "",
    val imageUri: String? = null,
    val manufacturingDate: LocalDate? = null,
    val bestBeforeDate: LocalDate? = null,
    val expiryDate: LocalDate? = null,
    val labelType: String = "EXPIRY", // "USE BY", "BEST BEFORE", "EXPIRY"
    val ingredients: List<Ingredient> = emptyList(),
    val nutrition: NutritionInfo? = null,
    val rawOcrText: String = "",
    val language: String = "en",
    val status: ExpiryStatus = ExpiryStatus.SAFE,
    val priority: AttentionPriority = AttentionPriority.LOW,
    val quantity: Int = 1,
    val purchasePrice: Double? = null,
    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val notificationEnabled: Boolean = true,
    val allergenMatchCount: Int = 0,
    val allergenMatches: List<String> = emptyList()
)

data class AllergyProfile(
    val id: String = "user_allergy_profile",
    val enabledAllergens: Set<String> = setOf("Milk", "Peanuts", "Tree Nuts", "Soy", "Wheat", "Gluten", "Egg", "Fish", "Shellfish", "Sesame"),
    val selectedAllergens: Set<String> = emptySet(),
    val customAllergens: List<String> = emptyList()
)

data class WasteRecord(
    val id: String,
    val productId: String,
    val productName: String,
    val category: ProductCategory,
    val expiryDate: LocalDate?,
    val discardedDate: LocalDate = LocalDate.now(),
    val cost: Double? = null,
    val wasSaved: Boolean = false
)

data class HouseholdMember(
    val id: String,
    val name: String,
    val role: String, // Owner, Editor, Viewer
    val allergies: List<String> = emptyList()
)

data class ScanHistory(
    val id: String,
    val barcode: String?,
    val capturedText: String,
    val scannedAt: Long = System.currentTimeMillis(),
    val recognizedProductName: String?
)
