package com.bitebeforeexpiry.app.data.repository

import com.bitebeforeexpiry.app.data.local.dao.HouseholdDao
import com.bitebeforeexpiry.app.data.local.dao.ProductDao
import com.bitebeforeexpiry.app.data.local.dao.WasteDao
import com.bitebeforeexpiry.app.data.local.preferences.UserPreferencesRepository
import com.bitebeforeexpiry.app.domain.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import java.time.LocalDate
import java.util.UUID

class ProductRepository(
    private val productDao: ProductDao,
    private val wasteDao: WasteDao,
    private val userPreferencesRepository: UserPreferencesRepository
) {

    val allProducts: Flow<List<Product>> = combine(
        productDao.getAllProducts(),
        userPreferencesRepository.selectedAllergens
    ) { entities, allergens ->
        entities.map { it.toDomainModel(allergens) }
    }

    val useFirstProducts: Flow<List<Product>> = combine(
        productDao.getUseFirstProducts(),
        userPreferencesRepository.selectedAllergens
    ) { entities, allergens ->
        entities.map { it.toDomainModel(allergens) }
    }

    val allergyAlertProducts: Flow<List<Product>> = combine(
        productDao.getAllergyAlertProducts(),
        userPreferencesRepository.selectedAllergens
    ) { entities, allergens ->
        entities.map { it.toDomainModel(allergens) }
    }

    suspend fun getProductById(id: String): Product? {
        val entity = productDao.getProductById(id) ?: return null
        return entity.toDomainModel()
    }

    suspend fun saveProduct(product: Product) {
        productDao.insertProduct(product.toEntity())
    }

    suspend fun deleteProduct(id: String) {
        productDao.deleteProductById(id)
    }

    suspend fun markProductAsUsedOrDiscarded(product: Product, wasSaved: Boolean) {
        val wasteRecord = WasteRecord(
            id = UUID.randomUUID().toString(),
            productId = product.id,
            productName = product.name,
            category = product.category,
            expiryDate = product.expiryDate,
            discardedDate = LocalDate.now(),
            cost = product.purchasePrice,
            wasSaved = wasSaved
        )
        wasteDao.insertWasteRecord(wasteRecord.toEntity())
        productDao.deleteProductById(product.id)
    }

    suspend fun populateDemoProducts() {
        val today = LocalDate.now()
        val demoItems = listOf(
            Product(
                id = "demo_1",
                name = "Chocolate Biscuits",
                brand = "Delightful Bakes",
                category = ProductCategory.FOOD,
                barcode = "8901234567890",
                expiryDate = today.plusDays(4),
                bestBeforeDate = today.plusDays(4),
                labelType = "BEST BEFORE",
                ingredients = listOf(
                    Ingredient(name = "Wheat Flour"),
                    Ingredient(name = "Sugar"),
                    Ingredient(name = "Palm Oil"),
                    Ingredient(name = "Cocoa Powder"),
                    Ingredient(name = "Milk Solids"),
                    Ingredient(name = "Soy Lecithin"),
                    Ingredient(name = "Salt")
                ),
                nutrition = NutritionInfo(servingSize = "30g", calories = 210.0, sugar = 14.0, protein = 5.0, sodium = 180.0, fiber = 3.0, totalFat = 8.0),
                quantity = 2,
                purchasePrice = 3.50,
                notes = "Keep in a cool dry place"
            ),
            Product(
                id = "demo_2",
                name = "Fresh Whole Milk",
                brand = "Dairy Gold",
                category = ProductCategory.BEVERAGE,
                barcode = "8909876543210",
                expiryDate = today.plusDays(1),
                bestBeforeDate = today.plusDays(1),
                labelType = "USE BY",
                ingredients = listOf(
                    Ingredient(name = "Pasteurized Whole Milk"),
                    Ingredient(name = "Vitamin D3")
                ),
                nutrition = NutritionInfo(servingSize = "200ml", calories = 150.0, sugar = 12.0, protein = 8.0, sodium = 105.0, totalFat = 8.0),
                quantity = 1,
                purchasePrice = 2.80,
                notes = "Refrigerate below 4°C"
            ),
            Product(
                id = "demo_3",
                name = "Whole Wheat Bread",
                brand = "Baker's Choice",
                category = ProductCategory.FOOD,
                barcode = "8901111222333",
                expiryDate = today.plusDays(3),
                bestBeforeDate = today.plusDays(3),
                labelType = "USE BY",
                ingredients = listOf(
                    Ingredient(name = "Whole Wheat Flour"),
                    Ingredient(name = "Water"),
                    Ingredient(name = "Yeast"),
                    Ingredient(name = "Salt")
                ),
                nutrition = NutritionInfo(servingSize = "50g", calories = 120.0, sugar = 2.0, protein = 4.0, sodium = 200.0, fiber = 4.0),
                quantity = 1,
                purchasePrice = 2.20
            ),
            Product(
                id = "demo_4",
                name = "Paracetamol 500mg",
                brand = "HealthCare Pharma",
                category = ProductCategory.MEDICINE,
                barcode = "8905555444333",
                expiryDate = today.plusDays(12),
                labelType = "EXPIRY",
                ingredients = listOf(
                    Ingredient(name = "Paracetamol"),
                    Ingredient(name = "Starch")
                ),
                nutrition = null,
                quantity = 1,
                purchasePrice = 5.00
            ),
            Product(
                id = "demo_5",
                name = "Herbal Nourishing Shampoo",
                brand = "Botanical Care",
                category = ProductCategory.COSMETIC,
                barcode = "8907777888999",
                expiryDate = today.plusDays(120),
                labelType = "EXPIRY",
                ingredients = listOf(
                    Ingredient(name = "Water"),
                    Ingredient(name = "Sodium Laureth Sulfate"),
                    Ingredient(name = "Aloe Vera Extract")
                ),
                quantity = 1,
                purchasePrice = 8.50
            )
        )

        for (item in demoItems) {
            productDao.insertProduct(item.toEntity())
        }
    }

    suspend fun clearAll() {
        productDao.deleteAllProducts()
    }
}

class WasteRepository(private val wasteDao: WasteDao) {

    val wasteRecords: Flow<List<WasteRecord>> = wasteDao.getAllWasteRecords().map { entities ->
        entities.map { it.toDomainModel() }
    }

    suspend fun clearHistory() {
        wasteDao.deleteAllWasteRecords()
    }
}

class HouseholdRepository(private val householdDao: HouseholdDao) {

    val members: Flow<List<HouseholdMember>> = householdDao.getHouseholdMembers().map { entities ->
        entities.map { it.toDomainModel() }
    }

    suspend fun addMember(member: HouseholdMember) {
        householdDao.insertMember(member.toEntity())
    }

    suspend fun removeMember(id: String) {
        householdDao.deleteMember(id)
    }
}
