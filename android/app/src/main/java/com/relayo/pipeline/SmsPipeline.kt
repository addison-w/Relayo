package com.relayo.pipeline

import android.content.Context
import com.relayo.db.OutboxEntity
import com.relayo.db.RelayoDatabase
import com.relayo.sim.SimResolver
import com.relayo.smtp.SmtpConfigStore
import com.relayo.smtp.SmtpResult
import com.relayo.smtp.SmtpSender
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.security.MessageDigest

object SmsPipeline {

    private val scope = CoroutineScope(Dispatchers.IO)

    fun process(
        context: Context,
        senderNumber: String,
        messageBody: String,
        receivedAt: Long,
        subscriptionId: Int
    ) {
        scope.launch {
            processAsync(context, senderNumber, messageBody, receivedAt, subscriptionId)
        }
    }

    private suspend fun processAsync(
        context: Context,
        senderNumber: String,
        messageBody: String,
        receivedAt: Long,
        subscriptionId: Int
    ) {
        val simResolver = SimResolver(context)
        val receiverNumber = simResolver.resolveReceiverNumber(subscriptionId)
        val fingerprint = buildFingerprint(senderNumber, receiverNumber, receivedAt, messageBody)

        val subject = EmailTemplateBuilder.buildSubject(senderNumber, receiverNumber)
        val body = EmailTemplateBuilder.buildBody(senderNumber, receiverNumber, receivedAt, messageBody)

        val smtpConfig = SmtpConfigStore(context).load()
        if (smtpConfig != null) {
            val result = SmtpSender.send(smtpConfig, subject, body)
            if (result is SmtpResult.Success) return
        }

        val db = RelayoDatabase.getInstance(context)
        val entity = OutboxEntity(
            fingerprint = fingerprint,
            senderNumber = senderNumber,
            receiverNumberResolved = receiverNumber,
            messageBody = messageBody,
            receivedAt = receivedAt,
            status = "pending"
        )
        db.outboxDao().insert(entity)
    }

    private fun buildFingerprint(sender: String, receiver: String, receivedAt: Long, body: String): String {
        val input = "$sender$receiver$receivedAt$body"
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(input.toByteArray(Charsets.UTF_8))
        return hash.joinToString("") { "%02x".format(it) }
    }
}
