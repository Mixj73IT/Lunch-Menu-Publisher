#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use lettre::message::{Attachment, Message, MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{SmtpTransport, Transport};
use dotenv::dotenv;

#[tauri::command]
async fn send_menu_email(
    recipient: String,
    subject: String,
    menu_content: String,
) -> Result<String, String> {
    dotenv().ok();

    let email_user = std::env::var("EMAIL_USER")
        .map_err(|_| "EMAIL_USER not set in .env".to_string())?;
    let email_password = std::env::var("EMAIL_PASSWORD")
        .map_err(|_| "EMAIL_PASSWORD not set in .env".to_string())?;
    let smtp_host = std::env::var("SMTP_HOST")
        .map_err(|_| "SMTP_HOST not set in .env".to_string())?;
    let smtp_port: u16 = std::env::var("SMTP_PORT")
        .map_err(|_| "SMTP_PORT not set in .env".to_string())?
        .parse()
        .map_err(|_| "SMTP_PORT is not a valid number".to_string())?;

    let email_from = format!("{} <{}>", email_user, email_user);

    let email = Message::builder()
        .from(email_from.parse().map_err(|e| format!("Failed to parse from address: {}", e))?)
        .to(recipient.parse().map_err(|e| format!("Failed to parse to address: {}", e))?)
        .subject(subject.as_str())
        .multipart(
            MultiPart::mixed()
                .singlepart(
                    SinglePart::plain("Please find the attached lunch menu.".to_string())
                )
                .singlepart(
                    Attachment::new("menu.txt".to_string())
                        .body(menu_content, "text/plain".parse().expect("valid MIME type"))
                )
        )
        .map_err(|e| format!("Failed to build email: {}", e))?;

    let creds = Credentials::new(email_user, email_password);

    let tls_params = TlsParameters::builder(smtp_host.clone())
        .build()
        .map_err(|e| format!("Failed to build TLS parameters: {}", e))?;

    let mailer = SmtpTransport::relay(smtp_host.as_str())
        .map_err(|e| format!("Failed to create SMTP relay: {}", e))?
        .port(smtp_port)
        .credentials(creds)
        .tls(Tls::Required(tls_params))
        .build();

    match mailer.send(&email) {
        Ok(_) => Ok("Email sent successfully!".to_string()),
        Err(e) => Err(format!("Could not send email: {:?}", e)),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![send_menu_email])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
