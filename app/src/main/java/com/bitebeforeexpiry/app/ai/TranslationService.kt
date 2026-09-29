package com.bitebeforeexpiry.app.ai

interface TranslationService {
    suspend fun translate(text: String, targetLanguageCode: String): String
}

class DictionaryTranslationService : TranslationService {

    private val DICTIONARY = mapOf(
        "Milk" to mapOf(
            "hi" to "दूध",
            "bn" to "দুধ",
            "or" to "କ୍ଷୀର",
            "te" to "పాలు",
            "ta" to "பால்",
            "mr" to "दूध"
        ),
        "Milk Solids" to mapOf(
            "hi" to "दूध के ठोस पदार्थ",
            "bn" to "দুধের কঠিন পদার্থ",
            "or" to "କ୍ଷୀର କଠିନ",
            "te" to "పాలు ఘన పదార్థాలు",
            "ta" to "பாலின் திடப்பொருட்கள்",
            "mr" to "दुधाचे घन घटक"
        ),
        "Sugar" to mapOf(
            "hi" to "चीनी",
            "bn" to "চিনি",
            "or" to "ଚିନି",
            "te" to "చక్కెర",
            "ta" to "சர்க்கரை",
            "mr" to "साखर"
        ),
        "Wheat Flour" to mapOf(
            "hi" to "गेहूं का आटा",
            "bn" to "গম আটা",
            "or" to "ଗହମ ଅଟା",
            "te" to "గోధుమ పిండి",
            "ta" to "கோதுமை மாவு",
            "mr" to "गव्हाचे पीठ"
        ),
        "Cocoa" to mapOf(
            "hi" to "कोको",
            "bn" to "কোকো",
            "or" to "କୋକୋ",
            "te" to "కోకో",
            "ta" to "கோகோ",
            "mr" to "कोको"
        )
    )

    override suspend fun translate(text: String, targetLanguageCode: String): String {
        if (targetLanguageCode == "en") return text
        val dict = DICTIONARY[text]
        return dict?.get(targetLanguageCode) ?: text
    }
}
