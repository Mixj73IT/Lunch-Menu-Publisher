#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use base64::{engine::general_purpose, Engine as _};
use dotenvy::dotenv;
use lettre::message::{Attachment, Message, MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{SmtpTransport, Transport};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

// ---------------------------------------------------------------------------
// SMTP helpers
// ---------------------------------------------------------------------------

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
fn build_mailer_from(host: &str, port: u16, user: String, password: String) -> Result<SmtpTransport, String> {
    let creds = Credentials::new(user, password);

    let tls_params = TlsParameters::builder(host.to_owned())
        .build()
        .map_err(|e| format!("Failed to build TLS parameters: {e}"))?;

    // Port 465 = implicit TLS (Tls::Wrapper); 587/25 = STARTTLS
    // (Tls::Required). Hard-coding one mode breaks the other case.
    let tls_mode = if port == 465 {
        Tls::Wrapper(tls_params)
    } else {
        Tls::Required(tls_params)
    };

    // builder_dangerous skips MX lookup: we connect to the exact host the user
    // configured rather than whatever the MX record resolves to.
    let mailer = SmtpTransport::builder_dangerous(host)
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
    let mailer = build_mailer_from(host.as_str(), port, user.clone(), password)?;
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
    let mailer = build_mailer_from(host.as_str(), port, user, password)?;

    // test_connection returns Ok(bool): false means the server rejected the
    // probe (e.g. NOOP/EHLO refused), which is a failed test, not a success.
    let connected = mailer
        .test_connection()
        .map_err(|e| format!("SMTP connection test failed: {e:?}"))?;
    if !connected {
        return Err("SMTP server did not accept the test connection.".to_string());
    }

    Ok("SMTP connection successful!".to_string())
}

/// Send the Publish Month email: a short body, the menu.txt attachment, and
/// (only when a real PDF was generated) the menu.pdf attachment.
///
/// The flat parameter list mirrors the frontend's invoke payload one-to-one;
/// grouping into a struct would require a serde derive plus an IPC contract
/// change on the JS side, so the pedantic `too_many_arguments` lint is allowed.
#[allow(clippy::too_many_arguments)]
#[tauri::command(rename_all = "snake_case")]
async fn send_publish_email(
    recipient: String,
    subject: String,
    body: String,
    txt_content: String,
    txt_attachment_name: String,
    pdf_base64: Option<String>,
    pdf_attachment_name: Option<String>,
    smtp_host: Option<String>,
    smtp_port: Option<u16>,
    smtp_user: Option<String>,
    smtp_password: Option<String>,
) -> Result<String, String> {
    let (mailer, email_user) = build_mailer(smtp_host, smtp_port, smtp_user, smtp_password)?;
    let email_from = email_user;

    let mut multipart = MultiPart::mixed().singlepart(SinglePart::plain(body));

    // The TXT attachment is always present.
    let txt_attachment = Attachment::new(txt_attachment_name).body(
        txt_content.into_bytes(),
        "text/plain".parse().map_err(|e| format!("Invalid MIME type: {e}"))?,
    );
    multipart = multipart.singlepart(txt_attachment);

    // The PDF attachment is only added when the frontend actually produced a PDF.
    if let (Some(b64), Some(name)) = (pdf_base64, pdf_attachment_name) {
        if !b64.trim().is_empty() {
            let pdf_bytes = general_purpose::STANDARD
                .decode(&b64)
                .map_err(|e| format!("Failed to decode base64 PDF: {e}"))?;
            let pdf_attachment = Attachment::new(name).body(
                pdf_bytes,
                "application/pdf"
                    .parse()
                    .map_err(|e| format!("Invalid MIME type: {e}"))?,
            );
            multipart = multipart.singlepart(pdf_attachment);
        }
    }

    let email = Message::builder()
        .from(
            email_from
                .parse()
                .map_err(|e| format!("Failed to parse from address: {e}"))?,
        )
        .to(recipient
            .parse()
            .map_err(|e| format!("Failed to parse to address: {e}"))?)
        .subject(subject.as_str())
        .multipart(multipart)
        .map_err(|e| format!("Failed to build email: {e}"))?;

    match mailer.send(&email) {
        Ok(_) => Ok("Email sent successfully!".to_string()),
        Err(e) => Err(format!("Could not send email: {e:?}")),
    }
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

/// Unique-ish suffix for temporary files (pid + monotonic-ish time).
fn temp_suffix() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_nanos());
    format!("{}-{}", std::process::id(), nanos)
}

/// Atomically write `bytes` to `dest`:
/// 1. write a unique temp file in the same directory,
/// 2. fsync it so the data is on disk,
/// 3. rename it over `dest` (an atomic replace on the same volume).
///
/// Downstream consumers (e.g. other local projects watching menu.json) never
/// observe a partially-written file. On any failure the temp file is removed.
fn atomic_write_bytes(dest: &Path, bytes: &[u8]) -> Result<(), String> {
    let dir = dest
        .parent()
        .ok_or_else(|| format!("Destination has no parent directory: {}", dest.display()))?;

    let file_name = dest
        .file_name()
        .ok_or_else(|| format!("Invalid destination file name: {}", dest.display()))?
        .to_string_lossy()
        .to_string();

    let tmp_path = dir.join(format!(".{file_name}.tmp-{}", temp_suffix()));

    let result = (|| -> Result<(), String> {
        let mut file = fs::File::create(&tmp_path)
            .map_err(|e| format!("Failed to create temporary file: {e}"))?;
        file.write_all(bytes)
            .map_err(|e| format!("Failed to write temporary file: {e}"))?;
        file.sync_all()
            .map_err(|e| format!("Failed to flush temporary file: {e}"))?;
        // Atomic replace: rename replaces `dest` on Windows and Unix.
        fs::rename(&tmp_path, dest)
            .map_err(|e| format!("Failed to replace {}: {e}", dest.display()))?;
        Ok(())
    })();

    if result.is_err() {
        // Best-effort cleanup of the temp file on failure.
        let _ = fs::remove_file(&tmp_path);
    }

    result
}

/// Resolve the directory to write publish outputs into. An empty directory
/// falls back to the user's Downloads folder.
fn resolve_output_dir(app: &tauri::AppHandle, directory: &str) -> Result<PathBuf, String> {
    use tauri::Manager;

    if !directory.trim().is_empty() {
        return Ok(PathBuf::from(directory.trim()));
    }

    app.path()
        .download_dir()
        .map_err(|e| format!("Could not resolve the Downloads folder: {e}"))
}

/// Core menu.json write, kept sync so it is unit-testable.
fn write_menu_json_to_dir(directory: &str, contents: &str) -> Result<PathBuf, String> {
    let dir = PathBuf::from(directory.trim());
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create folder {}: {e}", dir.display()))?;

    let dest = dir.join("menu.json");
    atomic_write_bytes(&dest, contents.as_bytes())?;
    Ok(dest)
}

/// Write `menu.json` into the configured destination folder.
/// The file is written atomically so a sync service (Google Drive for Desktop)
/// and downstream projects never observe partial JSON.
#[tauri::command]
async fn write_menu_json(directory: String, contents: String) -> Result<String, String> {
    let dest = write_menu_json_to_dir(&directory, &contents)?;
    Ok(dest.to_string_lossy().to_string())
}

/// Core write-output-file logic, kept separate from the command so it is
/// unit-testable without a Tauri app handle.
fn write_output_file_to_dir(
    dir: &Path,
    file_name: &str,
    contents_base64: &str,
) -> Result<PathBuf, String> {
    if file_name.trim().is_empty()
        || file_name.contains('/')
        || file_name.contains('\\')
        || file_name.contains("..")
    {
        return Err("Invalid output file name.".to_string());
    }

    fs::create_dir_all(dir)
        .map_err(|e| format!("Could not create folder {}: {e}", dir.display()))?;

    let bytes = general_purpose::STANDARD
        .decode(contents_base64)
        .map_err(|e| format!("Failed to decode output file content: {e}"))?;

    let dest = dir.join(file_name);
    atomic_write_bytes(&dest, &bytes)?;
    Ok(dest)
}

/// Write an output file (PDF or TXT) atomically. When `directory` is empty the
/// file goes to the user's Downloads folder.
#[tauri::command(rename_all = "snake_case")]
async fn write_output_file(
    app: tauri::AppHandle,
    directory: String,
    file_name: String,
    contents_base64: String,
) -> Result<String, String> {
    let dir = resolve_output_dir(&app, &directory)?;
    let dest = write_output_file_to_dir(&dir, &file_name, &contents_base64)?;
    Ok(dest.to_string_lossy().to_string())
}

/// Sync core of the writability probe, kept separate for unit tests.
fn check_directory_writable_sync(directory: &str) -> Result<PathBuf, String> {
    let dir = PathBuf::from(directory.trim());
    if dir.as_os_str().is_empty() {
        return Err("No folder configured.".to_string());
    }

    fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create folder {}: {e}", dir.display()))?;

    let probe = dir.join(format!(".lunchmenu-writetest-{}", temp_suffix()));
    fs::write(&probe, b"probe")
        .map_err(|e| format!("Folder {} is not writable: {e}", dir.display()))?;
    fs::remove_file(&probe)
        .map_err(|e| format!("Folder {} is not writable: {e}", dir.display()))?;

    Ok(dir)
}

/// Check whether the configured menu.json destination folder exists and is
/// writable. Creates the folder if it does not exist yet.
#[tauri::command]
async fn check_directory_writable(directory: String) -> Result<String, String> {
    let dir = check_directory_writable_sync(&directory)?;
    Ok(dir.to_string_lossy().to_string())
}

/// Native folder picker for choosing the menu.json destination folder.
#[tauri::command]
async fn pick_folder() -> Result<Option<String>, String> {
    let picked = rfd::AsyncFileDialog::new()
        .set_title("Choose the menu.json destination folder")
        .pick_folder()
        .await;
    Ok(picked.map(|p| p.path().to_string_lossy().to_string()))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            test_smtp_connection,
            send_publish_email,
            pick_folder,
            check_directory_writable,
            write_menu_json,
            write_output_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "lunch-menu-test-{name}-{}-{}",
            std::process::id(),
            temp_suffix()
        ));
        fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    #[test]
    fn atomic_write_creates_file() {
        let dir = temp_dir("create");
        let dest = dir.join("menu.json");

        atomic_write_bytes(&dest, b"{\"hello\":1}").expect("write should succeed");
        assert_eq!(fs::read_to_string(&dest).unwrap(), "{\"hello\":1}");

        // No temp files left behind.
        let leftovers: Vec<_> = fs::read_dir(&dir)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|e| e.file_name().to_string_lossy().contains(".tmp-"))
            .collect();
        assert!(leftovers.is_empty(), "temp files must be cleaned up");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn atomic_write_replaces_existing_content() {
        let dir = temp_dir("replace");
        let dest = dir.join("menu.json");

        atomic_write_bytes(&dest, b"{\"old\":true}").expect("first write");
        atomic_write_bytes(&dest, b"{\"new\":true}").expect("second write");

        // Content is fully replaced — never a mix of old and new.
        assert_eq!(fs::read_to_string(&dest).unwrap(), "{\"new\":true}");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn atomic_write_fails_when_dir_missing() {
        let dest = std::env::temp_dir().join(format!(
            "lunch-menu-test-nodir-{}-{}/menu.json",
            std::process::id(),
            temp_suffix()
        ));
        let result = atomic_write_bytes(&dest, b"data");
        assert!(result.is_err(), "write into missing dir must fail");
    }

    #[test]
    fn write_menu_json_round_trip() {
        let dir = temp_dir("cmd");
        let path =
            write_menu_json_to_dir(&dir.to_string_lossy(), "{\"a\":1}").expect("should succeed");
        assert!(path.ends_with("menu.json"));
        assert_eq!(fs::read_to_string(&path).unwrap(), "{\"a\":1}");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn write_output_file_rejects_bad_names() {
        let dir = temp_dir("names");
        let r = write_output_file_to_dir(&dir, "../evil.txt", "aGk=");
        assert!(r.is_err(), "path traversal must be rejected");

        let r2 = write_output_file_to_dir(&dir, "good.pdf", "aGk=");
        assert!(r2.is_ok(), "normal name must be accepted");
        assert_eq!(fs::read_to_string(r2.unwrap()).unwrap(), "hi");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn check_directory_writable_probes() {
        let dir = temp_dir("probe");
        let result = check_directory_writable_sync(&dir.to_string_lossy());
        assert!(result.is_ok(), "existing dir should pass the probe");

        let missing = std::env::temp_dir().join(format!(
            "lunch-menu-test-newdir-{}-{}",
            std::process::id(),
            temp_suffix()
        ));
        let result = check_directory_writable_sync(&missing.to_string_lossy());
        assert!(result.is_ok(), "missing dir should be created then pass");

        let _ = fs::remove_dir_all(&dir);
        let _ = fs::remove_dir_all(&missing);
    }
}
