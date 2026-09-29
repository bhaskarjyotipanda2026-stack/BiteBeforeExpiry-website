package com.bitebeforeexpiry.app

import android.app.Application
import com.bitebeforeexpiry.app.data.local.database.BiteBeforeExpiryDatabase
import com.bitebeforeexpiry.app.data.local.preferences.UserPreferencesRepository
import com.bitebeforeexpiry.app.data.repository.HouseholdRepository
import com.bitebeforeexpiry.app.data.repository.ProductRepository
import com.bitebeforeexpiry.app.data.repository.WasteRepository
import com.bitebeforeexpiry.app.notifications.NotificationScheduler

class BiteBeforeExpiryApplication : Application() {

    lateinit var database: BiteBeforeExpiryDatabase
        private set

    lateinit var userPreferencesRepository: UserPreferencesRepository
        private set

    lateinit var productRepository: ProductRepository
        private set

    lateinit var wasteRepository: WasteRepository
        private set

    lateinit var householdRepository: HouseholdRepository
        private set

    lateinit var notificationScheduler: NotificationScheduler
        private set

    override fun onCreate() {
        super.onCreate()

        database = BiteBeforeExpiryDatabase.getInstance(this)
        userPreferencesRepository = UserPreferencesRepository(this)
        productRepository = ProductRepository(
            productDao = database.productDao(),
            wasteDao = database.wasteDao(),
            userPreferencesRepository = userPreferencesRepository
        )
        wasteRepository = WasteRepository(database.wasteDao())
        householdRepository = HouseholdRepository(database.householdDao())

        notificationScheduler = NotificationScheduler(this)
        notificationScheduler.scheduleDailyExpiryCheck()
    }
}
