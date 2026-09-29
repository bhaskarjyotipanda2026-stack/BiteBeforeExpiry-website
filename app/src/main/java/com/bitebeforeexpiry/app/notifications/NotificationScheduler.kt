package com.bitebeforeexpiry.app.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.*
import com.bitebeforeexpiry.app.R
import com.bitebeforeexpiry.app.data.local.database.BiteBeforeExpiryDatabase
import com.bitebeforeexpiry.app.domain.engine.ExpiryEngine
import kotlinx.coroutines.flow.firstOrNull
import java.time.LocalDate
import java.util.concurrent.TimeUnit

class ExpiryWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val database = BiteBeforeExpiryDatabase.getInstance(context)
        val products = database.productDao().getAllProducts().firstOrNull() ?: emptyList()

        val today = LocalDate.now()
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel(notificationManager)

        for (product in products) {
            if (!product.notificationEnabled || product.expiryDate == null) continue

            val daysRemaining = ExpiryEngine.daysRemaining(product.expiryDate, today)

            val (title, body) = when (daysRemaining) {
                0L -> "🚨 ${product.name} Expires Today!" to "Please consume or take action on this product today."
                1L -> "⚠️ ${product.name} Expires Tomorrow" to "Expires in 1 day. Use it soon to prevent food waste!"
                3L -> "🟡 ${product.name} Expires in 3 Days" to "Consider using this item in your upcoming meals."
                7L -> "ℹ️ ${product.name} Expires in 1 Week" to "Planned reminder: product expiring in 7 days."
                else -> null
            } ?: continue

            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build()

            val notificationId = product.id.hashCode()
            notificationManager.notify(notificationId, notification)
        }

        return Result.success()
    }

    private fun createNotificationChannel(notificationManager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Expiry Reminders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifies you when items in your pantry are approaching expiry"
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    companion object {
        const val CHANNEL_ID = "expiry_reminders_channel"
    }
}

class NotificationScheduler(private val context: Context) {

    fun scheduleDailyExpiryCheck() {
        val constraints = Constraints.Builder()
            .setRequiresBatteryNotLow(true)
            .build()

        val periodicWorkRequest = PeriodicWorkRequestBuilder<ExpiryWorker>(1, TimeUnit.DAYS)
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "DailyExpiryCheckWork",
            ExistingPeriodicWorkPolicy.KEEP,
            periodicWorkRequest
        )
    }

    fun triggerImmediateCheck() {
        val oneTimeWorkRequest = OneTimeWorkRequestBuilder<ExpiryWorker>().build()
        WorkManager.getInstance(context).enqueue(oneTimeWorkRequest)
    }

    fun cancelAllNotifications() {
        WorkManager.getInstance(context).cancelUniqueWork("DailyExpiryCheckWork")
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancelAll()
    }
}
