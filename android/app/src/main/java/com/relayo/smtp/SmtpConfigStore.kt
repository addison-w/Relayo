package com.relayo.smtp

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SmtpConfigStore(private val context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("smtp_prefs", Context.MODE_PRIVATE)
    private val keyAlias = "relayo_smtp_key"
    private val keystoreProvider = "AndroidKeyStore"
    private val transformation = "AES/GCM/NoPadding"

    fun save(config: SmtpConfig) {
        val encrypted = encryptPassword(config.password)
        prefs.edit().apply {
            putString("host", config.host)
            putInt("port", config.port)
            putString("username", config.username)
            putString("password_enc", encrypted.first)
            putString("password_iv", encrypted.second)
            putString("from_email", config.fromEmail)
            putString("to_email", config.toEmail)
            putBoolean("use_ssl", config.useSsl)
            putBoolean("use_starttls", config.useStartTls)
            apply()
        }
    }

    fun load(): SmtpConfig? {
        val host = prefs.getString("host", null) ?: return null
        val port = prefs.getInt("port", 465)
        val username = prefs.getString("username", null) ?: return null
        val encPassword = prefs.getString("password_enc", null) ?: return null
        val iv = prefs.getString("password_iv", null) ?: return null
        val fromEmail = prefs.getString("from_email", null) ?: return null
        val toEmail = prefs.getString("to_email", null) ?: return null
        val useSsl = prefs.getBoolean("use_ssl", true)
        val useStartTls = prefs.getBoolean("use_starttls", false)
        val password = decryptPassword(encPassword, iv)
        return SmtpConfig(host, port, username, password, fromEmail, toEmail, useSsl, useStartTls)
    }

    private fun getOrCreateKey(): SecretKey {
        val keystore = KeyStore.getInstance(keystoreProvider).also { it.load(null) }
        if (keystore.containsAlias(keyAlias)) {
            return (keystore.getEntry(keyAlias, null) as KeyStore.SecretKeyEntry).secretKey
        }
        val keyGen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, keystoreProvider)
        keyGen.init(
            KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return keyGen.generateKey()
    }

    private fun encryptPassword(plaintext: String): Pair<String, String> {
        val cipher = Cipher.getInstance(transformation)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val iv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP)
        val encrypted = Base64.encodeToString(cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
        return Pair(encrypted, iv)
    }

    private fun decryptPassword(encryptedBase64: String, ivBase64: String): String {
        val cipher = Cipher.getInstance(transformation)
        val iv = Base64.decode(ivBase64, Base64.NO_WRAP)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
        val decrypted = cipher.doFinal(Base64.decode(encryptedBase64, Base64.NO_WRAP))
        return String(decrypted, Charsets.UTF_8)
    }
}
