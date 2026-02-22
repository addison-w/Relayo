package com.relayo.sim

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.util.concurrent.Executors

class SimModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "SimModule"

    private val executor = Executors.newSingleThreadExecutor()
    private val simResolver by lazy { SimResolver(reactContext) }
    private val simStore by lazy { SimStore(reactContext) }

    @ReactMethod
    fun getSimInfo(promise: Promise) {
        executor.execute {
            try {
                val list = simResolver.getActiveSimInfoList()
                val array = WritableNativeArray()
                for (info in list) {
                    val map = WritableNativeMap().apply {
                        putInt("slotIndex", info.slotIndex)
                        putInt("subscriptionId", info.subscriptionId)
                        putString("carrierName", info.carrierName)
                        putString("detectedNumber", info.detectedNumber)
                        putString("manualNumber", info.manualNumber)
                        putString("iccId", info.iccId)
                        putBoolean("isActive", info.isActive)
                    }
                    array.pushMap(map)
                }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("SIM_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun setManualNumber(subId: Int, number: String, promise: Promise) {
        executor.execute {
            try {
                simStore.setManualNumber(subId, number)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SET_ERROR", e.message)
            }
        }
    }
}
