package com.bitebeforeexpiry.app.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bitebeforeexpiry.app.data.repository.ProductRepository
import com.bitebeforeexpiry.app.domain.model.ExpiryStatus
import com.bitebeforeexpiry.app.domain.model.Product
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class HomeUiState(
    val products: List<Product> = emptyList(),
    val expiredCount: Int = 0,
    val allergyAlertCount: Int = 0,
    val useSoonCount: Int = 0,
    val safeCount: Int = 0,
    val useFirstItems: List<Product> = emptyList(),
    val allergyAlertItems: List<Product> = emptyList(),
    val isLoading: Boolean = false
)

class HomeViewModel(private val productRepository: ProductRepository) : ViewModel() {

    val uiState: StateFlow<HomeUiState> = productRepository.allProducts.map { products ->
        HomeUiState(
            products = products,
            expiredCount = products.count { it.status == ExpiryStatus.EXPIRED },
            allergyAlertCount = products.count { it.allergenMatchCount > 0 },
            useSoonCount = products.count { it.status == ExpiryStatus.USE_SOON || it.status == ExpiryStatus.EXPIRES_TODAY },
            safeCount = products.count { it.status == ExpiryStatus.SAFE || it.status == ExpiryStatus.UPCOMING },
            useFirstItems = products.filter { it.status == ExpiryStatus.USE_SOON || it.status == ExpiryStatus.EXPIRES_TODAY || it.priority == com.bitebeforeexpiry.app.domain.model.AttentionPriority.HIGH },
            allergyAlertItems = products.filter { it.allergenMatchCount > 0 },
            isLoading = false
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = HomeUiState(isLoading = true)
    )

    fun loadDemoData() {
        viewModelScope.launch {
            productRepository.populateDemoProducts()
        }
    }
}
