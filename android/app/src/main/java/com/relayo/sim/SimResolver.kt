package com.relayo.sim

import android.annotation.SuppressLint
import android.content.Context
import android.telephony.SubscriptionManager

class SimResolver(private val context: Context) {

    private val simStore = SimStore(context)

    @SuppressLint("MissingPermission")
    fun resolveReceiverNumber(subscriptionId: Int): String {
        val manual = simStore.getManualNumber(subscriptionId)
        if (!manual.isNullOrBlank()) return manual

        return try {
            val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
            val info = subManager.getActiveSubscriptionInfo(subscriptionId)
            val msisdn = info?.number
            if (!msisdn.isNullOrBlank()) msisdn else "Unknown"
        } catch (_: Exception) {
            "Unknown"
        }
    }

    @SuppressLint("MissingPermission")
    fun getActiveSimInfoList(): List<SimInfo> {
        return try {
            val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
            val list = subManager.activeSubscriptionInfoList ?: return emptyList()
            list.map { info ->
                SimInfo(
                    slotIndex = info.simSlotIndex,
                    subscriptionId = info.subscriptionId,
                    carrierName = info.carrierName?.toString() ?: "",
                    detectedNumber = info.number ?: "",
                    manualNumber = simStore.getManualNumber(info.subscriptionId) ?: "",
                    iccId = info.iccId ?: "",
                    isActive = true
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }
}

data class SimInfo(
    val slotIndex: Int,
    val subscriptionId: Int,
    val carrierName: String,
    val detectedNumber: String,
    val manualNumber: String,
    val iccId: String,
    val isActive: Boolean
)
