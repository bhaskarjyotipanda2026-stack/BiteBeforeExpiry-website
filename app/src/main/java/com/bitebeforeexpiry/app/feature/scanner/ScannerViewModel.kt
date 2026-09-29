package com.bitebeforeexpiry.app.feature.scanner

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bitebeforeexpiry.app.barcode.MlKitBarcodeScanner
import com.bitebeforeexpiry.app.barcode.ProductLookupService
import com.bitebeforeexpiry.app.data.repository.ProductRepository
import com.bitebeforeexpiry.app.domain.model.Product
import com.bitebeforeexpiry.app.domain.model.ProductCategory
import com.bitebeforeexpiry.app.ocr.MlKitOcrEngine
import com.bitebeforeexpiry.app.ocr.MockOcrEngine
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate

data class ScannerUiState(
    val isProcessing: Boolean = false,
    val selectedCaptureMode: String = "BARCODE", // BARCODE, EXPIRY, INGREDIENTS, NUTRITION
    val capturedProduct: Product? = null,
    val scanErrorMessage: String? = null,
    val isTorchOn: Boolean = false
)

class ScannerViewModel(
    private val productRepository: ProductRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ScannerUiState())
    val uiState: StateFlow<ScannerUiState> = _uiState.asStateFlow()

    private val ocrEngine = MockOcrEngine() // Uses MockOcrEngine for robust demo mode scan
    private val productLookupService = ProductLookupService()

    fun setCaptureMode(mode: String) {
        _uiState.value = _uiState.value.copy(selectedCaptureMode = mode)
    }

    fun toggleTorch() {
        _uiState.value = _uiState.value.copy(isTorchOn = !_uiState.value.isTorchOn)
    }

    fun processCapturedImage(context: Context, imageUri: Uri? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isProcessing = true, scanErrorMessage = null)

            val dummyUri = imageUri ?: Uri.EMPTY
            val ocrResult = ocrEngine.processImage(context, dummyUri)

            val barcodeResult = productLookupService.lookupByBarcode("8901234567890")

            val finalProduct = Product(
                id = "scan_" + System.currentTimeMillis(),
                name = barcodeResult?.productName ?: "Scanned Product",
                brand = barcodeResult?.brand ?: "Package Label",
                category = barcodeResult?.category ?: ProductCategory.FOOD,
                barcode = barcodeResult?.barcode ?: "8901234567890",
                expiryDate = ocrResult.detectedExpiryDate ?: LocalDate.now().plusDays(4),
                bestBeforeDate = ocrResult.detectedExpiryDate ?: LocalDate.now().plusDays(4),
                labelType = ocrResult.detectedLabelType,
                ingredients = ocrResult.detectedIngredients.map { com.bitebeforeexpiry.app.domain.model.Ingredient(name = it) },
                nutrition = barcodeResult?.nutrition,
                rawOcrText = ocrResult.rawText,
                quantity = 1
            )

            _uiState.value = _uiState.value.copy(
                isProcessing = false,
                capturedProduct = finalProduct
            )
        }
    }

    fun clearCapturedProduct() {
        _uiState.value = _uiState.value.copy(capturedProduct = null)
    }
}
