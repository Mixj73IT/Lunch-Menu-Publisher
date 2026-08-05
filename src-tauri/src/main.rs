#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use base64::{engine::general_purpose, Engine as _};
use dotenv::dotenv;
use lettre::message::{Attachment, Message, MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{SmtpTransport, Transport};

/// Resolve SMTP settings. Frontend-supplied values (from the Settings UI)
/// take precedence; .env values are the fallback.
fn resolve_smtp(
    smtp_host: Option<String>,
    smtp_port: Option<u16>,
    smtp_user: Option<String>,
    smtp_password: Option<String>,
) -> Result<(String, u16, String, String), String> {
    dotenv().ok();

    let email_user = match smtp_user {
        Some(u) if !u.trim().is_empty() => u,
        _ => std::env::var("EMAIL_USER").map_err(|_| "EMAIL_USER not set in .env".to_string())?,
    };
    let email_password = match smtp_password {
        Some(p) if !p.trim().is_empty() => p,
        _ => std::env::var("EMAIL_PASSWORD")
            .map_err(|_| "EMAIL_PASSWORD not set in .env".to_string())?,
    };
    let smtp_host = match smtp_host {
        Some(h) if !h.trim().is_empty() => h,
        _ => std::env::var("SMTP_HOST").map_err(|_| "SMTP_HOST not set in .env".to_string())?,
    };
    let smtp_port = match smtp_port {
        Some(p) if p > 0 => p,
        _ => std::env::var("SMTP_PORT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(465),
    };

    Ok((smtp_host, smtp_port, email_user, email_password))
}

/// Build a transport from already-resolved credentials.
fn build_mailer_from(host: String, port: u16, user: String, password: String) -> Result<SmtpTransport, String> {
    let creds = Credentials::new(user, password);

    let tls_params = TlsParameters::builder(host.clone())
        .build()
        .map_err(|e| format!("Failed to build TLS parameters: {}", e))?;

    // Port 465 = implicit TLS (Tls::Wrapper); 587/25 = STARTTLS
    // (Tls::Required). Hard-coding one mode breaks the other case.
    let tls_mode = if port == 465 {
        Tls::Wrapper(tls_params)
    } else {
        Tls::Required(tls_params)
    };

    // builder_dangerous skips MX lookup: we connect to the exact host the user
    // configured rather than whatever the MX record resolves to.
    let mailer = SmtpTransport::builder_dangerous(host.as_str())
        .port(port)
        .credentials(creds)
        .tls(tls_mode)
        .build();

    Ok(mailer)
}

/// Resolve SMTP settings and build a transport. Returns the transport and the
/// resolved From address user so callers never need a second, .env-only lookup.
fn build_mailer(
    smtp_host: Option<String>,
    smtp_port: Option<u16>,
    smtp_user: Option<String>,
    smtp_password: Option<String>,
) -> Result<(SmtpTransport, String), String> {
    let (host, port, user, password) =
        resolve_smtp(smtp_host, smtp_port, smtp_user, smtp_password)?;
    let mailer = build_mailer_from(host, port, user.clone(), password)?;
    Ok((mailer, user))
}

/// Validate the SMTP configuration by opening a real connection.
#[tauri::command]
async fn test_smtp_connection(
    host: String,
    port: u16,
    user: String,
    password: String,
) -> Result<String, String> {
    let mailer = build_mailer_from(host, port, user, password)?;

    // test_connection returns Ok(bool): false means the server rejected the
    // probe (e.g. NOOP/EHLO refused), which is a failed test, not a success.
    let connected = mailer
        .test_connection()
        .map_err(|e| format!("SMTP connection test failed: {:?}", e))?;
    if !connected {
        return Err("SMTP server did not accept the test connection.".to_string());
    }

    Ok("SMTP connection successful!".to_string())
}

#[tauri::command]
async fn send_menu_email(
    recipient: String,
    subject: String,
    menu_content: String,
    smtp_host: Option<String>,
    smtp_port: Option<u16>,
    smtp_user: Option<String>,
    smtp_password: Option<String>,
) -> Result<String, String> {
    let (mailer, email_user) = build_mailer(smtp_host, smtp_port, smtp_user, smtp_password)?;
    let email_from = format!("{} <{}>", email_user, email_user);

    let email = Message::builder()
        .from(
            email_from
                .parse()
                .map_err(|e| format!("Failed to parse from address: {}", e))?,
        )
        .to(recipient
            .parse()
            .map_err(|e| format!("Failed to parse to address: {}", e))?)
        .subject(subject.as_str())
        .multipart(
            MultiPart::mixed()
                .singlepart(SinglePart::plain(
                    "Please find the attached lunch menu.".to_string(),
                ))
                .singlepart(
                    Attachment::new("menu.txt".to_string())
                        .body(menu_content, "text/plain".parse().expect("valid MIME type")),
                ),
        )
        .map_err(|e| format!("Failed to build email: {}", e))?;

    match mailer.send(&email) {
        Ok(_) => Ok("Email sent successfully!".to_string()),
        Err(e) => Err(format!("Could not send email: {:?}", e)),
    }
}

#[tauri::command]
async fn send_pdf_email(
    recipient: String,
    subject: String,
    pdf_base64: String,
    smtp_host: Option<String>,
    smtp_port: Option<u16>,
    smtp_user: Option<String>,
    smtp_password: Option<String>,
) -> Result<String, String> {
    let (mailer, email_user) = build_mailer(smtp_host, smtp_port, smtp_user, smtp_password)?;
    let email_from = format!("{} <{}>", email_user, email_user);

    let pdf_bytes = general_purpose::STANDARD
        .decode(&pdf_base64)
        .map_err(|e| format!("Failed to decode base64 PDF: {}", e))?;

    let email = Message::builder()
        .from(
            email_from
                .parse()
                .map_err(|e| format!("Failed to parse from address: {}", e))?,
        )
        .to(recipient
            .parse()
            .map_err(|e| format!("Failed to parse to address: {}", e))?)
        .subject(subject.as_str())
        .multipart(
            MultiPart::mixed()
                .singlepart(SinglePart::plain(
                    "Please find the attached lunch menu PDF.".to_string(),
                ))
                .singlepart(Attachment::new("menu.pdf".to_string()).body(
                    pdf_bytes,
                    "application/pdf".parse().expect("valid MIME type"),
                )),
        )
        .map_err(|e| format!("Failed to build email: {}", e))?;

    match mailer.send(&email) {
        Ok(_) => Ok("PDF email sent successfully!".to_string()),
        Err(e) => Err(format!("Could not send email: {:?}", e)),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            send_menu_email,
            send_pdf_email,
            test_smtp_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
