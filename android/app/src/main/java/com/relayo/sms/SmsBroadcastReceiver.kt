package com.relayo.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import com.relayo.pipeline.SmsPipeline

class SmsBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val pdus = intent.extras?.get("pdus") as? Array<Any> ?: return
        val format = intent.extras?.getString("format")
        val subscriptionId = intent.extras?.getInt("subscription", -1) ?: -1

        val messages = SmsParser.parseMessages(pdus, format, subscriptionId)
        for (msg in messages) {
            SmsPipeline.process(
                context,
                msg.originatingAddress,
                msg.messageBody,
                msg.timestampMillis,
                msg.subscriptionId
            )
        }
    }
}
