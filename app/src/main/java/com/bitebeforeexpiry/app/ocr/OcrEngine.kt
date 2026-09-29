package com.bitebeforeexpiry.app.ocr

import android.content.Context
import android.net.Uri
import com.bitebeforeexpiry.app.domain.engine.ExpiryEngine
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import java.time.LocalDate
import kotlin.coroutines.resume

data class OcrScanResult(
    val rawText: String,
    val detectedExpiryDate: LocalDate?,
    val detectedLabelType: String,
    val detectedIngredients: List<String>,
    val detectedBrand: String?,
    val confidence: Float
)

interface OcrEngine {
    suspend fun processImage(context: Context, imageUri: Uri): OcrScanResult
}

class MlKitOcrEngine : OcrEngine {

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    override suspend fun processImage(context: Context, imageUri: Uri): OcrScanResult =
        suspendCancellableCoroutine { continuation ->
            try {
                val image = InputImage.fromFilePath(context, imageUri)
                recognizer.process(image)
                    .addOnSuccessListener { visionText ->
                        val rawText = visionText.text
                        val dateResult = ExpiryEngine.parseAndDetectDate(rawText)
                        val ingredients = extractIngredientsFromText(rawText)

                        continuation.resume(
                            OcrScanResult(
                                rawText = rawText,
                                detectedExpiryDate = dateResult.date,
                                detectedLabelType = dateResult.labelType,
                                detectedIngredients = ingredients,
                                detectedBrand = null,
                                confidence = if (dateResult.date != null) 0.85f else 0.50f
                            )
                        )
                    }
                    .addOnFailureListener {
                        continuation.resume(
                            OcrScanResult(
                                rawText = "",
                                detectedExpiryDate = null,
                                detectedLabelType = "EXPIRY",
                                detectedIngredients = emptyList(),
                                detectedBrand = null,
                                confidence = 0.0f
                            )
                        )
                    }
            } catch (e: Exception) {
                continuation.resume(
                    OcrScanResult(
                        rawText = "",
                        detectedExpiryDate = null,
                        detectedLabelType = "EXPIRY",
                        detectedIngredients = emptyList(),
                        detectedBrand = null,
                        confidence = 0.0f
                    )
                )
            }
        }

    private fun extractIngredientsFromText(text: String): List<String> {
        val uppercase = text.uppercase()
        val startIndex = uppercase.indexOf("INGREDIENTS")
        if (startIndex == -1) return emptyList()

        val substring = text.substring(startIndex + "INGREDIENTS".length)
            .replace(":", "")
            .replace(".", "")

        val lines = substring.split("\n", ",", ";")
        return lines.map { it.trim() }.filter { it.length > 2 }.take(15)
    }
}

class MockOcrEngine : OcrEngine {

    override suspend fun processImage(context: Context, imageUri: Uri): OcrScanResult {
        // Mock scan returning rich realistic details for demo mode
        val mockText = """
            CHOCOLATE BISCUITS
            Net Wt: 200g
            MFG: 10/01/2026
            EXP: ${LocalDate.now().plusDays(4).format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))}
            BEST BEFORE 4 DAYS FROM MANUFACTURE
            INGREDIENTS: Wheat Flour, Sugar, Palm Oil, Cocoa Powder, Milk Solids, Soy Lecithin, Salt, Raising Agent, Artificial Flavoring, Citric Acid, Sodium Benzoate.
            NUTRITION FACTS: Calories 210 kcal, Sugar 14g, Protein 5g, Sodium 180mg, Fiber 3g, Total Fat 8g.
        """.trimIndent()

        val ingredients = listOf(
            "Wheat Flour", "Sugar", "Palm Oil", "Cocoa Powder", "Milk Solids",
            "Soy Lecithin", "Salt", "Raising Agent", "Artificial Flavoring", "Citric Acid", "Sodium Benzoate"
        )

        return OcrScanResult(
            rawText = mockText,
            detectedExpiryDate = LocalDate.now().plusDays(4),
            detectedLabelType = "BEST BEFORE",
            detectedIngredients = ingredients,
            detectedBrand = "BiteSafe Foods",
            confidence = 0.95f
        )
    }
}
