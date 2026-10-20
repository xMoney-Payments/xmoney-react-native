package com.xmoney.reactnative

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.yield
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderUpdateLaunchTest {
    @Test
    fun newerStartReplacesTheCurrentGeneration() = runBlocking {
        val updates = OrderUpdateLaunch()
        var first = 0
        updates.start(this) { generation ->
            first = generation
        }
        yield()
        updates.start(this) { }
        yield()
        assertFalse(updates.isCurrent(first))
        assertTrue(updates.isCurrent(first + 1))
    }

    @Test
    fun cancelDropsThePreviousJob() = runBlocking {
        val updates = OrderUpdateLaunch()
        val started = CompletableDeferred<Int>()
        val release = CompletableDeferred<Unit>()
        var applied = false
        updates.start(this) { generation ->
            started.complete(generation)
            release.await()
            applied = updates.isCurrent(generation)
        }
        val generation = started.await()
        updates.cancel()
        release.complete(Unit)
        yield()
        assertFalse(applied)
        assertFalse(updates.isCurrent(generation))
    }
}

class PendingOrdersTest {
    @Test
    fun finishedIdIsNotAMissingGate() {
        val orders = PendingOrders()
        assertFalse(orders.isFinished("a"))
        assertNotNull(orders.gate("a"))
        orders.close("a")
        assertTrue(orders.isFinished("a"))
        assertNull(orders.gate("a"))
        assertFalse(orders.isFinished("b"))
        assertFalse(orders.isFinished(""))
    }
}
