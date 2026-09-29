package com.bitebeforeexpiry.app.feature.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bitebeforeexpiry.app.data.local.preferences.UserPreferencesRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    userPreferencesRepository: UserPreferencesRepository,
    onResetData: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()

    val currentLanguage by userPreferencesRepository.appLanguage.collectAsState(initial = "en")
    val isDarkMode by userPreferencesRepository.isDarkMode.collectAsState(initial = false)
    val notificationsEnabled by userPreferencesRepository.notificationsEnabled.collectAsState(initial = true)
    val isDemoMode by userPreferencesRepository.isDemoMode.collectAsState(initial = true)
    val selectedAllergens by userPreferencesRepository.selectedAllergens.collectAsState(initial = setOf("Milk", "Peanuts", "Soy"))

    val allSupportedAllergens = listOf("Milk", "Peanuts", "Tree Nuts", "Soy", "Wheat", "Gluten", "Egg", "Fish", "Shellfish", "Sesame")
    val supportedLanguages = mapOf(
        "en" to "English",
        "hi" to "हिन्दी (Hindi)",
        "bn" to "বাংলা (Bengali)",
        "or" to "ଓଡ଼ିଆ (Odia)",
        "te" to "తెలుగు (Telugu)",
        "ta" to "தமிழ் (Tamil)",
        "mr" to "मराठी (Marathi)"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile & Settings", fontWeight = FontWeight.Bold) }
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
            // Allergy Profile Section
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Shield, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Personal Allergy Profile", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Select allergens you or your family are sensitive to:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(12.dp))

                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        allSupportedAllergens.forEach { allergen ->
                            val isSelected = selectedAllergens.contains(allergen)
                            FilterChip(
                                selected = isSelected,
                                onClick = {
                                    val updated = if (isSelected) selectedAllergens - allergen else selectedAllergens + allergen
                                    coroutineScope.launch { userPreferencesRepository.updateSelectedAllergens(updated) }
                                },
                                label = { Text(allergen) }
                            )
                        }
                    }
                }
            }

            // Language & Appearance Settings
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Language, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("App Language", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(12.dp))

                    supportedLanguages.forEach { (code, name) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(name, style = MaterialTheme.typography.bodyMedium)
                            RadioButton(
                                selected = currentLanguage == code,
                                onClick = { coroutineScope.launch { userPreferencesRepository.setAppLanguage(code) } }
                            )
                        }
                    }
                }
            }

            // Notifications & Demo Mode
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Notifications, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Expiry Reminders", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                        Switch(
                            checked = notificationsEnabled,
                            onCheckedChange = { coroutineScope.launch { userPreferencesRepository.setNotificationsEnabled(it) } }
                        )
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Security, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Demo Mode Active", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                        Switch(
                            checked = isDemoMode,
                            onCheckedChange = { coroutineScope.launch { userPreferencesRepository.setDemoMode(it) } }
                        )
                    }
                }
            }

            // Privacy & Data Control
            Button(
                onClick = {
                    coroutineScope.launch {
                        userPreferencesRepository.clearAllData()
                        onResetData()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.DeleteForever, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Clear All Data & Reset Application")
            }
        }
    }
}
