package com.bitebeforeexpiry.app.feature.productdetails

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bitebeforeexpiry.app.ai.MockIngredientAnalyzer
import com.bitebeforeexpiry.app.data.repository.ProductRepository
import com.bitebeforeexpiry.app.domain.model.Ingredient
import com.bitebeforeexpiry.app.domain.model.Product
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class IngredientDetailState(
    val ingredient: Ingredient,
    val explanation: String,
    val purpose: String,
    val allergenStatus: String
)

data class ProductDetailUiState(
    val product: Product? = null,
    val ingredientDetails: List<IngredientDetailState> = emptyList(),
    val isLoading: Boolean = true,
    val showActionAssistant: Boolean = false
)

class ProductDetailViewModel(
    private val productId: String,
    private val productRepository: ProductRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProductDetailUiState())
    val uiState: StateFlow<ProductDetailUiState> = _uiState.asStateFlow()

    private val ingredientAnalyzer = MockIngredientAnalyzer()

    init {
        loadProduct()
    }

    fun loadProduct() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val product = productRepository.getProductById(productId)
            if (product != null) {
                val details = product.ingredients.map { ing ->
                    val analysis = ingredientAnalyzer.analyze(ing.name, product.category.name)
                    IngredientDetailState(
                        ingredient = ing,
                        explanation = analysis.explanation,
                        purpose = analysis.purpose,
                        allergenStatus = analysis.allergenStatus
                    )
                }
                _uiState.value = ProductDetailUiState(
                    product = product,
                    ingredientDetails = details,
                    isLoading = false
                )
            } else {
                _uiState.value = ProductDetailUiState(isLoading = false)
            }
        }
    }

    fun toggleActionAssistant(show: Boolean) {
        _uiState.value = _uiState.value.copy(showActionAssistant = show)
    }

    fun deleteProduct(onDeleted: () -> Unit) {
        viewModelScope.launch {
            productRepository.deleteProduct(productId)
            onDeleted()
        }
    }
}
