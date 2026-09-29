package com.bitebeforeexpiry.app.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bitebeforeexpiry.app.core.designsystem.ExpiryStatusBadge
import com.bitebeforeexpiry.app.core.designsystem.PriorityBadge
import com.bitebeforeexpiry.app.domain.engine.ExpiryEngine
import com.bitebeforeexpiry.app.domain.model.Product
import com.bitebeforeexpiry.app.ui.theme.*

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onNavigateToScan: () -> Unit,
    onNavigateToProductDetails: (String) -> Unit,
    onNavigateToUseFirst: () -> Unit,
    onNavigateToWasteTracker: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        // Greeting Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Good day 👋",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Stay ahead of food expiry",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (state.products.isEmpty()) {
                Button(
                    onClick = { viewModel.loadDemoData() },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Load Demo")
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Primary CTA Button: Scan Product
        Button(
            onClick = onNavigateToScan,
            modifier = Modifier
                .fillMaxWidth()
                .height(60.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = Icons.Default.CameraAlt,
                    contentDescription = null,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = "Scan Product",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Today's Attention Cards
        Text(
            text = "Today's Attention",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            AttentionCountCard(
                count = state.expiredCount,
                label = "Expired",
                containerColor = StatusExpiredContainer,
                textColor = StatusExpired,
                modifier = Modifier.weight(1f)
            )
            AttentionCountCard(
                count = state.allergyAlertCount,
                label = "Allergy Alert",
                containerColor = StatusUseSoonContainer,
                textColor = StatusUseSoon,
                modifier = Modifier.weight(1f)
            )
            AttentionCountCard(
                count = state.useSoonCount,
                label = "Use Soon",
                containerColor = StatusUpcomingContainer,
                textColor = StatusUpcoming,
                modifier = Modifier.weight(1f)
            )
            AttentionCountCard(
                count = state.safeCount,
                label = "Safe",
                containerColor = StatusSafeContainer,
                textColor = StatusSafe,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(28.dp))

        // USE FIRST Section
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "USE FIRST",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            TextButton(onClick = onNavigateToUseFirst) {
                Text("See All")
                Icon(Icons.Default.ChevronRight, contentDescription = null)
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        if (state.useFirstItems.isEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Text(
                    text = "No urgent items expiring soon. Good job!",
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        } else {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(state.useFirstItems) { product ->
                    UseFirstItemCard(product = product, onClick = { onNavigateToProductDetails(product.id) })
                }
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // ALLERGY ALERT Banner
        if (state.allergyAlertItems.isNotEmpty()) {
            Text(
                text = "ALLERGY ALERTS",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = PriorityHigh
            )
            Spacer(modifier = Modifier.height(10.dp))

            state.allergyAlertItems.take(2).forEach { product ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 10.dp)
                        .clickable { onNavigateToProductDetails(product.id) },
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = StatusExpiredContainer)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = StatusExpired,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = product.name,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = StatusExpired
                            )
                            Text(
                                text = "Potential allergen match: ${product.allergenMatches.joinToString(", ")}",
                                style = MaterialTheme.typography.bodySmall,
                                color = StatusExpired.copy(alpha = 0.8f)
                            )
                        }
                        TextButton(onClick = { onNavigateToProductDetails(product.id) }) {
                            Text("View", color = StatusExpired, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(18.dp))
        }

        // YOUR MONTH Summary Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onNavigateToWasteTracker() },
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "YOUR MONTH AT A GLANCE",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Icon(Icons.Default.ChevronRight, contentDescription = null)
                }
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    SummaryMetricItem("${state.products.size}", "Tracked")
                    SummaryMetricItem("${state.safeCount}", "Used Before Expiry")
                    SummaryMetricItem("${state.expiredCount}", "Expired")
                    SummaryMetricItem("${state.useSoonCount + state.allergyAlertCount}", "Needs Attention")
                }
            }
        }
    }
}

@Composable
fun AttentionCountCard(
    count: Int,
    label: String,
    containerColor: Color,
    textColor: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = containerColor
    ) {
        Column(
            modifier = Modifier.padding(vertical = 12.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "$count",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.ExtraBold,
                color = textColor
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = textColor,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
fun UseFirstItemCard(
    product: Product,
    onClick: () -> Unit
) {
    val days = ExpiryEngine.daysRemaining(product.expiryDate)
    Card(
        modifier = Modifier
            .width(170.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = when (product.category) {
                        com.bitebeforeexpiry.app.domain.model.ProductCategory.FOOD -> "🍞"
                        com.bitebeforeexpiry.app.domain.model.ProductCategory.BEVERAGE -> "🥛"
                        com.bitebeforeexpiry.app.domain.model.ProductCategory.MEDICINE -> "💊"
                        else -> "📦"
                    },
                    style = MaterialTheme.typography.titleMedium
                )
                PriorityBadge(priority = product.priority)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = product.name,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                maxLines = 1
            )
            Text(
                text = product.brand.ifEmpty { product.category.displayName },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1
            )
            Spacer(modifier = Modifier.height(8.dp))
            ExpiryStatusBadge(status = product.status, daysRemaining = days)
        }
    }
}

@Composable
fun SummaryMetricItem(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
