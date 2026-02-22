package com.relayo.smtp

data class SmtpConfig(
    val host: String,
    val port: Int,
    val username: String,
    val password: String,
    val fromEmail: String,
    val toEmail: String,
    val useSsl: Boolean,
    val useStartTls: Boolean
)
