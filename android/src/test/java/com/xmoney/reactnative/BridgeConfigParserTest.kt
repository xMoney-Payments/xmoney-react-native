package com.xmoney.reactnative

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BridgeConfigParserTest {
    @Test
    fun parse_validFixtures() {
        val config = loadJson("paymentConfig.json")
        val intentMap = loadJson("paymentIntent.json")
        val payload = intentMap["orderPayload"] as String
        val checksum = intentMap["orderChecksum"] as String
        val (configuration, intent) = BridgeConfigParser.parse(config, payload, checksum)
        assertEquals("pk_test_abc", configuration.publicKey)
        assertEquals(true, configuration.card.savedCards.enabled)
        assertEquals("payload", intent.orderPayload)
        assertEquals("checksum", intent.orderChecksum)
    }

    @Test
    fun parse_omittedSavedCardsKeepsDefaults() {
        val config = BridgeConfigParser.parseConfig(
            mapOf(
                "publicKey" to "pk_test_x",
                "card" to mapOf("inputs" to mapOf("grouping" to "spaced")),
            ),
        )
        val defaults = com.xmoney.payments.config.CardConfig()
        assertEquals(defaults.savedCards.enabled, config.card.savedCards.enabled)
        assertEquals(defaults.savedCards.optInVisible, config.card.savedCards.optInVisible)
        assertEquals(
            com.xmoney.payments.config.CardGrouping.SPACED,
            config.card.inputs.grouping,
        )
    }

    @Test
    fun parse_emptyConfigDoesNotThrow() {
        val (configuration, intent) = BridgeConfigParser.parse(emptyMap(), "", "")
        assertEquals("", configuration.publicKey)
        assertEquals("", intent.orderPayload)
        assertEquals("", intent.orderChecksum)
    }

    @Test
    fun parse_cardHolderVerificationKeepsName() {
        val config = BridgeConfigParser.parseConfig(
            mapOf(
                "publicKey" to "pk_test_x",
                "card" to mapOf(
                    "cardHolderVerification" to mapOf(
                        "name" to mapOf("firstName" to "Jane", "lastName" to "Doe"),
                        "chvId" to "chv_1",
                    ),
                ),
            ),
        )
        val verification = config.card.cardHolderVerification!!
        assertEquals("Jane", verification.name.firstName)
        assertEquals("Doe", verification.name.lastName)
        assertEquals("", verification.name.middleName)
    }

    @Test
    fun fixture_containsNestedMaps() {
        val config = loadJson("paymentConfig.json")
        @Suppress("UNCHECKED_CAST")
        val card = config["card"] as Map<String, Any?>
        @Suppress("UNCHECKED_CAST")
        val saved = card["savedCards"] as Map<String, Any?>
        assertTrue(saved["enabled"] as Boolean)
    }

    private fun loadJson(name: String): Map<String, Any?> {
        val text =
            javaClass.classLoader!!
                .getResource(name)!!
                .readText()
        return jsonToMap(JSONObject(text))
    }

    private fun jsonToMap(obj: JSONObject): Map<String, Any?> {
        val map = LinkedHashMap<String, Any?>()
        val keys = obj.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            map[key] = unwrap(obj.get(key))
        }
        return map
    }

    private fun unwrap(value: Any?): Any? =
        when (value) {
            null, JSONObject.NULL -> null
            is JSONObject -> jsonToMap(value)
            is JSONArray -> (0 until value.length()).map { unwrap(value.get(it)) }
            else -> value
        }
}
