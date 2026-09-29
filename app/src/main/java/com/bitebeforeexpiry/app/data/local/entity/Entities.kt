package com.bitebeforeexpiry.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.LocalDate

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val brand: String,
    val category: String,
    val barcode: String,
    val imageUri: String?,
    val manufacturingDate: LocalDate?,
    val bestBeforeDate: LocalDate?,
    val expiryDate: LocalDate?,
    val labelType: String,
    val ingredientsJson: String, // Comma separated or json
    val nutritionJson: String,
    val rawOcrText: String,
    val language: String,
    val status: String,
    val priority: String,
    val quantity: Int,
    val purchasePrice: Double?,
    val notes: String,
    val createdAt: Long,
    val notificationEnabled: Boolean,
    val allergenMatchCount: Int,
    val allergenMatches: List<String>
)

@Entity(tableName = "waste_records")
data class WasteRecordEntity(
    @PrimaryKey val id: String,
    val productId: String,
    val productName: String,
    val category: String,
    val expiryDate: LocalDate?,
    val discardedDate: LocalDate,
    val cost: Double?,
    val wasSaved: Boolean
)

@Entity(tableName = "scan_history")
data class ScanHistoryEntity(
    @PrimaryKey val id: String,
    val barcode: String?,
    val capturedText: String,
    val scannedAt: Long,
    val recognizedProductName: String?
)

@Entity(tableName = "household_members")
data class HouseholdMemberEntity(
    @PrimaryKey val id: String,
    val name: String,
    val role: String,
    val allergies: List<String>
)
