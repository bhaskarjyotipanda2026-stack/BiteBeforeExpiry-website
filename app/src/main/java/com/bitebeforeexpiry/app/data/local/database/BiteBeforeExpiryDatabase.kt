package com.bitebeforeexpiry.app.data.local.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.bitebeforeexpiry.app.data.local.dao.HouseholdDao
import com.bitebeforeexpiry.app.data.local.dao.ProductDao
import com.bitebeforeexpiry.app.data.local.dao.ScanHistoryDao
import com.bitebeforeexpiry.app.data.local.dao.WasteDao
import com.bitebeforeexpiry.app.data.local.entity.HouseholdMemberEntity
import com.bitebeforeexpiry.app.data.local.entity.ProductEntity
import com.bitebeforeexpiry.app.data.local.entity.ScanHistoryEntity
import com.bitebeforeexpiry.app.data.local.entity.WasteRecordEntity

@Database(
    entities = [
        ProductEntity::class,
        WasteRecordEntity::class,
        ScanHistoryEntity::class,
        HouseholdMemberEntity::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class BiteBeforeExpiryDatabase : RoomDatabase() {

    abstract fun productDao(): ProductDao
    abstract fun wasteDao(): WasteDao
    abstract fun scanHistoryDao(): ScanHistoryDao
    abstract fun householdDao(): HouseholdDao

    companion object {
        @Volatile
        private var INSTANCE: BiteBeforeExpiryDatabase? = null

        fun getInstance(context: Context): BiteBeforeExpiryDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    BiteBeforeExpiryDatabase::class.java,
                    "bite_before_expiry.db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
