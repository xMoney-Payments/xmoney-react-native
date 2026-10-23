package com.xmoney.reactnative

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * One in-flight order update per surface. A newer [start] cancels the previous
 * job. Apply Compose state only while [isCurrent] is true for that generation.
 */
internal class OrderUpdateLaunch {
    private var job: Job? = null
    private var generation = 0

    fun start(scope: CoroutineScope, block: suspend (generation: Int) -> Unit) {
        job?.cancel()
        val current = ++generation
        job = scope.launch {
            block(current)
        }
    }

    fun isCurrent(generation: Int): Boolean = generation == this.generation

    fun cancel() {
        generation += 1
        job?.cancel()
        job = null
    }
}
