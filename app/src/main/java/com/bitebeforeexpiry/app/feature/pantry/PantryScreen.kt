package com.bitebeforeexpiry.app.feature.pantry

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bitebeforeexpiry.app.core.designsystem.EmptyStateView
import com.bitebeforeexpiry.app.core.designsystem.ExpiryStatusBadge
import com.bitebeforeexpiry.app.core.designsystem.PriorityBadge
import com.bitebeforeexpiry.app.domain.engine.ExpiryEngine
import com.bitebeforeexpiry.app.domain.model.Product

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PantryScreen(
    viewModel: PantryViewModel,
    onNavigateToProductDetails: (String) -> Unit,
    onNavigateToScan: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()

    val filters = listOf("All", "Food", "Beverage", "Medicine", "Cosmetic", "Expiring Soon", "Expired", "Allergy Alert", "Use First")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
    ) {
        Text(
            text = "My Smart Pantry",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(12.dp))

        // Search Bar
        OutlinedTextField(
            value = state.searchQuery,
            onValueChange = { viewModel.setSearchQuery(it) },
            placeholder = { Text("Search product name, brand, or ingredient...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Horizontal Category Filter Chips
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(filters) { filter ->
                FilterChip(
                    selected = state.selectedFilter == filter,
                    onClick = { viewModel.setFilter(filter) },
                    label = { Text(filter) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (state.filteredProducts.isEmpty()) {
            EmptyStateView(
                title = "No Products Found",
                description = if (state.searchQuery.isNotEmpty()) "No products matched '${state.searchQuery}'."
                else "Your pantry is empty under '${state.selectedFilter}' filter.",
                buttonText = "Scan New Product",
                onButtonClick = onNavigateToScan
            )
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(state.filteredProducts) { product ->
                    PantryItemCard(
                        product = product,
                        onClick = { onNavigateToProductDetails(product.id) },
                        onMarkUsed = { viewModel.markProductUsed(product) },
                        onDiscard = { viewModel.markProductDiscarded(product) }
                    )
                }
            }
        }
    }
}

@Composable
fun PantryItemCard(
    product: Product,
    onClick: () -> Unit,
    onMarkUsed: () -> Unit,
    onDiscard: () -> Unit
) {
    val daysRemaining = ExpiryEngine.daysRemaining(product.expiryDate)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = when (product.category) {
                            com.bitebeforeexpiry.app.domain.model.ProductCategory.FOOD -> "🍞"
                            com.bitebeforeexpiry.app.domain.model.ProductCategory.BEVERAGE -> "🥛"
                            com.bitebeforeexpiry.app.domain.model.ProductCategory.MEDICINE -> "💊"
                            com.bitebeforeexpiry.app.domain.model.ProductCategory.COSMETIC -> "🧴"
                            else -> "📦"
                        },
                        style = MaterialTheme.typography.titleLarge
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = product.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${product.brand.ifEmpty { product.category.displayName }} • Qty: ${product.quantity}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                PriorityBadge(priority = product.priority)
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                ExpiryStatusBadge(status = product.status, daysRemaining = daysRemaining)

                Row {
                    IconButton(onClick = onMarkUsed) {
                        Icon(Icons.Default.CheckCircle, contentDescription = "Mark Used", tint = MaterialTheme.colorScheme.primary)
                    }
                    IconButton(onClick = onDiscard) {
                        Icon(Icons.Default.Delete, contentDescription = "Discard", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }
    }
}
