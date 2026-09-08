package com.xmoney.reactnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule

/**
 * TurboModule implementation. Generated spec: [NativeXMoneyPaymentSheetSpec].
 */
@ReactModule(name = XMoneyPaymentSheetModule.NAME)
class XMoneyPaymentSheetModule(reactContext: ReactApplicationContext) :
    NativeXMoneyPaymentSheetSpec(reactContext) {

    private val sheetHolder = PaymentSheetHolder()
    private val googlePayHolder = GooglePayHolder()

    init {
        CardHolderVerificationBridge.attach(reactContext)
    }

    override fun initPaymentSheet(configuration: ReadableMap) {
        XMoneyPaymentSheetBridge.initPaymentSheet(configuration, sheetHolder)
    }

    override fun presentPaymentSheet(intent: ReadableMap, promise: Promise) {
        XMoneyPaymentSheetBridge.presentPaymentSheet(
            reactApplicationContext,
            intent,
            promise,
            sheetHolder,
        )
    }

    override fun dismiss() {
        XMoneyPaymentSheetBridge.dismiss(sheetHolder)
    }

    override fun initApplePay(configuration: ReadableMap) {
        XMoneyPaymentSheetBridge.initApplePay(configuration)
    }

    @Suppress("UNUSED_PARAMETER")
    override fun presentApplePay(intent: ReadableMap, promise: Promise) {
        XMoneyPaymentSheetBridge.presentApplePay(promise)
    }

    override fun dismissApplePay() {
        XMoneyPaymentSheetBridge.dismissApplePay()
    }

    override fun initGooglePay(configuration: ReadableMap) {
        XMoneyPaymentSheetBridge.initGooglePay(configuration, googlePayHolder)
    }

    override fun presentGooglePay(intent: ReadableMap, promise: Promise) {
        XMoneyPaymentSheetBridge.presentGooglePay(
            reactApplicationContext,
            intent,
            promise,
            googlePayHolder,
        )
    }

    override fun dismissGooglePay() {
        XMoneyPaymentSheetBridge.dismissGooglePay(googlePayHolder)
    }

    override fun getApplePayState(promise: Promise) {
        promise.resolve(XMoneyPaymentSheetBridge.applePayState())
    }

    override fun getGooglePayState(intent: ReadableMap, promise: Promise) {
        XMoneyPaymentSheetBridge.getGooglePayState(
            reactApplicationContext,
            intent,
            promise,
            googlePayHolder,
        )
    }

    override fun updateApplePayOrder(intent: ReadableMap, promise: Promise) {
        XMoneyPaymentSheetBridge.updateApplePayOrder(promise)
    }

    override fun updateGooglePayOrder(intent: ReadableMap, promise: Promise) {
        XMoneyPaymentSheetBridge.updateGooglePayOrder(
            reactApplicationContext,
            intent,
            promise,
            googlePayHolder,
        )
    }

    override fun answerCardHolderVerification(requestId: String, accepted: Boolean) {
        XMoneyPaymentSheetBridge.answerCardHolderVerification(requestId, accepted)
    }

    override fun addListener(eventName: String) { /* no-op */ }

    override fun removeListeners(count: Double) { /* no-op */ }

    companion object {
        const val NAME = "XMoneyPaymentSheet"
    }
}
