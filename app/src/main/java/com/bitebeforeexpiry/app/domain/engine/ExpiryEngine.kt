package com.bitebeforeexpiry.app.domain.engine

import com.bitebeforeexpiry.app.domain.model.ExpiryStatus
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.regex.Pattern

object ExpiryEngine {

    private val DATE_PATTERNS = listOf(
        Pattern.compile("\\b(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{4})\\b"), // DD/MM/YYYY or MM/DD/YYYY
        Pattern.compile("\\b(\\d{4})[/.-](\\d{1,2})[/.-](\\d{1,2})\\b"), // YYYY/MM/DD
        Pattern.compile("\\b(\\d{1,2})[/.-](\\d{4})\\b"),                 // MM/YYYY
        Pattern.compile("\\b(\\d{1,2})[/.-](\\d{2})\\b")                  // MM/YY
    )

    private val KEYWORD_PATTERNS = listOf(
        "EXP", "EXPIRY", "EXP DATE", "USE BY", "BEST BEFORE", "BB", "MFG", "MFD", "MANUFACTURED"
    )

    data class DateDetectionResult(
        val date: LocalDate?,
        val labelType: String,
        val confidence: Float,
        val rawText: String
    )

    fun calculateStatus(expiryDate: LocalDate?, currentDate: LocalDate = LocalDate.now()): ExpiryStatus {
        if (expiryDate == null) return ExpiryStatus.SAFE
        val daysRemaining = ChronoUnit.DAYS.between(currentDate, expiryDate)
        return when {
            daysRemaining < 0 -> ExpiryStatus.EXPIRED
            daysRemaining == 0L -> ExpiryStatus.EXPIRES_TODAY
            daysRemaining in 1..7 -> ExpiryStatus.USE_SOON
            daysRemaining in 8..30 -> ExpiryStatus.UPCOMING
            else -> ExpiryStatus.SAFE
        }
    }

    fun daysRemaining(expiryDate: LocalDate?, currentDate: LocalDate = LocalDate.now()): Long {
        if (expiryDate == null) return 999L
        return ChronoUnit.DAYS.between(currentDate, expiryDate)
    }

    fun parseAndDetectDate(text: String): DateDetectionResult {
        val uppercaseText = text.uppercase()
        var detectedLabel = "EXPIRY"
        if (uppercaseText.contains("BEST BEFORE") || uppercaseText.contains("BB")) {
            detectedLabel = "BEST BEFORE"
        } else if (uppercaseText.contains("USE BY")) {
            detectedLabel = "USE BY"
        } else if (uppercaseText.contains("MFG") || uppercaseText.contains("MANUFACTURED")) {
            detectedLabel = "MANUFACTURING"
        }

        for (pattern in DATE_PATTERNS) {
            val matcher = pattern.matcher(uppercaseText)
            while (matcher.find()) {
                val matchedStr = matcher.group()
                val parsedDate = tryParseDateString(matchedStr)
                if (parsedDate != null && isValidDate(parsedDate)) {
                    return DateDetectionResult(
                        date = parsedDate,
                        labelType = detectedLabel,
                        confidence = 0.90f,
                        rawText = matchedStr
                    )
                }
            }
        }

        return DateDetectionResult(
            date = null,
            labelType = detectedLabel,
            confidence = 0.0f,
            rawText = ""
        )
    }

    fun tryParseDateString(dateStr: String): LocalDate? {
        val cleaned = dateStr.trim().replace('.', '/').replace('-', '/')
        val parts = cleaned.split("/")

        return try {
            if (parts.size == 3) {
                val p1 = parts[0].toInt()
                val p2 = parts[1].toInt()
                var p3 = parts[2].toInt()
                if (p3 < 100) p3 += 2000

                // Check YYYY/MM/DD vs DD/MM/YYYY vs MM/DD/YYYY
                if (p1 > 1000) { // YYYY/MM/DD
                    LocalDate.of(p1, p2, p3)
                } else if (p1 <= 31 && p2 <= 12) { // Assume DD/MM/YYYY
                    LocalDate.of(p3, p2, p1)
                } else if (p1 <= 12 && p2 <= 31) { // Assume MM/DD/YYYY
                    LocalDate.of(p3, p1, p2)
                } else null
            } else if (parts.size == 2) {
                val m = parts[0].toInt()
                var y = parts[1].toInt()
                if (y < 100) y += 2000
                if (m in 1..12) {
                    // Set to last day of month for MM/YYYY expiry
                    val firstDay = LocalDate.of(y, m, 1)
                    firstDay.withDayOfMonth(firstDay.lengthOfMonth())
                } else null
            } else null
        } catch (e: Exception) {
            null
        }
    }

    fun isValidDate(date: LocalDate): Boolean {
        // Must not be unrealistically far in past or future
        val year = date.year
        return year in 2020..2045
    }
}
