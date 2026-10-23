package com.xmoney.reactnative

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EventPathTest {
    @Test
    fun paperViewTagsUseTheDirectEmitter() {
        assertTrue(usesLegacyEventPath(3))
        assertTrue(usesLegacyEventPath(11))
        assertTrue(usesLegacyEventPath(1001))
    }

    @Test
    fun fabricViewTagsUseTheEventDispatcher() {
        assertFalse(usesLegacyEventPath(2))
        assertFalse(usesLegacyEventPath(10))
        assertFalse(usesLegacyEventPath(1002))
    }
}
