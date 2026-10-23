package com.xmoney.reactnative

import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.compose.LocalActivityResultRegistryOwner
import androidx.activity.setViewTreeOnBackPressedDispatcherOwner
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.xmoney.paymentelement.EmbeddedEvent
import com.xmoney.paymentelement.EmbeddedPaymentController
import com.xmoney.paymentelement.PaymentElement
import com.xmoney.paymentelement.rememberEmbeddedPayment
import com.xmoney.payments.config.AppearanceConfig
import com.xmoney.payments.config.PaymentConfig
import com.xmoney.payments.config.UserInterfaceStyle
import com.xmoney.payments.model.PaymentError
import com.xmoney.payments.model.PaymentIntent
import kotlinx.coroutines.CancellationException

class PaymentElementView(private val reactContext: ThemedReactContext) : FrameLayout(reactContext) {
    private data class Prepared(val config: PaymentConfig, val intent: PaymentIntent)

    private val composeView = ComposeView(reactContext)
    private var owners: ComposeTreeOwners? = null
    private var lastReportedHeight = -1.0
    private var contentInstalled = false
    private var prepared by mutableStateOf<Prepared?>(null)
    private var controllerRef: EmbeddedPaymentController? = null
    private val orders = PendingOrders()
    private val updates = OrderUpdateLaunch()
    private var boundConfiguration: Map<String, Any?>? = null
    private var didSendReady = false
    private var layoutScheduled = false

    var configuration: Map<String, Any?>? = null

    private var orderPayload: String = ""
    private var orderChecksum: String = ""

    init {
        clipChildren = false
        clipToPadding = false
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
        composeView.setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
        composeView.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ -> reportHeight() }
        addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
    }

    fun setConfigurationMap(value: ReadableMap?) {
        configuration = value.toStringKeyedMap()
    }

    fun prepare(orderPayload: String, orderChecksum: String) {
        val nextConfig = configuration
        val sameOrder = prepared != null &&
            orderPayload == this.orderPayload &&
            orderChecksum == this.orderChecksum &&
            nextConfig == boundConfiguration
        if (sameOrder) return
        this.orderPayload = orderPayload
        this.orderChecksum = orderChecksum
        this.boundConfiguration = nextConfig
        bind()
    }

    fun updateOrder(orderPayload: String, orderChecksum: String, requestId: String) {
        this.orderPayload = orderPayload
        this.orderChecksum = orderChecksum
        runUpdateOrder(requestId)
    }

    fun beginUpdateOrder(requestId: String) {
        runBeginUpdateOrder(requestId)
    }

    fun resolveOrder(orderPayload: String, orderChecksum: String, requestId: String) {
        orders.settle(requestId, BridgeConfigParser.parseIntent(orderPayload, orderChecksum))
    }

    fun rejectOrder(requestId: String) {
        orders.settleRejected(requestId)
    }

    fun updateAppearance(appearanceJson: String) {
        val map = BridgeJson.toMap(appearanceJson)
        controllerRef?.updateAppearance(AppearanceConfig.from(map))
        reportHeight()
    }

    fun updateLocale(locale: String) {
        controllerRef?.updateLocale(locale)
        reportHeight()
    }

    fun updateStyle(style: String) {
        controllerRef?.updateStyle(UserInterfaceStyle.from(style.ifBlank { "automatic" }))
        reportHeight()
    }

    fun updateWalletAppearance(appearanceJson: String) {
        val map = BridgeJson.toMap(appearanceJson)
        @Suppress("UNCHECKED_CAST")
        val google = map["googlePay"] as? Map<String, Any?>
        controllerRef?.updateWalletAppearance(
            BridgeConfigParser.parseWalletAppearance(google ?: map),
        )
        reportHeight()
    }

    fun confirm() {
        UiThreadUtil.runOnUiThread {
            controllerRef?.confirm()
        }
    }

    // React Native parents drop requestLayout, so Compose content would keep
    // the size it had before the form existed.
    override fun requestLayout() {
        super.requestLayout()
        if (layoutScheduled) return
        layoutScheduled = true
        post {
            layoutScheduled = false
            // The screen can close before this runs. Measuring a detached
            // ComposeView throws "Cannot locate windowRecomposer".
            if (!isAttachedToWindow || !composeView.isAttachedToWindow) return@post
            composeView.measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED),
            )
            composeView.layout(0, 0, composeView.measuredWidth, composeView.measuredHeight)
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        val tree = ComposeTreeOwners()
        owners = tree
        tree.attachTo(composeView)
        (reactContext.currentActivity as? ComponentActivity)?.let { activity ->
            composeView.setViewTreeOnBackPressedDispatcherOwner(activity)
        }
        installContent()
        if (orderPayload.isNotEmpty() || orderChecksum.isNotEmpty()) {
            bind()
        }
    }

    override fun onDetachedFromWindow() {
        updates.cancel()
        orders.cancelAll()
        owners?.detach()
        owners = null
        contentInstalled = false
        controllerRef = null
        super.onDetachedFromWindow()
    }

    private fun installContent() {
        val activity = reactContext.currentActivity as? FragmentActivity ?: return
        if (contentInstalled) return
        contentInstalled = true
        composeView.setContent {
            val current = prepared ?: return@setContent
            CompositionLocalProvider(
                LocalContext provides activity,
                LocalLifecycleOwner provides (owners ?: activity),
                LocalActivityResultRegistryOwner provides activity,
            ) {
                val controller = rememberEmbeddedPayment(current.config) { result ->
                    emitNativeEvent(
                        "onResult",
                        Arguments.createMap().apply {
                            putString("resultJson", BridgeJson.fromMap(BridgeResults.resultToMap(result)))
                        },
                    )
                }
                val isOrderConsumed = controller.isOrderConsumed
                val isInteractionEnabled = controller.isInteractionEnabled
                SideEffect {
                    controllerRef = controller
                    if (didSendReady) {
                        emitAvailability(
                            isOrderConsumed = isOrderConsumed,
                            isInteractionEnabled = isInteractionEnabled,
                        )
                    }
                }
                PaymentElement(
                    controller = controller,
                    intent = current.intent,
                    modifier = Modifier
                        .fillMaxWidth()
                        .wrapContentHeight(unbounded = true)
                        .onSizeChanged { size ->
                            if (size.height > 0) {
                                reportHeightPx(size.height)
                            }
                        },
                    onEvent = { event ->
                        when (event) {
                            EmbeddedEvent.Ready -> {
                                didSendReady = true
                                emitNativeEvent("onReady", Arguments.createMap())
                                reportHeight()
                                emitAvailability(
                                    isOrderConsumed = isOrderConsumed,
                                    isInteractionEnabled = isInteractionEnabled,
                                )
                            }
                            is EmbeddedEvent.Processing -> {
                                emitNativeEvent(
                                    "onProcessing",
                                    Arguments.createMap().apply {
                                        putBoolean("isProcessing", event.isProcessing)
                                    },
                                )
                            }
                            is EmbeddedEvent.UpdateFailed -> emitUpdateFailed(event.error)
                        }
                    },
                )
            }
        }
    }

    private fun bind() {
        if (!isAttachedToWindow) return
        val (nativeConfig, intent) = try {
            BridgeConfigParser.parse(configuration.orEmpty(), orderPayload, orderChecksum)
        } catch (error: Exception) {
            val mapped = nativeError(error)
            emitFailed(mapped.first, mapped.second)
            return
        }
        prepared = Prepared(nativeConfig, intent)
        installContent()
    }

    private fun runUpdateOrder(requestId: String) {
        val intent = try {
            BridgeConfigParser.parseIntent(orderPayload, orderChecksum)
        } catch (error: Exception) {
            val mapped = nativeError(error)
            emitFailed(mapped.first, mapped.second)
            emitOrderUpdated(requestId, false, mapped.first)
            return
        }
        // Prop-driven updates go through the Compose host so it can defer a
        // change during a charge and clear a stale-order lock.
        if (requestId.isEmpty()) {
            val current = prepared
            if (current != null) {
                prepared = current.copy(intent = intent)
            }
            return
        }
        val controller = controllerRef
        if (controller == null) {
            emitOrderUpdated(requestId, false, "NOT_INITIALIZED")
            return
        }
        val activity = reactContext.currentActivity as? FragmentActivity
        if (activity == null) {
            emitOrderUpdated(requestId, false, "NOT_INITIALIZED")
            return
        }
        updates.start(activity.lifecycleScope) { generation ->
            try {
                controller.updateOrder(intent)
                if (!updates.isCurrent(generation)) {
                    emitOrderUpdated(requestId, false, "SUPERSEDED_UPDATE_ORDER")
                    return@start
                }
                prepared = prepared?.copy(intent = intent)
                emitOrderUpdated(requestId, true, null)
            } catch (_: CancellationException) {
                emitOrderUpdated(requestId, false, "SUPERSEDED_UPDATE_ORDER")
            } catch (error: Exception) {
                val mapped = nativeError(error)
                reportLoadFailureIfNeeded(mapped.first, mapped.second)
                emitOrderUpdated(requestId, false, mapped.first)
            }
        }
    }

    private fun runBeginUpdateOrder(requestId: String) {
        if (orders.isFinished(requestId)) {
            emitOrderUpdated(requestId, false, "SUPERSEDED_UPDATE_ORDER")
            return
        }
        val deferred = orders.gate(requestId)
        val controller = controllerRef
        val activity = reactContext.currentActivity as? FragmentActivity
        if (deferred == null || controller == null || activity == null) {
            orders.close(requestId)
            emitOrderUpdated(requestId, false, "NOT_INITIALIZED")
            return
        }
        updates.start(activity.lifecycleScope) { generation ->
            try {
                val bound = controller.updateOrder(createOrder = {
                    emitAvailability(
                        isOrderConsumed = controller.isOrderConsumed,
                        isInteractionEnabled = controller.isInteractionEnabled,
                    )
                    deferred.await()
                })
                if (!updates.isCurrent(generation)) {
                    emitOrderUpdated(requestId, false, "SUPERSEDED_UPDATE_ORDER")
                    return@start
                }
                prepared = prepared?.copy(intent = bound)
                orderPayload = bound.orderPayload
                orderChecksum = bound.orderChecksum
                emitAvailability(
                    isOrderConsumed = controller.isOrderConsumed,
                    isInteractionEnabled = controller.isInteractionEnabled,
                )
                emitOrderUpdated(requestId, true, null)
            } catch (_: OrderCreationRejected) {
                emitOrderUpdated(requestId, false, "ORDER_CREATION_FAILED")
            } catch (_: CancellationException) {
                emitOrderUpdated(requestId, false, "SUPERSEDED_UPDATE_ORDER")
            } catch (error: Exception) {
                val mapped = nativeError(error)
                reportLoadFailureIfNeeded(mapped.first, mapped.second)
                emitOrderUpdated(requestId, false, mapped.first)
            } finally {
                orders.close(requestId)
            }
        }
    }

    private fun reportLoadFailureIfNeeded(code: String, message: String) {
        if (didSendReady) return
        emitFailed(code, message)
    }

    private fun emitUpdateFailed(error: PaymentError) {
        val mapped = nativeError(error)
        emitNativeEvent(
            "onUpdateFailed",
            Arguments.createMap().apply {
                putString("code", mapped.first)
                putString("message", mapped.second)
            },
        )
    }

    private fun emitOrderUpdated(requestId: String, success: Boolean, error: String?) {
        if (requestId.isEmpty()) return
        emitNativeEvent(
            "onOrderUpdated",
            Arguments.createMap().apply {
                putString("requestId", requestId)
                putBoolean("success", success)
                if (error != null) putString("error", error)
            },
        )
    }

    private fun emitFailed(code: String, message: String) {
        emitNativeEvent(
            "onResult",
            Arguments.createMap().apply {
                putString("resultJson", BridgeJson.fromMap(BridgeResults.failedMap(code, message)))
            },
        )
    }

    private fun emitAvailability(
        isOrderConsumed: Boolean,
        isInteractionEnabled: Boolean,
    ) {
        // The form is still showing its loader until ready.
        if (!didSendReady) return
        emitNativeEvent(
            "onAvailability",
            Arguments.createMap().apply {
                putBoolean("isOrderConsumed", isOrderConsumed)
                putBoolean("isInteractionEnabled", isInteractionEnabled)
            },
        )
    }

    private fun reportHeight() {
        val px = composeView.height.takeIf { it > 0 } ?: return
        reportHeightPx(px)
    }

    private fun reportHeightPx(px: Int) {
        val dp = px / resources.displayMetrics.density.toDouble()
        if (kotlin.math.abs(dp - lastReportedHeight) <= 1.0) return
        lastReportedHeight = dp
        emitNativeEvent(
            "onHeightChange",
            Arguments.createMap().apply { putDouble("height", dp) },
        )
    }
}

private fun nativeError(error: Throwable): Pair<String, String> = when (error) {
    is PaymentError.PaymentInProgress -> "PAYMENT_IN_PROGRESS" to error.merchantMessage()
    is PaymentError -> error.code to error.merchantMessage()
    else -> "PRESENT_ERROR" to "Failed to present"
}
