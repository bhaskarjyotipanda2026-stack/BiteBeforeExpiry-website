package com.bitebeforeexpiry.app.feature.actionassistant

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bitebeforeexpiry.app.domain.model.ExpiryStatus
import com.bitebeforeexpiry.app.domain.model.Product
import com.bitebeforeexpiry.app.domain.model.ProductCategory

@Composable
fun ActionAssistantDialog(
    product: Product,
    onDismiss: () -> Unit
) {
    val isExpired = product.status == ExpiryStatus.EXPIRED

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = if (isExpired) Icons.Default.Warning else Icons.Default.Info,
                    contentDescription = null,
                    tint = if (isExpired) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Action Assistant",
                    fontWeight = FontWeight.Bold
                )
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                if (isExpired) {
                    when (product.category) {
                        ProductCategory.MEDICINE -> {
                            Text("🚨 Do NOT consume expired medicine under any circumstances.")
                            Text("• Return unused pills to a local pharmacy take-back scheme.")
                            Text("• Do not flush tablets down drain pipes or toilets.")
                        }
                        ProductCategory.COSMETIC -> {
                            Text("⚠️ Expired cosmetics may harbor bacteria and cause skin irritation.")
                            Text("• Rinse container and check plastic recycling symbol.")
                            Text("• Dispose of residual liquid in general household waste.")
                        }
                        else -> {
                            Text("⚠️ This food item has passed its expiry date. Do not consume.")
                            Text("♻️ Check packaging for recyclable materials.")
                            Text("🌱 Compost organic food waste where facility exists.")
                        }
                    }
                } else {
                    Text("🟢 This product is safe for use.")
                    Text("• Priority: ${product.priority}")
                    Text("• Label Type: ${product.labelType}")
                    if (product.status == ExpiryStatus.USE_SOON) {
                        Text("💡 Tip: Consider using this item in your next meal to avoid food waste.")
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onDismiss, shape = RoundedCornerShape(8.dp)) {
                Text("Got It")
            }
        }
    )
}
