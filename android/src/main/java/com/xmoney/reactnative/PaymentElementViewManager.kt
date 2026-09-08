package com.xmoney.reactnative

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class PaymentElementViewManager : SimpleViewManager<PaymentElementView>() {
    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): PaymentElementView =
        PaymentElementView(reactContext)

    @ReactProp(name = "configuration")
    fun setConfiguration(view: PaymentElementView, value: ReadableMap?) {
        view.setConfigurationMap(value)
    }

    override fun getCommandsMap(): MutableMap<String, Int> =
        MapBuilder.of(
            "prepare", COMMAND_PREPARE,
            "confirm", COMMAND_CONFIRM,
            "updateOrder", COMMAND_UPDATE_ORDER,
            "updateAppearance", COMMAND_UPDATE_APPEARANCE,
            "updateLocale", COMMAND_UPDATE_LOCALE,
            "updateStyle", COMMAND_UPDATE_STYLE,
            "updateWalletAppearance", COMMAND_UPDATE_WALLET_APPEARANCE,
        )

    override fun receiveCommand(
        root: PaymentElementView,
        commandId: String?,
        args: ReadableArray?,
    ) {
        when (commandId) {
            "prepare" -> root.prepare(args?.getString(0).orEmpty(), args?.getString(1).orEmpty())
            "confirm" -> root.confirm()
            "updateOrder" -> root.updateOrder(
                args?.getString(0).orEmpty(),
                args?.getString(1).orEmpty(),
                args?.getString(2).orEmpty(),
            )
            "updateAppearance" -> root.updateAppearance(args?.getString(0).orEmpty())
            "updateLocale" -> root.updateLocale(args?.getString(0).orEmpty())
            "updateStyle" -> root.updateStyle(args?.getString(0).orEmpty())
            "updateWalletAppearance" -> root.updateWalletAppearance(args?.getString(0).orEmpty())
        }
    }

    override fun receiveCommand(
        root: PaymentElementView,
        commandId: Int,
        args: ReadableArray?,
    ) {
        when (commandId) {
            COMMAND_PREPARE -> root.prepare(args?.getString(0).orEmpty(), args?.getString(1).orEmpty())
            COMMAND_CONFIRM -> root.confirm()
            COMMAND_UPDATE_ORDER -> root.updateOrder(
                args?.getString(0).orEmpty(),
                args?.getString(1).orEmpty(),
                args?.getString(2).orEmpty(),
            )
            COMMAND_UPDATE_APPEARANCE -> root.updateAppearance(args?.getString(0).orEmpty())
            COMMAND_UPDATE_LOCALE -> root.updateLocale(args?.getString(0).orEmpty())
            COMMAND_UPDATE_STYLE -> root.updateStyle(args?.getString(0).orEmpty())
            COMMAND_UPDATE_WALLET_APPEARANCE -> root.updateWalletAppearance(args?.getString(0).orEmpty())
        }
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        directEventConstants(
            "onReady",
            "onProcessing",
            "onResult",
            "onHeightChange",
            "onAvailability",
            "onOrderUpdated",
        )

    companion object {
        const val REACT_CLASS = "XMoneyPaymentElement"
        const val COMMAND_PREPARE = 1
        const val COMMAND_CONFIRM = 2
        const val COMMAND_UPDATE_ORDER = 3
        const val COMMAND_UPDATE_APPEARANCE = 4
        const val COMMAND_UPDATE_LOCALE = 5
        const val COMMAND_UPDATE_STYLE = 6
        const val COMMAND_UPDATE_WALLET_APPEARANCE = 7
    }
}
