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
            if (config.useSsl) {
                val transport = session.getTransport("smtps")
                transport.connect(config.host, config.port, config.username, config.password)
                transport.sendMessage(msg, msg.allRecipients)
                transport.close()
            } else {
                Transport.send(msg)
            }
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


    fun testAuth(config: SmtpConfig): SmtpResult {
        return try {
            val props = buildProperties(config)
            val session = Session.getInstance(props)
            val protocol = if (config.useSsl) "smtps" else "smtp"
            val transport = session.getTransport(protocol)
            transport.connect(config.host, config.port, config.username, config.password)
            transport.close()
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
        if (config.useSsl) {
            put("mail.smtps.host", config.host)
            put("mail.smtps.port", config.port.toString())
            put("mail.smtps.auth", "true")
            put("mail.smtps.connectiontimeout", "30000")
            put("mail.smtps.timeout", "30000")
            put("mail.smtps.writetimeout", "30000")
            put("mail.smtps.ssl.enable", "true")
            put("mail.smtps.ssl.trust", config.host)
        } else {
            put("mail.smtp.host", config.host)
            put("mail.smtp.port", config.port.toString())
            put("mail.smtp.auth", "true")
            put("mail.smtp.connectiontimeout", "30000")
            put("mail.smtp.timeout", "30000")
            put("mail.smtp.writetimeout", "30000")
            if (config.useStartTls) {
                put("mail.smtp.starttls.enable", "true")
                put("mail.smtp.starttls.required", "true")
            }
        }
    }
}