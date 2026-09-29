package com.bitebeforeexpiry.app.domain.engine

import com.bitebeforeexpiry.app.domain.model.AttentionPriority
import com.bitebeforeexpiry.app.domain.model.ExpiryStatus
import com.bitebeforeexpiry.app.domain.model.ProductCategory
import java.time.LocalDate

object AttentionEngine {

    fun determinePriority(
        expiryStatus: ExpiryStatus,
        hasAllergenMatch: Boolean,
        category: ProductCategory,
        daysRemaining: Long
    ): AttentionPriority {
        if (expiryStatus == ExpiryStatus.EXPIRED || expiryStatus == ExpiryStatus.EXPIRES_TODAY) {
            return AttentionPriority.HIGH
        }

        if (hasAllergenMatch) {
            return AttentionPriority.HIGH
        }

        if (category == ProductCategory.MEDICINE && daysRemaining in 0..14) {
            return AttentionPriority.HIGH
        }

        if (expiryStatus == ExpiryStatus.USE_SOON) {
            return AttentionPriority.HIGH
        }

        if (expiryStatus == ExpiryStatus.UPCOMING) {
            return AttentionPriority.MEDIUM
        }

        return AttentionPriority.LOW
    }

    fun getAttentionExplanation(
        status: ExpiryStatus,
        hasAllergenMatch: Boolean,
        allergenList: List<String>,
        daysRemaining: Long
    ): String {
        val reasons = mutableListOf<String>()

        if (status == ExpiryStatus.EXPIRED) {
            reasons.add("Product has expired!")
        } else if (status == ExpiryStatus.EXPIRES_TODAY) {
            reasons.add("Expires today!")
        } else if (status == ExpiryStatus.USE_SOON) {
            reasons.add("Expires in $daysRemaining days (Use Soon)")
        }

        if (hasAllergenMatch) {
            reasons.add("Matches your saved allergy profile (${allergenList.joinToString(", ")})")
        }

        return if (reasons.isEmpty()) "Product is safe and within shelf life."
        else reasons.joinToString(" • ")
    }
}
