package com.bitebeforeexpiry.app.core.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bitebeforeexpiry.app.domain.model.AttentionPriority
import com.bitebeforeexpiry.app.domain.model.ExpiryStatus
import com.bitebeforeexpiry.app.ui.theme.*

@Composable
fun ExpiryStatusBadge(status: ExpiryStatus, daysRemaining: Long) {
    val (backgroundColor, textColor, label) = when (status) {
        ExpiryStatus.SAFE -> Triple(StatusSafeContainer, StatusSafe, "Safe ($daysRemaining d)")
        ExpiryStatus.UPCOMING -> Triple(StatusUpcomingContainer, StatusUpcoming, "Upcoming ($daysRemaining d)")
        ExpiryStatus.USE_SOON -> Triple(StatusUseSoonContainer, StatusUseSoon, "Use Soon ($daysRemaining d)")
        ExpiryStatus.EXPIRES_TODAY -> Triple(StatusExpiredContainer, StatusExpired, "EXPIRES TODAY")
        ExpiryStatus.EXPIRED -> Triple(StatusExpiredContainer, StatusExpired, "EXPIRED (${-daysRemaining} d ago)")
    }

    Surface(
        color = backgroundColor,
        shape = RoundedCornerShape(12.dp)
    ) {
        Text(
            text = label,
            color = textColor,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

@Composable
fun PriorityBadge(priority: AttentionPriority) {
    val (color, text) = when (priority) {
        AttentionPriority.HIGH -> PriorityHigh to "HIGH ATTENTION"
        AttentionPriority.MEDIUM -> PriorityMedium to "MEDIUM ATTENTION"
        AttentionPriority.LOW -> PriorityLow to "LOW"
    }

    Surface(
        color = color.copy(alpha = 0.15f),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            if (priority == AttentionPriority.HIGH) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(12.dp)
                )
            }
            Text(
                text = text,
                color = color,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.ExtraBold
            )
        }
    }
}

@Composable
fun EmptyStateView(
    title: String,
    description: String,
    buttonText: String? = null,
    onButtonClick: (() -> Unit)? = null
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Warning,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        if (buttonText != null && onButtonClick != null) {
            Spacer(modifier = Modifier.height(20.dp))
            Button(onClick = onButtonClick) {
                Text(buttonText)
            }
        }
    }
}

@Composable
fun LoadingStateView(message: String = "Analyzing product...") {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
