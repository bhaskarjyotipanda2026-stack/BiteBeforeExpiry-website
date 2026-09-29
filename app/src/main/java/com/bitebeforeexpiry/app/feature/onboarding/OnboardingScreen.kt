package com.bitebeforeexpiry.app.feature.onboarding

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

data class OnboardingStep(
    val title: String,
    val subtitle: String,
    val description: String,
    val icon: String
)

private val ONBOARDING_STEPS = listOf(
    OnboardingStep("Welcome to BiteBeforeExpiry", "Smart Food Safety & Expiry Assistant", "Never throw away good food or accidentally eat expired products again.", "👋"),
    OnboardingStep("Why BiteBeforeExpiry?", "AI & OCR Powered Protection", "Don't just track dates. Understand ingredients, allergens, and action recommendations.", "🌱"),
    OnboardingStep("Smart Scanning", "Barcode & OCR Text Recognition", "Point your camera at package barcodes or expiry date labels for instant extraction.", "📷"),
    OnboardingStep("Expiry Tracking", "Timely Automated Notifications", "Get early reminders at 30, 14, 7, 3, and 1 day before products expire.", "⏰"),
    OnboardingStep("Ingredient Intelligence", "Decipher Complex Package Labels", "Get plain-language explanations for preservatives, emulsifiers, and additives.", "🔬"),
    OnboardingStep("Allergy Protection", "Personalized Safety Checks", "Save your allergy profile and receive instant alerts when a product contains matching ingredients.", "🚨"),
    OnboardingStep("Nutrition Insights", "Clear Scorecard Visualizer", "Understand sugar, sodium, protein, and calorie counts in a simple snapshot.", "📊"),
    OnboardingStep("Smart Pantry", "Multi-Category Inventory", "Manage Food, Beverages, Medicine, and Cosmetics with filters and instant search.", "🧺"),
    OnboardingStep("Waste Reduction", "Track Money & Food Saved", "See how much food waste you prevent and monitor the value preserved over time.", "💰"),
    OnboardingStep("Select Language", "7 Indian & International Languages", "Choose your preferred language for UI, ingredient explanations, and alerts.", "🌐"),
    OnboardingStep("Notifications", "Never Miss an Expiry Date", "Enable notification permissions to receive timely reminders on your device.", "🔔"),
    OnboardingStep("Allergy Profile Setup", "Select Known Allergies", "Choose allergens to monitor (Milk, Peanuts, Tree Nuts, Soy, Wheat, Gluten, etc.).", "🛡️"),
    OnboardingStep("Household Mode", "Keep Your Family Safe", "Set up household members with individual allergy profiles and preferences.", "👨‍👩‍👧‍👦"),
    OnboardingStep("Ready to Begin!", "Start Scanning & Saving Food", "Tap finish to enter your smart pantry assistant. Demo mode is pre-loaded for instant testing!", "🚀")
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(
    onOnboardingFinished: () -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { ONBOARDING_STEPS.size })
    val coroutineScope = rememberCoroutineScope()

    Scaffold(
        bottomBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (pagerState.currentPage < ONBOARDING_STEPS.size - 1) {
                    TextButton(
                        onClick = { onOnboardingFinished() }
                    ) {
                        Text("Skip")
                    }
                } else {
                    Spacer(modifier = Modifier.width(60.dp))
                }

                // Page Indicator Dots
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    repeat(ONBOARDING_STEPS.size) { index ->
                        Box(
                            modifier = Modifier
                                .size(if (pagerState.currentPage == index) 10.dp else 6.dp)
                                .clip(CircleShape)
                                .background(
                                    if (pagerState.currentPage == index) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
                                )
                        )
                    }
                }

                Button(
                    onClick = {
                        if (pagerState.currentPage < ONBOARDING_STEPS.size - 1) {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(pagerState.currentPage + 1)
                            }
                        } else {
                            onOnboardingFinished()
                        }
                    },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (pagerState.currentPage < ONBOARDING_STEPS.size - 1) {
                        Icon(Icons.Default.ArrowForward, contentDescription = "Next")
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Check, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Finish")
                        }
                    }
                }
            }
        }
    ) { padding ->
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) { page ->
            val step = ONBOARDING_STEPS[page]
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Surface(
                    modifier = Modifier.size(110.dp),
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = step.icon,
                            style = MaterialTheme.typography.displayMedium
                        )
                    }
                }
                Spacer(modifier = Modifier.height(32.dp))
                Text(
                    text = step.title,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = step.subtitle,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = step.description,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    lineHeight = MaterialTheme.typography.bodyLarge.lineHeight * 1.2
                )
            }
        }
    }
}
