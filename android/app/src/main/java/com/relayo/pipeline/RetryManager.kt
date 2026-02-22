package com.relayo.pipeline

import android.content.Context
import com.relayo.db.RelayoDatabase
import com.relayo.smtp.SmtpConfigStore
import com.relayo.smtp.SmtpResult
import com.relayo.smtp.SmtpSender
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class RetryManager private constructor(private val context: Context) {

    private val backoffDelays = longArrayOf(60, 300, 900, 3600, 10800, 21600)
    private val maxDelay = 86400L
    private val scope = CoroutineScope(Dispatchers.IO)

    fun triggerProcessOutbox() {
        scope.launch { processOutbox() }
    }

    suspend fun processOutbox() {
        val db = RelayoDatabase.getInstance(context)
        val dao = db.outboxDao()
        val smtpStore = SmtpConfigStore(context)
        val config = smtpStore.load() ?: return
        val now = System.currentTimeMillis()

        val pending = dao.getPending()
        val retryItems = dao.getNextRetryItems(now)
        val items = pending + retryItems

        for (item in items) {
            dao.markSending(item.id)
            val subject = EmailTemplateBuilder.buildSubject(item.senderNumber, item.receiverNumberResolved)
            val body = EmailTemplateBuilder.buildBody(
                item.senderNumber, item.receiverNumberResolved, item.receivedAt, item.messageBody
            )
            when (val result = SmtpSender.send(config, subject, body)) {
                is SmtpResult.Success -> {
                    dao.markSent(item.id)
                }
                is SmtpResult.Failure -> {
                    val nextRetryDelay = nextDelay(item.retryCount)
                    val nextRetryAt = System.currentTimeMillis() + nextRetryDelay * 1000L
                    dao.markFailed(
                        item.id,
                        result.errorCode,
                        result.message.take(200),
                        nextRetryAt
                    )
                }
            }
        }
    }

    private fun nextDelay(retryCount: Int): Long {
        val idx = retryCount.coerceIn(0, backoffDelays.size - 1)
        return backoffDelays[idx].coerceAtMost(maxDelay)
    }

    companion object {
        @Volatile
        private var INSTANCE: RetryManager? = null

        fun getInstance(context: Context): RetryManager =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: RetryManager(context.applicationContext).also { INSTANCE = it }
            }
    }
}
