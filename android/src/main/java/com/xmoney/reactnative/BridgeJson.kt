package com.xmoney.reactnative

import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.uimanager.common.ViewUtil
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.RCTEventEmitter
import org.json.JSONArray
import org.json.JSONObject

internal object BridgeJson {
    fun toMap(json: String): Map<String, Any?> {
        if (json.isBlank() || json == "null") return emptyMap()
        return JSONObject(json).toMap()
    }

    fun fromMap(map: Map<String, Any?>): String = mapToJson(map).toString()

    @Suppress("UNCHECKED_CAST")
    private fun JSONObject.toMap(): Map<String, Any?> {
        val map = hashMapOf<String, Any?>()
        keys().forEach { key ->
            map[key] = unwrap(get(key))
        }
        return map
    }

    private fun JSONArray.toList(): List<Any?> = (0 until length()).map { unwrap(get(it)) }

    private fun unwrap(value: Any?): Any? = when (value) {
        null, JSONObject.NULL -> null
        is JSONObject -> value.toMap()
        is JSONArray -> value.toList()
        else -> value
    }

    @Suppress("UNCHECKED_CAST")
    private fun mapToJson(map: Map<String, Any?>): JSONObject {
        val obj = JSONObject()
        map.forEach { (key, value) ->
            obj.put(key, wrap(value))
        }
        return obj
    }

    @Suppress("UNCHECKED_CAST")
    private fun wrap(value: Any?): Any = when (value) {
        null -> JSONObject.NULL
        is Map<*, *> -> mapToJson(value as Map<String, Any?>)
        is List<*> -> JSONArray(value.map { wrap(it) })
        else -> value
    }
}

/**
 * True for a view created by the Paper renderer. React Native gives Paper
 * views odd tags and Fabric views even tags, in every architecture mode.
 */
internal fun usesLegacyEventPath(viewTag: Int): Boolean =
    ViewUtil.getUIManagerType(viewTag) == UIManagerType.DEFAULT

internal fun View.emitNativeEvent(name: String, payload: WritableMap?) {
    val reactContext = context as? ReactContext ?: return
    if (id == View.NO_ID) return
    // A Paper view delivers events directly. The Paper frame dispatcher pauses
    // while a payment sheet is open, so `ready` would never reach JS. The choice
    // follows the view's renderer, not bridgeless mode: Fabric can run with the
    // bridge, and a Fabric view must go through the event dispatcher.
    if (usesLegacyEventPath(id)) {
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, name, payload)
        return
    }
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id) ?: return
    val surfaceId = UIManagerHelper.getSurfaceId(this)
    dispatcher.dispatchEvent(
        object : Event<Event<*>>(surfaceId, id) {
            override fun getEventName(): String = name
            override fun getEventData(): WritableMap = payload ?: Arguments.createMap()
        },
    )
}

internal fun directEventConstants(vararg names: String): MutableMap<String, Any> {
    val map = hashMapOf<String, Any>()
    names.forEach { name ->
        map[name] = mapOf("registrationName" to name)
    }
    return map
}
