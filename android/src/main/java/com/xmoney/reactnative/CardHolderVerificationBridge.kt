package com.xmoney.reactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.xmoney.payments.model.CardHolderVerificationResult
import java.lang.ref.WeakReference
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch

internal object CardHolderVerificationBridge {
    private val pending = ConcurrentHashMap<String, CountDownLatch>()
    private val answers = ConcurrentHashMap<String, Boolean>()
    @Volatile
    private var reactContext: WeakReference<ReactApplicationContext>? = null

    fun attach(context: ReactApplicationContext) {
        reactContext = WeakReference(context)
    }

    fun ask(chvId: String, result: CardHolderVerificationResult): Boolean {
        val requestId = UUID.randomUUID().toString()
        val latch = CountDownLatch(1)
        pending[requestId] = latch
        val body = Arguments.createMap().apply {
            putString("type", "onCardHolderVerification")
            putString("requestId", requestId)
            putString("chvId", chvId)
            putString("status", result.status.raw)
            result.firstNameStatus?.let { putString("firstNameStatus", it.raw) }
            result.middleNameStatus?.let { putString("middleNameStatus", it.raw) }
            result.lastNameStatus?.let { putString("lastNameStatus", it.raw) }
        }
        val context = reactContext?.get()
        if (context != null) {
            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("XMoneyPaymentSheetEvent", body)
        } else {
            pending.remove(requestId)
            return false
        }
        latch.await()
        pending.remove(requestId)
        return answers.remove(requestId) ?: false
    }

    fun answer(requestId: String, accepted: Boolean) {
        answers[requestId] = accepted
        pending[requestId]?.countDown()
    }
}
