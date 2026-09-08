package com.xmoney.reactnative

import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.xmoney.payments.config.AppearanceConfig
import com.xmoney.payments.config.CardConfig
import com.xmoney.payments.config.CardGrouping
import com.xmoney.payments.config.CardHolderName
import com.xmoney.payments.config.CardHolderVerification
import com.xmoney.payments.config.CardInputsConfig
import com.xmoney.payments.config.GooglePayConfig
import com.xmoney.payments.config.OptionsConfig
import com.xmoney.payments.config.PaymentConfig
import com.xmoney.payments.config.PaymentMethodsConfig
import com.xmoney.payments.config.SavedCardsConfig
import com.xmoney.payments.config.SubmitButtonConfig
import com.xmoney.payments.config.SubmitButtonType
import com.xmoney.payments.config.UserInterfaceStyle
import com.xmoney.payments.config.ValidationMode
import com.xmoney.payments.config.WalletAppearance
import com.xmoney.payments.config.WalletButtonColor
import com.xmoney.payments.config.WalletButtonType
import com.xmoney.payments.model.OrderChecksum
import com.xmoney.payments.model.OrderPayload
import com.xmoney.payments.model.PaymentError
import com.xmoney.payments.model.PaymentIntent
import com.xmoney.payments.model.PaymentResult
import com.xmoney.payments.model.Transaction
import com.xmoney.payments.model.TransactionCustomer
import com.xmoney.googlepay.GooglePay
import com.xmoney.googlepay.GooglePayEvent
import com.xmoney.paymentsheet.PaymentSheet
import com.xmoney.paymentsheet.PaymentSheetEvent
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

/** Shared TurboModule implementation. */
internal object XMoneyPaymentSheetBridge {
    fun initPaymentSheet(
        configuration: ReadableMap,
        sheetHolder: PaymentSheetHolder,
    ) {
        @Suppress("UNCHECKED_CAST")
        val dict = configuration.toHashMap() as Map<String, Any?>
        sheetHolder.configuration = BridgeConfigParser.parseConfig(dict)
        sheetHolder.sheet = null
        sheetHolder.presentGeneration += 1
    }

    fun presentPaymentSheet(
        reactContext: ReactApplicationContext,
        intentMap: ReadableMap,
        promise: Promise,
        sheetHolder: PaymentSheetHolder,
    ) {
        @Suppress("UNCHECKED_CAST")
        val dict = intentMap.toHashMap() as Map<String, Any?>
        val requestId = dict["requestId"] as? String ?: ""
        val payload = dict["orderPayload"] as? String ?: ""
        val checksum = dict["orderChecksum"] as? String ?: ""

        val activity = reactContext.currentActivity as? FragmentActivity
        if (activity == null) {
            promise.reject("NO_PRESENTER", "Unable to present from the current screen.")
            return
        }

        UiThreadUtil.runOnUiThread {
            val configuration = sheetHolder.configuration
            if (configuration == null) {
                promise.reject("NOT_INITIALIZED", "Call init before present.")
                return@runOnUiThread
            }
            try {
                CardHolderVerificationBridge.attach(reactContext)
                val intent = BridgeConfigParser.parseIntent(payload, checksum)
                sheetHolder.sheet?.dismiss()
                val generation = ++sheetHolder.presentGeneration
                val sheet = PaymentSheet(configuration).also {
                    sheetHolder.sheet = it
                }
                sheet.present(
                    activity = activity,
                    intent = intent,
                    onEvent = { event -> emit(reactContext, event, requestId) },
                    onResult = { result ->
                        if (sheetHolder.presentGeneration == generation) {
                            sheetHolder.sheet = null
                        }
                        promise.resolve(Arguments.makeNativeMap(BridgeResults.resultToMap(result)))
                    },
                )
            } catch (error: Exception) {
                rejectNative(promise, error)
            }
        }
    }

    fun dismiss(sheetHolder: PaymentSheetHolder) {
        UiThreadUtil.runOnUiThread {
            sheetHolder.sheet?.dismiss()
        }
    }

    fun initApplePay(configuration: ReadableMap) {
        @Suppress("UNCHECKED_CAST")
        configuration.toHashMap() as Map<String, Any?>
    }

    fun presentApplePay(promise: Promise) {
        promise.resolve(
            Arguments.makeNativeMap(
                BridgeResults.failedMap(
                    "APPLE_PAY",
                    "Apple Pay is only available on iOS.",
                ),
            ),
        )
    }

    fun dismissApplePay() {}

    fun initGooglePay(
        configuration: ReadableMap,
        holder: GooglePayHolder,
    ) {
        @Suppress("UNCHECKED_CAST")
        val dict = configuration.toHashMap() as Map<String, Any?>
        holder.configuration = BridgeConfigParser.parseConfig(dict)
        holder.googlePay = GooglePay(holder.configuration!!)
        holder.lastIntent = null
        holder.isAvailable = false
        holder.isReady = false
    }

    fun presentGooglePay(
        reactContext: ReactApplicationContext,
        intentMap: ReadableMap,
        promise: Promise,
        holder: GooglePayHolder,
    ) {
        @Suppress("UNCHECKED_CAST")
        val dict = intentMap.toHashMap() as Map<String, Any?>
        val requestId = dict["requestId"] as? String ?: ""
        val payload = dict["orderPayload"] as? String ?: ""
        val checksum = dict["orderChecksum"] as? String ?: ""

        val activity = reactContext.currentActivity as? FragmentActivity
        if (activity == null) {
            promise.reject("NO_PRESENTER", "Unable to present from the current screen.")
            return
        }

        UiThreadUtil.runOnUiThread {
            val configuration = holder.configuration
            if (configuration == null) {
                promise.reject("NOT_INITIALIZED", "Call init before present.")
                return@runOnUiThread
            }
            try {
                CardHolderVerificationBridge.attach(reactContext)
                val intent = BridgeConfigParser.parseIntent(payload, checksum)
                holder.lastIntent = intent
                holder.googlePay?.dismiss()
                val googlePay = holder.googlePay ?: GooglePay(configuration).also {
                    holder.googlePay = it
                }
                googlePay.present(
                    activity = activity,
                    intent = intent,
                    onEvent = { event -> emitGooglePay(reactContext, event, requestId) },
                    onResult = { result ->
                        promise.resolve(Arguments.makeNativeMap(BridgeResults.resultToMap(result)))
                    },
                )
            } catch (error: Exception) {
                rejectNative(promise, error)
            }
        }
    }

    fun dismissGooglePay(holder: GooglePayHolder) {
        UiThreadUtil.runOnUiThread {
            holder.googlePay?.dismiss()
        }
    }

    fun updateApplePayOrder(promise: Promise) {
        promise.reject("APPLE_PAY", "Apple Pay is only available on iOS.")
    }

    fun updateGooglePayOrder(
        reactContext: ReactApplicationContext,
        intentMap: ReadableMap,
        promise: Promise,
        holder: GooglePayHolder,
    ) {
        @Suppress("UNCHECKED_CAST")
        val dict = intentMap.toHashMap() as Map<String, Any?>
        val payload = dict["orderPayload"] as? String ?: ""
        val checksum = dict["orderChecksum"] as? String ?: ""
        val activity = reactContext.currentActivity as? FragmentActivity
        if (activity == null) {
            promise.reject("NO_PRESENTER", "Unable to present from the current screen.")
            return
        }
        UiThreadUtil.runOnUiThread {
            val googlePay = holder.googlePay
            if (googlePay == null) {
                promise.reject("NOT_INITIALIZED", "Call init before present.")
                return@runOnUiThread
            }
            val intent = BridgeConfigParser.parseIntent(payload, checksum)
            holder.lastIntent = intent
            activity.lifecycleScope.launch {
                try {
                    googlePay.updateOrder(intent)
                    promise.resolve(null)
                } catch (error: Exception) {
                    rejectNative(promise, error)
                }
            }
        }
    }

    fun answerCardHolderVerification(requestId: String, accepted: Boolean) {
        CardHolderVerificationBridge.answer(requestId, accepted)
    }

    private fun rejectNative(promise: Promise, error: Throwable) {
        when (error) {
            is CancellationException ->
                promise.reject(
                    "SUPERSEDED_UPDATE_ORDER",
                    "Superseded by a newer updateOrder call",
                )
            is PaymentError -> promise.reject(error.code, error.merchantMessage())
            is IllegalStateException ->
                promise.reject("GOOGLE_PAY", error.message ?: "Google Pay is not presented")
            else -> promise.reject("PRESENT_ERROR", "Failed to present")
        }
    }

    fun applePayState(): WritableMap = BridgeResults.walletStateMap(
        isAvailable = false,
        isReady = false,
        isOrderConsumed = false,
        isInteractionEnabled = true,
    )

    fun googlePayState(holder: GooglePayHolder): WritableMap {
        return BridgeResults.walletStateMap(
            isAvailable = holder.isAvailable,
            isReady = holder.isReady,
            isOrderConsumed = false,
            isInteractionEnabled = true,
        )
    }

    fun getGooglePayState(
        reactContext: ReactApplicationContext,
        intentMap: ReadableMap?,
        promise: Promise,
        holder: GooglePayHolder,
    ) {
        val payload = if (intentMap != null && intentMap.hasKey("orderPayload")) {
            intentMap.getString("orderPayload") ?: ""
        } else {
            ""
        }
        val checksum = if (intentMap != null && intentMap.hasKey("orderChecksum")) {
            intentMap.getString("orderChecksum") ?: ""
        } else {
            ""
        }
        if (payload.isNotEmpty() && checksum.isNotEmpty()) {
            holder.lastIntent = BridgeConfigParser.parseIntent(payload, checksum)
        }
        val configuration = holder.configuration
        val intent = holder.lastIntent
        val activity = reactContext.currentActivity as? FragmentActivity
        if (configuration == null || intent == null || activity == null) {
            promise.resolve(googlePayState(holder))
            return
        }
        UiThreadUtil.runOnUiThread {
            activity.lifecycleScope.launch {
                try {
                    val flags = GooglePay(configuration).availability(activity, intent)
                    holder.isAvailable = flags.isAvailable
                    holder.isReady = flags.isReady
                } catch (_: Exception) {
                    // Keep last snapshot; never throw from getState.
                }
                promise.resolve(googlePayState(holder))
            }
        }
    }

    private fun emitGooglePay(
        reactContext: ReactApplicationContext,
        event: GooglePayEvent,
        requestId: String,
    ) {
        val body = Arguments.createMap().apply {
            putString("requestId", requestId)
            when (event) {
                is GooglePayEvent.Ready -> putString("type", "onReady")
                is GooglePayEvent.Processing -> {
                    putString("type", "onProcessing")
                    putBoolean("isProcessing", event.isProcessing)
                }
            }
        }
        emitEvent(reactContext, body)
    }

    private fun emit(
        reactContext: ReactApplicationContext,
        event: PaymentSheetEvent,
        requestId: String,
    ) {
        val body = Arguments.createMap().apply {
            putString("requestId", requestId)
            when (event) {
                is PaymentSheetEvent.Ready -> putString("type", "onReady")
                is PaymentSheetEvent.Processing -> {
                    putString("type", "onProcessing")
                    putBoolean("isProcessing", event.isProcessing)
                }
            }
        }
        emitEvent(reactContext, body)
    }

    private fun emitEvent(
        reactContext: ReactApplicationContext,
        body: com.facebook.react.bridge.WritableMap,
    ) {
        if (!reactContext.hasActiveReactInstance()) {
            return
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("XMoneyPaymentSheetEvent", body)
    }
}

internal class PaymentSheetHolder {
    var configuration: PaymentConfig? = null
    var sheet: PaymentSheet? = null
    var presentGeneration = 0
}

internal class GooglePayHolder {
    var configuration: PaymentConfig? = null
    var googlePay: GooglePay? = null
    var lastIntent: PaymentIntent? = null
    var isAvailable: Boolean = false
    var isReady: Boolean = false
}

internal object BridgeResults {
    fun resultToMap(result: PaymentResult): Map<String, Any?> = when (result) {
        is PaymentResult.Complete -> mapOf(
            "status" to "complete",
            "transaction" to transactionToMap(result.transaction),
        )
        is PaymentResult.Failed -> mapOf(
            "status" to "failed",
            "error" to mapOf(
                "code" to result.error.code,
                "message" to result.error.merchantMessage(),
            ),
        )
        is PaymentResult.Canceled -> mapOf("status" to "canceled")
    }

    fun failedMap(code: String, message: String): Map<String, Any?> = mapOf(
        "status" to "failed",
        "error" to mapOf("code" to code, "message" to message),
    )

    fun walletStateMap(
        isAvailable: Boolean,
        isReady: Boolean,
        isOrderConsumed: Boolean,
        isInteractionEnabled: Boolean,
    ): WritableMap = Arguments.createMap().apply {
        putBoolean("isAvailable", isAvailable)
        putBoolean("isReady", isReady)
        putBoolean("isOrderConsumed", isOrderConsumed)
        putBoolean("isInteractionEnabled", isInteractionEnabled)
    }

    private fun transactionToMap(tx: Transaction): Map<String, Any?> {
        val map = hashMapOf<String, Any?>()
        tx.id?.let { map["id"] = it }
        tx.status?.let { map["status"] = it }
        tx.amount?.let { map["amount"] = it }
        tx.currencyKey?.let { map["currencyKey"] = it }
        tx.amountInEuro?.let { map["amountInEuro"] = it }
        tx.externalOrderId?.let { map["externalOrderId"] = it }
        tx.description?.let { map["description"] = it }
        tx.customerData?.let { map["customerData"] = customerToMap(it) }
        return map
    }

    private fun customerToMap(customer: TransactionCustomer): Map<String, Any?> {
        val map = hashMapOf<String, Any?>()
        customer.id?.let { map["id"] = it }
        customer.siteId?.let { map["siteId"] = it }
        customer.identifier?.let { map["identifier"] = it }
        customer.firstName?.let { map["firstName"] = it }
        customer.lastName?.let { map["lastName"] = it }
        customer.country?.let { map["country"] = it }
        customer.state?.let { map["state"] = it }
        customer.city?.let { map["city"] = it }
        customer.zipCode?.let { map["zipCode"] = it }
        customer.address?.let { map["address"] = it }
        customer.phone?.let { map["phone"] = it }
        customer.email?.let { map["email"] = it }
        map["isWhitelisted"] = customer.isWhitelisted
        customer.isWhitelistedUntil?.let { map["isWhitelistedUntil"] = it }
        customer.creationDate?.let { map["creationDate"] = it }
        customer.creationTimestamp?.let { map["creationTimestamp"] = it }
        return map
    }
}

internal object BridgeConfigParser {
    fun parseConfig(dict: Map<String, Any?>): PaymentConfig {
        return PaymentConfig(
            publicKey = dict.string("publicKey") ?: "",
            card = parseCard(dict.child("card")),
            paymentMethods = parsePaymentMethods(dict.child("paymentMethods")),
            options = parseOptions(dict.child("options")),
        )
    }

    fun parseIntent(orderPayload: String, orderChecksum: String): PaymentIntent {
        return PaymentIntent(
            OrderPayload(orderPayload),
            OrderChecksum(orderChecksum),
        )
    }

    fun parse(
        config: Map<String, Any?>,
        orderPayload: String,
        orderChecksum: String,
    ): Pair<PaymentConfig, PaymentIntent> {
        return parseConfig(config) to parseIntent(orderPayload, orderChecksum)
    }

    private fun parseCard(dict: Map<String, Any?>?): CardConfig {
        if (dict == null) return CardConfig()
        val defaults = CardConfig()
        val saved = dict.child("savedCards")
        val savedCards = if (saved != null) {
            SavedCardsConfig(
                enabled = if (saved.has("enabled")) {
                    saved.bool("enabled", defaults.savedCards.enabled)
                } else {
                    defaults.savedCards.enabled
                },
                optInVisible = if (saved.has("optInVisible")) {
                    saved.bool("optInVisible", defaults.savedCards.optInVisible)
                } else {
                    defaults.savedCards.optInVisible
                },
            )
        } else {
            defaults.savedCards
        }
        val inputs = dict.child("inputs")
        val grouping = inputs?.string("grouping")
        val cardInputs = if (grouping != null) {
            CardInputsConfig(grouping = CardGrouping.from(grouping))
        } else {
            defaults.inputs
        }
        val submit = dict.child("submitButton")
        val submitButton = if (submit != null) {
            SubmitButtonConfig(
                visible = if (submit.has("visible")) {
                    submit.bool("visible", defaults.submitButton.visible)
                } else {
                    defaults.submitButton.visible
                },
                type = submit.string("type")?.let { SubmitButtonType.from(it) }
                    ?: defaults.submitButton.type,
            )
        } else {
            defaults.submitButton
        }
        return CardConfig(
            savedCards = savedCards,
            cardHolderVerification = parseCardHolderVerification(
                dict.child("cardHolderVerification"),
            ),
            inputs = cardInputs,
            validationMode = dict.string("validationMode")?.let { ValidationMode.from(it) }
                ?: defaults.validationMode,
            submitButton = submitButton,
        )
    }

    private fun parseCardHolderVerification(
        dict: Map<String, Any?>?,
    ): CardHolderVerification? {
        val name = dict.child("name") ?: return null
        val firstName = name.string("firstName") ?: return null
        val lastName = name.string("lastName") ?: return null
        val chvId = dict.string("chvId") ?: ""
        return CardHolderVerification(
            name = CardHolderName(
                firstName = firstName,
                middleName = name.string("middleName") ?: "",
                lastName = lastName,
            ),
            onCardHolderVerification = { result ->
                CardHolderVerificationBridge.ask(chvId, result)
            },
        )
    }

    private fun parsePaymentMethods(dict: Map<String, Any?>?): PaymentMethodsConfig {
        if (dict == null) return PaymentMethodsConfig()
        val googlePay = dict.child("googlePay")
        return PaymentMethodsConfig(
            googlePay = GooglePayConfig(
                enabled = googlePay.bool("enabled", GooglePayConfig().enabled),
                appearance = parseWalletAppearance(googlePay.child("appearance")),
            ),
        )
    }

    fun parseWalletAppearance(dict: Map<String, Any?>?): WalletAppearance {
        if (dict == null) return WalletAppearance()
        return WalletAppearance(
            color = WalletButtonColor.from(dict.string("color")),
            radius = dict.number("radius")?.toFloat(),
            type = WalletButtonType.from(dict.string("type")),
        )
    }

    private fun parseOptions(dict: Map<String, Any?>?): OptionsConfig {
        if (dict == null) return OptionsConfig()
        return OptionsConfig(
            locale = dict.string("locale") ?: OptionsConfig().locale,
            style = UserInterfaceStyle.from(dict.string("style")),
            appearance = AppearanceConfig.from(dict.child("appearance")),
        )
    }
}

@Suppress("UNCHECKED_CAST")
private fun Map<String, Any?>?.child(key: String): Map<String, Any?>? {
    val value = this?.get(key) ?: return null
    return value as? Map<String, Any?>
}

private fun Map<String, Any?>?.has(key: String): Boolean =
    this?.containsKey(key) == true

private fun Map<String, Any?>?.string(key: String): String? {
    val value = this?.get(key) ?: return null
    return value as? String
}

private fun Map<String, Any?>?.bool(key: String, default: Boolean): Boolean {
    val value = this?.get(key) ?: return default
    return when (value) {
        is Boolean -> value
        is Number -> value.toInt() != 0
        else -> default
    }
}

private fun Map<String, Any?>?.number(key: String): Number? {
    val value = this?.get(key) ?: return null
    return value as? Number
}
