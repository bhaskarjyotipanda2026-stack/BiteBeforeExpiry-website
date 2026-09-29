package com.bitebeforeexpiry.app.feature.pantry

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bitebeforeexpiry.app.data.repository.ProductRepository
import com.bitebeforeexpiry.app.domain.model.ExpiryStatus
import com.bitebeforeexpiry.app.domain.model.Product
import com.bitebeforeexpiry.app.domain.model.ProductCategory
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class PantryUiState(
    val selectedFilter: String = "All",
    val searchQuery: String = "",
    val sortOption: String = "Expiry", // Expiry, Name, Priority
    val products: List<Product> = emptyList(),
    val filteredProducts: List<Product> = emptyList()
)

class PantryViewModel(private val productRepository: ProductRepository) : ViewModel() {

    private val _selectedFilter = MutableStateFlow("All")
    private val _searchQuery = MutableStateFlow("")
    private val _sortOption = MutableStateFlow("Expiry")

    val uiState: StateFlow<PantryUiState> = combine(
        productRepository.allProducts,
        _selectedFilter,
        _searchQuery,
        _sortOption
    ) { products, filter, query, sort ->
        val filtered = products.filter { product ->
            val matchesFilter = when (filter) {
                "Food" -> product.category == ProductCategory.FOOD
                "Beverage" -> product.category == ProductCategory.BEVERAGE
                "Medicine" -> product.category == ProductCategory.MEDICINE
                "Cosmetic" -> product.category == ProductCategory.COSMETIC
                "Expiring Soon" -> product.status == ExpiryStatus.USE_SOON || product.status == ExpiryStatus.EXPIRES_TODAY || product.status == ExpiryStatus.UPCOMING
                "Expired" -> product.status == ExpiryStatus.EXPIRED
                "Allergy Alert" -> product.allergenMatchCount > 0
                "Use First" -> product.status == ExpiryStatus.USE_SOON || product.status == ExpiryStatus.EXPIRES_TODAY
                else -> true
            }

            val matchesSearch = query.isEmpty() ||
                    product.name.contains(query, ignoreCase = true) ||
                    product.brand.contains(query, ignoreCase = true) ||
                    product.barcode.contains(query, ignoreCase = true) ||
                    product.ingredients.any { it.name.contains(query, ignoreCase = true) }

            matchesFilter && matchesSearch
        }.let { list ->
            when (sort) {
                "Name" -> list.sortedBy { it.name }
                "Priority" -> list.sortedBy { it.priority }
                else -> list.sortedBy { it.expiryDate }
            }
        }

        PantryUiState(
            selectedFilter = filter,
            searchQuery = query,
            sortOption = sort,
            products = products,
            filteredProducts = filtered
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = PantryUiState()
    )

    fun setFilter(filter: String) {
        _selectedFilter.value = filter
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setSortOption(sort: String) {
        _sortOption.value = sort
    }

    fun markProductUsed(product: Product) {
        viewModelScope.launch {
            productRepository.markProductAsUsedOrDiscarded(product, wasSaved = true)
        }
    }

    fun markProductDiscarded(product: Product) {
        viewModelScope.launch {
            productRepository.markProductAsUsedOrDiscarded(product, wasSaved = false)
        }
    }
}
