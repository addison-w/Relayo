package com.relayo

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.relayo.permission.PermissionModule
import com.relayo.service.ServiceModule
import com.relayo.sim.SimModule
import com.relayo.smtp.SmtpModule
import com.relayo.log.LogModule

class RelayoPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(
            SmtpModule(reactContext),
            SimModule(reactContext),
            ServiceModule(reactContext),
            PermissionModule(reactContext),
            LogModule(reactContext)
        )

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
