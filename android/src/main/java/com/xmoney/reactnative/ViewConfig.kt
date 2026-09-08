package com.xmoney.reactnative

import com.facebook.react.bridge.ReadableMap

@Suppress("UNCHECKED_CAST")
internal fun ReadableMap?.toStringKeyedMap(): Map<String, Any?>? {
    if (this == null) return null
    return toHashMap() as Map<String, Any?>
}
