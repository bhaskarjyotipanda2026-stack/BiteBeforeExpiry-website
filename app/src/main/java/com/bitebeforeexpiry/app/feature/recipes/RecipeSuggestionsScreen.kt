package com.bitebeforeexpiry.app.feature.recipes

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bitebeforeexpiry.app.core.designsystem.EmptyStateView
import com.bitebeforeexpiry.app.data.repository.ProductRepository
import com.bitebeforeexpiry.app.domain.engine.ExpiryEngine
import com.bitebeforeexpiry.app.domain.model.ExpiryStatus
import com.bitebeforeexpiry.app.domain.model.Product

data class RecipeSuggestion(
    val title: String,
    val ingredientUsed: String,
    val daysRemaining: Long,
    val description: String,
    val prepTime: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecipeSuggestionsScreen(
    productRepository: ProductRepository,
    onNavigateBack: () -> Unit
) {
    val products by productRepository.allProducts.collectAsState(initial = emptyList())

    // Strict Rule: EXPIRED products are filtered out completely!
    val validExpiringProducts = products.filter {
        it.status != ExpiryStatus.EXPIRED &&
        (it.status == ExpiryStatus.USE_SOON || it.status == ExpiryStatus.EXPIRES_TODAY || it.status == ExpiryStatus.UPCOMING)
    }

    val recipeSuggestions = validExpiringProducts.map { product ->
        val days = ExpiryEngine.daysRemaining(product.expiryDate)
        when (product.name.lowercase()) {
            "fresh whole milk", "milk" -> RecipeSuggestion(
                title = "Fluffy Homemade Pancakes / Smoothie",
                ingredientUsed = product.name,
                daysRemaining = days,
                description = "Whisk milk with flour and eggs for quick morning pancakes, or blend with fruit for a nutritious smoothie.",
                prepTime = "15 mins"
            )
            "whole wheat bread", "bread" -> RecipeSuggestion(
                title = "Garlic Toast or Bread Pudding",
                ingredientUsed = product.name,
                daysRemaining = days,
                description = "Bake bread slices with butter and garlic herbs, or soak in egg custard for a delicious warm dessert.",
                prepTime = "20 mins"
            )
            "chocolate biscuits", "biscuits" -> RecipeSuggestion(
                title = "No-Bake Chocolate Cake Crust",
                ingredientUsed = product.name,
                daysRemaining = days,
                description = "Crush biscuits into a fine crumble with melted butter for a quick pie base or ice-cream topping.",
                prepTime = "10 mins"
            )
            else -> RecipeSuggestion(
                title = "Quick Culinary Delight with ${product.name}",
                ingredientUsed = product.name,
                daysRemaining = days,
                description = "Combine ${product.name} with your daily cooked meals before its best before date.",
                prepTime = "15 mins"
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Smart Use Suggestions", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Restaurant, contentDescription = null, tint = MaterialTheme.colorScheme.secondary)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Recipes are dynamically generated for non-expired products approaching their best before date. Expired food is strictly excluded for safety.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (recipeSuggestions.isEmpty()) {
                EmptyStateView(
                    title = "No Pending Use Suggestions",
                    description = "You have no valid food items near expiry requiring immediate recipe ideas."
                )
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(recipeSuggestions) { recipe ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(recipe.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    Surface(
                                        color = MaterialTheme.colorScheme.primaryContainer,
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            text = recipe.prepTime,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text("Utilizes: ${recipe.ingredientUsed} (Expires in ${recipe.daysRemaining} days)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(recipe.description, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
            }
        }
    }
}
