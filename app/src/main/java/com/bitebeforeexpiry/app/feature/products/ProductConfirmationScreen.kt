package com.bitebeforeexpiry.app.feature.products

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bitebeforeexpiry.app.data.repository.ProductRepository
import com.bitebeforeexpiry.app.domain.engine.ExpiryEngine
import com.bitebeforeexpiry.app.domain.model.Product
import com.bitebeforeexpiry.app.domain.model.ProductCategory
import kotlinx.coroutines.launch
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductConfirmationScreen(
    barcodeOrScanId: String,
    productRepository: ProductRepository,
    onProductSaved: () -> Unit,
    onNavigateBack: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()

    var name by remember { mutableStateOf("Chocolate Cream Biscuits") }
    var brand by remember { mutableStateOf("Delightful Bakes") }
    var category by remember { mutableStateOf(ProductCategory.FOOD) }
    var expiryDateStr by remember { mutableStateOf(LocalDate.now().plusDays(4).toString()) }
    var labelType by remember { mutableStateOf("BEST BEFORE") }
    var ingredientsText by remember { mutableStateOf("Wheat Flour, Sugar, Palm Oil, Cocoa Powder, Milk Solids, Soy Lecithin, Salt") }
    var quantity by remember { mutableIntStateOf(1) }
    var notes by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Confirm Scanned Product", fontWeight = FontWeight.Bold) },
                actions = {
                    TextButton(onClick = onNavigateBack) {
                        Text("Cancel")
                    }
                }
            )
        },
        bottomBar = {
            Surface(
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = {
                        coroutineScope.launch {
                            val parsedDate = ExpiryEngine.tryParseDateString(expiryDateStr) ?: LocalDate.now().plusDays(7)
                            val ingredientsList = ingredientsText.split(",")
                                .map { com.bitebeforeexpiry.app.domain.model.Ingredient(name = it.trim()) }
                                .filter { it.name.isNotEmpty() }

                            val productToSave = Product(
                                id = "prod_" + System.currentTimeMillis(),
                                name = name,
                                brand = brand,
                                category = category,
                                barcode = barcodeOrScanId,
                                expiryDate = parsedDate,
                                bestBeforeDate = parsedDate,
                                labelType = labelType,
                                ingredients = ingredientsList,
                                quantity = quantity,
                                notes = notes
                            )

                            productRepository.saveProduct(productToSave)
                            onProductSaved()
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .height(54.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Check, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Save to Pantry", fontWeight = FontWeight.Bold)
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.DateRange, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "OCR text extracted successfully. Please review and verify the details before saving.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Product Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = brand,
                onValueChange = { brand = it },
                label = { Text("Brand / Manufacturer") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Category Selector Chips
            Text("Product Category", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ProductCategory.values().forEach { cat ->
                    FilterChip(
                        selected = category == cat,
                        onClick = { category = cat },
                        label = { Text(cat.displayName) }
                    )
                }
            }

            OutlinedTextField(
                value = expiryDateStr,
                onValueChange = { expiryDateStr = it },
                label = { Text("Expiry Date (YYYY-MM-DD or DD/MM/YYYY)") },
                modifier = Modifier.fillMaxWidth(),
                trailingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                singleLine = true
            )

            // Label Type Chips
            Text("Date Label Type", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("BEST BEFORE", "USE BY", "EXPIRY").forEach { type ->
                    FilterChip(
                        selected = labelType == type,
                        onClick = { labelType = type },
                        label = { Text(type) }
                    )
                }
            }

            OutlinedTextField(
                value = ingredientsText,
                onValueChange = { ingredientsText = it },
                label = { Text("Ingredients (comma separated)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Quantity", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { if (quantity > 1) quantity-- }) {
                        Text("-", style = MaterialTheme.typography.titleLarge)
                    }
                    Text("$quantity", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 12.dp))
                    IconButton(onClick = { quantity++ }) {
                        Text("+", style = MaterialTheme.typography.titleLarge)
                    }
                }
            }

            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Storage Notes (Optional)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
        }
    }
}
