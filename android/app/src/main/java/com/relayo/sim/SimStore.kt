package com.relayo.sim

import android.content.Context

class SimStore(context: Context) {

    private val prefs = context.getSharedPreferences("sim_prefs", Context.MODE_PRIVATE)

    fun getManualNumber(subscriptionId: Int): String? =
        prefs.getString("manual_$subscriptionId", null)

    fun setManualNumber(subscriptionId: Int, number: String) {
        prefs.edit().putString("manual_$subscriptionId", number).apply()
    }
}
