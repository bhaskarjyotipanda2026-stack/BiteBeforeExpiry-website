package com.bitebeforeexpiry.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.bitebeforeexpiry.app.core.navigation.NavRoutes
import com.bitebeforeexpiry.app.feature.history.ScanHistoryScreen
import com.bitebeforeexpiry.app.feature.home.HomeScreen
import com.bitebeforeexpiry.app.feature.home.HomeViewModel
import com.bitebeforeexpiry.app.feature.household.HouseholdScreen
import com.bitebeforeexpiry.app.feature.onboarding.OnboardingScreen
import com.bitebeforeexpiry.app.feature.pantry.PantryScreen
import com.bitebeforeexpiry.app.feature.pantry.PantryViewModel
import com.bitebeforeexpiry.app.feature.productdetails.ProductDetailScreen
import com.bitebeforeexpiry.app.feature.productdetails.ProductDetailViewModel
import com.bitebeforeexpiry.app.feature.products.ProductConfirmationScreen
import com.bitebeforeexpiry.app.feature.recipes.RecipeSuggestionsScreen
import com.bitebeforeexpiry.app.feature.scanner.ScannerScreen
import com.bitebeforeexpiry.app.feature.scanner.ScannerViewModel
import com.bitebeforeexpiry.app.feature.settings.SettingsScreen
import com.bitebeforeexpiry.app.feature.usefirst.UseFirstScreen
import com.bitebeforeexpiry.app.feature.waste.WasteTrackerScreen
import com.bitebeforeexpiry.app.ui.theme.BiteBeforeExpiryTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val app = application as BiteBeforeExpiryApplication

        setContent {
            val isDarkMode by app.userPreferencesRepository.isDarkMode.collectAsState(initial = false)
            val isOnboardingCompleted by app.userPreferencesRepository.isOnboardingCompleted.collectAsState(initial = false)

            val coroutineScope = rememberCoroutineScope()

            BiteBeforeExpiryTheme(darkTheme = isDarkMode) {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                val showBottomBar = currentRoute in listOf(
                    NavRoutes.HOME, NavRoutes.SCAN, NavRoutes.PANTRY, NavRoutes.HISTORY, NavRoutes.PROFILE
                )

                Scaffold(
                    bottomBar = {
                        if (showBottomBar) {
                            NavigationBar {
                                NavigationBarItem(
                                    selected = currentRoute == NavRoutes.HOME,
                                    onClick = {
                                        navController.navigate(NavRoutes.HOME) {
                                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    },
                                    icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                                    label = { Text("Home") }
                                )
                                NavigationBarItem(
                                    selected = currentRoute == NavRoutes.SCAN,
                                    onClick = {
                                        navController.navigate(NavRoutes.SCAN) {
                                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    },
                                    icon = { Icon(Icons.Default.CameraAlt, contentDescription = "Scan") },
                                    label = { Text("Scan") }
                                )
                                NavigationBarItem(
                                    selected = currentRoute == NavRoutes.PANTRY,
                                    onClick = {
                                        navController.navigate(NavRoutes.PANTRY) {
                                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    },
                                    icon = { Icon(Icons.Default.Kitchen, contentDescription = "Pantry") },
                                    label = { Text("Pantry") }
                                )
                                NavigationBarItem(
                                    selected = currentRoute == NavRoutes.HISTORY,
                                    onClick = {
                                        navController.navigate(NavRoutes.HISTORY) {
                                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    },
                                    icon = { Icon(Icons.Default.History, contentDescription = "History") },
                                    label = { Text("History") }
                                )
                                NavigationBarItem(
                                    selected = currentRoute == NavRoutes.PROFILE,
                                    onClick = {
                                        navController.navigate(NavRoutes.PROFILE) {
                                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    },
                                    icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                                    label = { Text("Profile") }
                                )
                            }
                        }
                    }
                ) { innerPadding ->
                    NavHost(
                        navController = navController,
                        startDestination = if (isOnboardingCompleted) NavRoutes.HOME else NavRoutes.ONBOARDING,
                        modifier = Modifier.padding(innerPadding)
                    ) {
                        composable(NavRoutes.ONBOARDING) {
                            OnboardingScreen(
                                onOnboardingFinished = {
                                    coroutineScope.launch {
                                        app.userPreferencesRepository.setOnboardingCompleted(true)
                                        navController.navigate(NavRoutes.HOME) {
                                            popUpTo(NavRoutes.ONBOARDING) { inclusive = true }
                                        }
                                    }
                                }
                            )
                        }

                        composable(NavRoutes.HOME) {
                            val homeViewModel = remember { HomeViewModel(app.productRepository) }
                            HomeScreen(
                                viewModel = homeViewModel,
                                onNavigateToScan = { navController.navigate(NavRoutes.SCAN) },
                                onNavigateToProductDetails = { id -> navController.navigate(NavRoutes.productDetail(id)) },
                                onNavigateToUseFirst = { navController.navigate(NavRoutes.USE_FIRST) },
                                onNavigateToWasteTracker = { navController.navigate(NavRoutes.WASTE_TRACKER) }
                            )
                        }

                        composable(NavRoutes.SCAN) {
                            val scannerViewModel = remember { ScannerViewModel(app.productRepository) }
                            ScannerScreen(
                                viewModel = scannerViewModel,
                                onProductConfirmed = { barcode ->
                                    navController.navigate(NavRoutes.productConfirm(barcode))
                                },
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable(NavRoutes.PANTRY) {
                            val pantryViewModel = remember { PantryViewModel(app.productRepository) }
                            PantryScreen(
                                viewModel = pantryViewModel,
                                onNavigateToProductDetails = { id -> navController.navigate(NavRoutes.productDetail(id)) },
                                onNavigateToScan = { navController.navigate(NavRoutes.SCAN) }
                            )
                        }

                        composable(NavRoutes.HISTORY) {
                            ScanHistoryScreen(
                                onNavigateToScan = { navController.navigate(NavRoutes.SCAN) }
                            )
                        }

                        composable(NavRoutes.PROFILE) {
                            SettingsScreen(
                                userPreferencesRepository = app.userPreferencesRepository,
                                onResetData = {
                                    coroutineScope.launch {
                                        app.productRepository.clearAll()
                                        navController.navigate(NavRoutes.ONBOARDING) {
                                            popUpTo(0) { inclusive = true }
                                        }
                                    }
                                }
                            )
                        }

                        composable(
                            route = NavRoutes.PRODUCT_CONFIRM,
                            arguments = listOf(navArgument("barcode") { type = NavType.StringType })
                        ) { backStackEntry ->
                            val barcode = backStackEntry.arguments?.getString("barcode") ?: ""
                            ProductConfirmationScreen(
                                barcodeOrScanId = barcode,
                                productRepository = app.productRepository,
                                onProductSaved = {
                                    navController.navigate(NavRoutes.PANTRY) {
                                        popUpTo(NavRoutes.HOME)
                                    }
                                },
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable(
                            route = NavRoutes.PRODUCT_DETAIL,
                            arguments = listOf(navArgument("productId") { type = NavType.StringType })
                        ) { backStackEntry ->
                            val productId = backStackEntry.arguments?.getString("productId") ?: ""
                            val detailViewModel = remember(productId) {
                                ProductDetailViewModel(productId, app.productRepository)
                            }
                            ProductDetailScreen(
                                viewModel = detailViewModel,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable(NavRoutes.USE_FIRST) {
                            UseFirstScreen(
                                productRepository = app.productRepository,
                                onNavigateToRecipes = { navController.navigate(NavRoutes.RECIPES) },
                                onNavigateToProductDetails = { id -> navController.navigate(NavRoutes.productDetail(id)) },
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable(NavRoutes.RECIPES) {
                            RecipeSuggestionsScreen(
                                productRepository = app.productRepository,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable(NavRoutes.WASTE_TRACKER) {
                            WasteTrackerScreen(
                                wasteRepository = app.wasteRepository,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable(NavRoutes.HOUSEHOLD) {
                            HouseholdScreen(
                                householdRepository = app.householdRepository,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }
                    }
                }
            }
        }
    }
}
