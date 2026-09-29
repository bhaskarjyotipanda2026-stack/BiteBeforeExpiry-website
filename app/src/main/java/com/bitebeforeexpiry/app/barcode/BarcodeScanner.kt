package com.bitebeforeexpiry.app.barcode

import android.content.Context
import android.net.Uri
import com.bitebeforeexpiry.app.domain.model.NutritionInfo
import com.bitebeforeexpiry.app.domain.model.ProductCategory
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.suspendCancellableCoroutine
import java.time.LocalDate
import kotlin.coroutines.resume

data class BarcodeLookupResult(
    val barcode: String,
    val productName: String?,
    val brand: String?,
    val category: ProductCategory?,
    val ingredients: List<String>,
    val nutrition: NutritionInfo?
)

interface BarcodeScanner {
    suspend fun scanBarcode(context: Context, imageUri: Uri): String?
}

class MlKitBarcodeScanner : BarcodeScanner {

    private val scanner = BarcodeScanning.getClient()

    override suspend fun scanBarcode(context: Context, imageUri: Uri): String? =
        suspendCancellableCoroutine { continuation ->
            try {
                val image = InputImage.fromFilePath(context, imageUri)
                scanner.process(image)
                    .addOnSuccessListener { barcodes ->
                        val firstValue = barcodes.firstOrNull()?.rawValue
                        continuation.resume(firstValue)
                    }
                    .addOnFailureListener {
                        continuation.resume(null)
                    }
            } catch (e: Exception) {
                continuation.resume(null)
            }
        }
}

class ProductLookupService {

    private val MOCK_BARCODE_DB = mapOf(
        "8901234567890" to BarcodeLookupResult(
            barcode = "8901234567890",
            productName = "Chocolate Cream Biscuits",
            brand = "Delightful Bakes",
            category = ProductCategory.FOOD,
            ingredients = listOf("Wheat Flour", "Sugar", "Cocoa Powder", "Milk Solids", "Soy Lecithin", "Palm Oil", "Salt"),
            nutrition = NutritionInfo(servingSize = "30g", calories = 210.0, protein = 5.0, carbohydrates = 26.0, sugar = 14.0, totalFat = 8.0, sodium = 180.0, fiber = 3.0)
        ),
        "8909876543210" to BarcodeLookupResult(
            barcode = "8909876543210",
            productName = "Organic Whole Milk",
            brand = "Farm Fresh",
            category = ProductCategory.BEVERAGE,
            ingredients = listOf("Pasteurized Whole Milk", "Vitamin D3"),
            nutrition = NutritionInfo(servingSize = "200ml", calories = 150.0, protein = 8.0, carbohydrates = 12.0, sugar = 12.0, totalFat = 8.0, sodium = 105.0)
        ),
        "8905555444333" to BarcodeLookupResult(
            barcode = "8905555444333",
            productName = "Paracetamol 500mg Tablets",
            brand = "HealthCare Pharma",
            category = ProductCategory.MEDICINE,
            ingredients = listOf("Paracetamol", "Starch", "Povidone", "Magnesium Stearate"),
            nutrition = null
        )
    )

    fun lookupByBarcode(barcode: String): BarcodeLookupResult? {
        return MOCK_BARCODE_DB[barcode]
    }
}
