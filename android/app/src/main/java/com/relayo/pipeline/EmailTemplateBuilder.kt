package com.relayo.pipeline

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object EmailTemplateBuilder {

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss z", Locale.US).apply {
        timeZone = TimeZone.getDefault()
    }

    fun buildSubject(sender: String, receiver: String): String =
        "SMS from $sender to $receiver"

    fun buildBody(sender: String, receiver: String, timestamp: Long, body: String): String {
        val timeStr = dateFormat.format(Date(timestamp))
        return "Timestamp: $timeStr\nSender: $sender\nReceiver: $receiver\n\nMessage:\n$body"
    }
}
