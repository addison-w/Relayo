package com.relayo.smtp

import java.util.Properties
import javax.mail.AuthenticationFailedException
import javax.mail.MessagingException
import javax.mail.Session
import javax.mail.Transport
import javax.mail.internet.InternetAddress
import javax.mail.internet.MimeMessage
import javax.mail.Message as JavaMailMessage
import java.net.SocketTimeoutException

sealed class SmtpResult {
    object Success : SmtpResult()
    data class Failure(val errorCode: String, val message: String) : SmtpResult()
}

object SmtpSender {

    fun send(config: SmtpConfig, subject: String, body: String): SmtpResult {
        return try {
            val props = buildProperties(config)
            val session = Session.getInstance(props, object : javax.mail.Authenticator() {
                override fun getPasswordAuthentication() =
                    javax.mail.PasswordAuthentication(config.username, config.password)
            })
            val msg = MimeMessage(session).apply {
                setFrom(InternetAddress(config.fromEmail))
                setRecipient(JavaMailMessage.RecipientType.TO, InternetAddress(config.toEmail))
                setSubject(subject, "UTF-8")
                setText(body, "UTF-8")
            }
            Transport.send(msg)
            SmtpResult.Success
        } catch (e: AuthenticationFailedException) {
            SmtpResult.Failure("auth_failed", e.message ?: "Authentication failed")
        } catch (e: MessagingException) {
            val cause = e.cause
            when {
                cause is SocketTimeoutException -> SmtpResult.Failure("timeout", e.message ?: "Timeout")
                e.message?.contains("TLS") == true || e.message?.contains("SSL") == true ->
                    SmtpResult.Failure("tls_error", e.message ?: "TLS error")
                e.message?.contains("connect") == true || e.message?.contains("network") == true ->
                    SmtpResult.Failure("network_error", e.message ?: "Network error")
                else -> SmtpResult.Failure("unknown", e.message ?: "Unknown error")
            }
        } catch (e: Exception) {
            SmtpResult.Failure("unknown", e.message ?: "Unknown error")
        }
    }

    private fun buildProperties(config: SmtpConfig): Properties = Properties().apply {
        put("mail.smtp.host", config.host)
        put("mail.smtp.port", config.port.toString())
        put("mail.smtp.auth", "true")
        put("mail.smtp.connectiontimeout", "15000")
        put("mail.smtp.timeout", "15000")
        put("mail.smtp.writetimeout", "15000")
        if (config.useSsl) {
            put("mail.smtp.socketFactory.port", config.port.toString())
            put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory")
            put("mail.smtp.ssl.enable", "true")
        }
        if (config.useStartTls) {
            put("mail.smtp.starttls.enable", "true")
            put("mail.smtp.starttls.required", "true")
        }
    }
}
