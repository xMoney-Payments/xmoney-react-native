package com.xmoney.reactnative

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class PlatformPayButtonViewManager : SimpleViewManager<PlatformPayButtonView>() {
    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): PlatformPayButtonView =
        PlatformPayButtonView(reactContext)

    @ReactProp(name = "configuration")
    fun setConfiguration(view: PlatformPayButtonView, value: ReadableMap?) {
        view.setConfigurationMap(value)
    }

    @ReactProp(name = "appearance")
    fun setAppearance(view: PlatformPayButtonView, value: ReadableMap?) {
        view.setAppearanceMap(value)
    }

    @ReactProp(name = "disabled")
    fun setDisabled(view: PlatformPayButtonView, value: Boolean) {
        view.disabled = value
    }

    override fun getCommandsMap(): MutableMap<String, Int> = mutableMapOf(
        "prepare" to COMMAND_PREPARE,
        "updateOrder" to COMMAND_UPDATE_ORDER,
        "beginUpdateOrder" to COMMAND_BEGIN_UPDATE_ORDER,
        "resolveOrder" to COMMAND_RESOLVE_ORDER,
        "rejectOrder" to COMMAND_REJECT_ORDER,
        "updateAppearance" to COMMAND_UPDATE_APPEARANCE,
    )

    override fun receiveCommand(
        root: PlatformPayButtonView,
        commandId: String?,
        args: ReadableArray?,
    ) {
        when (commandId) {
            "prepare" -> root.prepare(args?.getString(0).orEmpty(), args?.getString(1).orEmpty())
            "updateOrder" -> root.updateOrder(
                args?.getString(0).orEmpty(),
                args?.getString(1).orEmpty(),
                args?.getString(2).orEmpty(),
            )
            "beginUpdateOrder" -> root.beginUpdateOrder(args?.getString(0).orEmpty())
            "resolveOrder" -> root.resolveOrder(
                args?.getString(0).orEmpty(),
                args?.getString(1).orEmpty(),
                args?.getString(2).orEmpty(),
            )
            "rejectOrder" -> root.rejectOrder(args?.getString(0).orEmpty())
            "updateAppearance" -> root.updateAppearance(args?.getString(0).orEmpty())
        }
    }

    override fun receiveCommand(
        root: PlatformPayButtonView,
        commandId: Int,
        args: ReadableArray?,
    ) {
        when (commandId) {
            COMMAND_PREPARE -> root.prepare(args?.getString(0).orEmpty(), args?.getString(1).orEmpty())
            COMMAND_UPDATE_ORDER -> root.updateOrder(
                args?.getString(0).orEmpty(),
                args?.getString(1).orEmpty(),
                args?.getString(2).orEmpty(),
            )
            COMMAND_BEGIN_UPDATE_ORDER -> root.beginUpdateOrder(args?.getString(0).orEmpty())
            COMMAND_RESOLVE_ORDER -> root.resolveOrder(
                args?.getString(0).orEmpty(),
                args?.getString(1).orEmpty(),
                args?.getString(2).orEmpty(),
            )
            COMMAND_REJECT_ORDER -> root.rejectOrder(args?.getString(0).orEmpty())
            COMMAND_UPDATE_APPEARANCE -> root.updateAppearance(args?.getString(0).orEmpty())
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
            "onUpdateFailed",
        )

    companion object {
        const val REACT_CLASS = "XMoneyPlatformPayButton"
        const val COMMAND_PREPARE = 1
        const val COMMAND_UPDATE_ORDER = 2
        const val COMMAND_UPDATE_APPEARANCE = 3
        const val COMMAND_BEGIN_UPDATE_ORDER = 4
        const val COMMAND_RESOLVE_ORDER = 5
        const val COMMAND_REJECT_ORDER = 6
    }
}
