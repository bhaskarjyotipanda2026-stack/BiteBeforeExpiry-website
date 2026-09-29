package com.bitebeforeexpiry.app.data.local.dao

import androidx.room.*
import com.bitebeforeexpiry.app.data.local.entity.HouseholdMemberEntity
import com.bitebeforeexpiry.app.data.local.entity.ProductEntity
import com.bitebeforeexpiry.app.data.local.entity.ScanHistoryEntity
import com.bitebeforeexpiry.app.data.local.entity.WasteRecordEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {

    @Query("SELECT * FROM products ORDER BY expiryDate ASC")
    fun getAllProducts(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getProductById(id: String): ProductEntity?

    @Query("SELECT * FROM products WHERE status = 'USE_SOON' OR status = 'EXPIRES_TODAY' OR priority = 'HIGH' ORDER BY expiryDate ASC")
    fun getUseFirstProducts(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE allergenMatchCount > 0 ORDER BY expiryDate ASC")
    fun getAllergyAlertProducts(): Flow<List<ProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: ProductEntity)

    @Update
    suspend fun updateProduct(product: ProductEntity)

    @Query("DELETE FROM products WHERE id = :id")
    suspend fun deleteProductById(id: String)

    @Query("DELETE FROM products")
    suspend fun deleteAllProducts()
}

@Dao
interface WasteDao {

    @Query("SELECT * FROM waste_records ORDER BY discardedDate DESC")
    fun getAllWasteRecords(): Flow<List<WasteRecordEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWasteRecord(record: WasteRecordEntity)

    @Query("DELETE FROM waste_records")
    suspend fun deleteAllWasteRecords()
}

@Dao
interface ScanHistoryDao {

    @Query("SELECT * FROM scan_history ORDER BY scannedAt DESC")
    fun getScanHistory(): Flow<List<ScanHistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScanHistory(entry: ScanHistoryEntity)

    @Query("DELETE FROM scan_history")
    suspend fun clearHistory()
}

@Dao
interface HouseholdDao {

    @Query("SELECT * FROM household_members")
    fun getHouseholdMembers(): Flow<List<HouseholdMemberEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMember(member: HouseholdMemberEntity)

    @Query("DELETE FROM household_members WHERE id = :id")
    suspend fun deleteMember(id: String)
}
