package com.bitebeforeexpiry.app.feature.waste

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bitebeforeexpiry.app.data.repository.WasteRepository
import com.bitebeforeexpiry.app.domain.model.WasteRecord
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WasteTrackerScreen(
    wasteRepository: WasteRepository,
    onNavigateBack: () -> Unit
) {
    val records by wasteRepository.wasteRecords.collectAsState(initial = emptyList())

    val savedCount = records.count { it.wasSaved }
    val discardedCount = records.count { !it.wasSaved }
    val totalSavedValue = records.filter { it.wasSaved }.mapNotNull { it.cost }.sum()
    val totalWastedValue = records.filter { !it.wasSaved }.mapNotNull { it.cost }.sum()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Food Waste & Sustainability", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (records.isNotEmpty()) {
                        IconButton(onClick = {
                            CoroutineScope(Dispatchers.IO).launch { wasteRepository.clearHistory() }
                        }) {
                            Icon(Icons.Default.DeleteSweep, contentDescription = "Clear Log")
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Impact Summary Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Your Sustainability Impact", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(14.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Food Saved", style = MaterialTheme.typography.bodySmall)
                            Text("$savedCount items", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            if (totalSavedValue > 0) {
                                Text("~$${String.format("%.2f", totalSavedValue)} preserved", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                        Column {
                            Text("Discarded", style = MaterialTheme.typography.bodySmall)
                            Text("$discardedCount items", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                            if (totalWastedValue > 0) {
                                Text("~$${String.format("%.2f", totalWastedValue)} wasted", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }

            Text("Waste & Consumption Log", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            if (records.isEmpty()) {
                Text(
                    text = "No recorded consumption history yet. Use or discard items from your pantry to track your food waste metrics.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(records) { record ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(record.productName, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                    Text("Discarded: ${record.discardedDate}", style = MaterialTheme.typography.bodySmall)
                                }

                                Surface(
                                    color = if (record.wasSaved) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.errorContainer,
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(
                                        text = if (record.wasSaved) "SAVED" else "DISCARDED",
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = if (record.wasSaved) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onErrorContainer
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
