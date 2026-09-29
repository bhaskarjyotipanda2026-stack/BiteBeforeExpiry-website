package com.bitebeforeexpiry.app.core.navigation

object NavRoutes {
    const val ONBOARDING = "onboarding"
    const val HOME = "home"
    const val SCAN = "scan"
    const val PANTRY = "pantry"
    const val HISTORY = "history"
    const val PROFILE = "profile"
    const val PRODUCT_DETAIL = "product_detail/{productId}"
    const val PRODUCT_CONFIRM = "product_confirm/{barcode}"
    const val USE_FIRST = "use_first"
    const val WASTE_TRACKER = "waste_tracker"
    const val HOUSEHOLD = "household"
    const val RECIPES = "recipes"

    fun productDetail(productId: String) = "product_detail/$productId"
    fun productConfirm(barcode: String) = "product_confirm/$barcode"
}
