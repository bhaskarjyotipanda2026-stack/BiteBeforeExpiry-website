package com.bitebeforeexpiry.app

import com.bitebeforeexpiry.app.domain.engine.AllergyMatchingEngine
import com.bitebeforeexpiry.app.domain.engine.ExpiryEngine
import com.bitebeforeexpiry.app.domain.model.ExpiryStatus
import com.bitebeforeexpiry.app.domain.model.Ingredient
import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate

class EngineUnitTests {

    @Test
    fun testExpiryStatusCalculation() {
        val today = LocalDate.now()

        val expired = ExpiryEngine.calculateStatus(today.minusDays(2), today)
        assertEquals(ExpiryStatus.EXPIRED, expired)

        val expiresToday = ExpiryEngine.calculateStatus(today, today)
        assertEquals(ExpiryStatus.EXPIRES_TODAY, expiresToday)

        val useSoon = ExpiryEngine.calculateStatus(today.plusDays(4), today)
        assertEquals(ExpiryStatus.USE_SOON, useSoon)

        val upcoming = ExpiryEngine.calculateStatus(today.plusDays(15), today)
        assertEquals(ExpiryStatus.UPCOMING, upcoming)

        val safe = ExpiryEngine.calculateStatus(today.plusDays(45), today)
        assertEquals(ExpiryStatus.SAFE, safe)
    }

    @Test
    fun testAllergyMatchingEngine() {
        val ingredients = listOf(
            Ingredient(name = "Wheat Flour"),
            Ingredient(name = "Sugar"),
            Ingredient(name = "Soy Lecithin"),
            Ingredient(name = "Milk Solids")
        )

        val userAllergens = setOf("Milk", "Soy", "Peanuts")

        val result = AllergyMatchingEngine.checkAllergens(ingredients, userAllergens)

        assertTrue(result.isAllergenDetected)
        assertTrue(result.matchedAllergens.contains("Milk"))
        assertTrue(result.matchedAllergens.contains("Soy"))
        assertFalse(result.matchedAllergens.contains("Peanuts"))
    }
}
