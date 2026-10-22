package com.xmoney.reactnative

import com.xmoney.payments.model.OrderChecksum
import com.xmoney.payments.model.OrderPayload
import com.xmoney.payments.model.PaymentIntent
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.yield
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
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

    @Test
    fun resolveBeforeBeginCompletesTheGate() = runBlocking {
        val orders = PendingOrders()
        val intent = PaymentIntent(OrderPayload("p"), OrderChecksum("c"))
        orders.settle("early", intent)
        val gate = orders.gate("early")
        assertNotNull(gate)
        assertTrue(gate!!.isCompleted)
        assertEquals(intent, gate.await())
    }

    @Test
    fun rejectBeforeBeginCompletesTheGate() = runBlocking {
        val orders = PendingOrders()
        orders.settleRejected("early")
        val gate = orders.gate("early")
        assertNotNull(gate)
        assertTrue(gate!!.isCompleted)
        var rejected = false
        try {
            gate.await()
        } catch (_: OrderCreationRejected) {
            rejected = true
        }
        assertTrue(rejected)
    }

    @Test
    fun cancelAllCancelsWaitingGates() {
        val orders = PendingOrders()
        val gate = orders.gate("waiting")
        assertNotNull(gate)
        orders.cancelAll()
        assertTrue(gate!!.isCancelled)
        assertNotNull(orders.gate("next"))
    }

    @Test
    fun finishedIdsStayCappedAt32() {
        val orders = PendingOrders()
        repeat(33) { index ->
            val id = "id$index"
            assertNotNull(orders.gate(id))
            orders.close(id)
        }
        assertFalse(orders.isFinished("id0"))
        assertTrue(orders.isFinished("id1"))
        assertTrue(orders.isFinished("id32"))
        assertNull(orders.gate("id32"))
    }
}
