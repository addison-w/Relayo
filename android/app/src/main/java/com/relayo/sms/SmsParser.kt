package com.relayo.sms

import android.telephony.SmsMessage

data class ParsedSms(
    val originatingAddress: String,
    val messageBody: String,
    val timestampMillis: Long,
    val subscriptionId: Int
)

object SmsParser {

    fun parseMessages(pdus: Array<Any>, format: String?, subscriptionId: Int): List<ParsedSms> {
        val messages = pdus.map { pdu ->
            if (format != null) {
                SmsMessage.createFromPdu(pdu as ByteArray, format)
            } else {
                @Suppress("DEPRECATION")
                SmsMessage.createFromPdu(pdu as ByteArray)
            }
        }

        if (messages.isEmpty()) return emptyList()

        val address = messages.first().originatingAddress ?: ""
        val body = messages.joinToString("") { it.messageBody ?: "" }
        val timestamp = messages.first().timestampMillis

        return listOf(ParsedSms(address, body, timestamp, subscriptionId))
    }
}
