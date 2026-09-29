package com.bitebeforeexpiry.app.feature.productdetails

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bitebeforeexpiry.app.core.designsystem.ExpiryStatusBadge
import com.bitebeforeexpiry.app.core.designsystem.LoadingStateView
import com.bitebeforeexpiry.app.core.designsystem.PriorityBadge
import com.bitebeforeexpiry.app.domain.engine.AttentionEngine
import com.bitebeforeexpiry.app.domain.engine.ExpiryEngine
import com.bitebeforeexpiry.app.domain.model.NutritionInfo
import com.bitebeforeexpiry.app.feature.actionassistant.ActionAssistantDialog

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    viewModel: ProductDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val product = state.product

    if (state.isLoading) {
        Scaffold { padding ->
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                LoadingStateView("Loading product intelligence...")
            }
        }
        return
    }

    if (product == null) {
        Scaffold { padding ->
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("Product not found.")
            }
        }
        return
    }

    val daysRemaining = ExpiryEngine.daysRemaining(product.expiryDate)
    val attentionExplanation = AttentionEngine.getAttentionExplanation(
        status = product.status,
        hasAllergenMatch = product.allergenMatchCount > 0,
        allergenList = product.allergenMatches,
        daysRemaining = daysRemaining
    )

    if (state.showActionAssistant) {
        ActionAssistantDialog(
            product = product,
            onDismiss = { viewModel.toggleActionAssistant(false) }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(product.name, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.deleteProduct(onNavigateBack) }) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Header Overview Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(product.name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Text(product.brand.ifEmpty { product.category.displayName }, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        PriorityBadge(priority = product.priority)
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        ExpiryStatusBadge(status = product.status, daysRemaining = daysRemaining)
                        Text(
                            text = "Barcode: ${product.barcode.ifEmpty { "N/A" }}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Attention Reason Banner
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Info, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = attentionExplanation,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }

            // Action Assistant Button
            Button(
                onClick = { viewModel.toggleActionAssistant(true) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Psychology, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("What Should I Do With This Product?")
            }

            // Dates Breakdown
            Card {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Product Dates", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("• Label Type: ${product.labelType}")
                    Text("• Expiry Date: ${product.expiryDate ?: "Not Specified"}")
                    product.manufacturingDate?.let { Text("• Manufacturing Date: $it") }
                    product.bestBeforeDate?.let { Text("• Best Before Date: $it") }
                }
            }

            // Ingredient Intelligence Section
            Text("Ingredient Intelligence", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            if (state.ingredientDetails.isEmpty()) {
                Text("No ingredient list parsed for this product.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                state.ingredientDetails.forEach { item ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(item.ingredient.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Surface(
                                    color = if (item.allergenStatus.contains("Allergen")) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.secondaryContainer,
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = item.allergenStatus,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelSmall
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(item.explanation, style = MaterialTheme.typography.bodySmall)
                            Text("Purpose: ${item.purpose}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }

            // Nutrition Scorecard Snapshot
            product.nutrition?.let { nutrition ->
                NutritionScorecardCard(nutrition = nutrition)
            }
        }
    }
}

@Composable
fun NutritionScorecardCard(nutrition: NutritionInfo) {
    Card(shape = RoundedCornerShape(16.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Nutrition Snapshot", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(12.dp))

            nutrition.calories?.let { NutritionProgressBar("Calories", "${it.toInt()} kcal", (it / 500.0).toFloat().coerceIn(0f, 1f)) }
            nutrition.sugar?.let { NutritionProgressBar("Sugar", "${it}g", (it / 30.0).toFloat().coerceIn(0f, 1f)) }
            nutrition.protein?.let { NutritionProgressBar("Protein", "${it}g", (it / 25.0).toFloat().coerceIn(0f, 1f)) }
            nutrition.sodium?.let { NutritionProgressBar("Sodium", "${it.toInt()}mg", (it / 1000.0).toFloat().coerceIn(0f, 1f)) }
        }
    }
}

@Composable
fun NutritionProgressBar(label: String, valueText: String, progress: Float) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
            Text(valueText, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth().height(8.dp),
            color = MaterialTheme.colorScheme.primary,
            trackColor = MaterialTheme.colorScheme.surfaceVariant,
        )
    }
}
