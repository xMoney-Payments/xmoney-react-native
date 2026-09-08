package com.xmoney.reactnative

import com.xmoney.payments.config.PaymentConfig
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GooglePayStateTest {
    @Test
    fun unconfiguredFlagsAreFalse() {
        val holder = GooglePayHolder()
        val map = XMoneyPaymentSheetBridge.googlePayState(holder)
        assertFalse(map.getBoolean("isAvailable"))
        assertFalse(map.getBoolean("isReady"))
        assertFalse(map.getBoolean("isOrderConsumed"))
        assertTrue(map.getBoolean("isInteractionEnabled"))
    }

    @Test
    fun configuredWithoutBindDoesNotPretendReady() {
        val holder = GooglePayHolder()
        holder.configuration = PaymentConfig(publicKey = "pk_test_x")
        val map = XMoneyPaymentSheetBridge.googlePayState(holder)
        assertFalse(map.getBoolean("isAvailable"))
        assertFalse(map.getBoolean("isReady"))
    }

    @Test
    fun snapshotUsesAvailabilityCache() {
        val holder = GooglePayHolder()
        holder.isAvailable = true
        holder.isReady = false
        val map = XMoneyPaymentSheetBridge.googlePayState(holder)
        assertTrue(map.getBoolean("isAvailable"))
        assertFalse(map.getBoolean("isReady"))
        assertFalse(map.getBoolean("isOrderConsumed"))
        assertTrue(map.getBoolean("isInteractionEnabled"))
    }
}
