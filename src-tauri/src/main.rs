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
        _ => std::env::var("EMAIL_PASSWORD").map_err(|_| "EMAIL_PASSWORD not set in .env")?,
    };
    let smtp_host = match smtp_host {
        Some(h) if !h.trim().is_empty() => h,
        _ => std::env::var("SMTP_HOST").map_err(|_| "SMTP_HOST not set in .env")?,
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

fn build_mailer_from(
    host: &str,
    port: u16,
    user: String,
    password: String,
) -> Result<SmtpTransport, String> {
    let creds = Credentials::new(user, password);
    let tls_params = TlsParameters::builder(host.to_owned())
        .build()
        .map_err(|e| format!("Failed to build TLS parameters: {e}"))?;
    let tls_mode = if port == 465 {
        Tls::Wrapper(tls_params)
    } else {
        Tls::Required(tls_params)
    };

    Ok(SmtpTransport::builder_dangerous(host)
        .port(port)
        .credentials(creds)
        .tls(tls_mode)
        .build())
}

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

#[tauri::command]
async fn test_smtp_connection(
    host: String,
    port: u16,
    user: String,
    password: String,
) -> Result<String, String> {
    let mailer = build_mailer_from(host.as_str(), port, user, password)?;
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
    let mut multipart = MultiPart::mixed().singlepart(SinglePart::plain(body));

    let txt_attachment = Attachment::new(txt_attachment_name).body(
        txt_content.into_bytes(),
        "text/plain"
            .parse()
            .map_err(|e| format!("Invalid MIME type: {e}"))?,
    );
    multipart = multipart.singlepart(txt_attachment);

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
            email_user
                .parse()
                .map_err(|e| format!("Failed to parse from address: {e}"))?,
        )
        .to(recipient
            .parse()
            .map_err(|e| format!("Failed to parse to address: {e}"))?)
        .subject(subject.as_str())
        .multipart(multipart)
        .map_err(|e| format!("Failed to build email: {e}"))?;

    mailer
        .send(&email)
        .map(|_| "Email sent successfully!".to_string())
        .map_err(|e| format!("Could not send email: {e:?}"))
}

fn temp_suffix() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_nanos());
    format!("{}-{}", std::process::id(), nanos)
}

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
        fs::rename(&tmp_path, dest)
            .map_err(|e| format!("Failed to replace {}: {e}", dest.display()))?;
        Ok(())
    })();

    if result.is_err() {
        let _ = fs::remove_file(&tmp_path);
    }
    result
}

fn resolve_output_dir(app: &tauri::AppHandle, directory: &str) -> Result<PathBuf, String> {
    use tauri::Manager;

    if !directory.trim().is_empty() {
        return Ok(PathBuf::from(directory.trim()));
    }
    app.path()
        .download_dir()
        .map_err(|e| format!("Could not resolve the Downloads folder: {e}"))
}

fn is_leap_year(year: i64) -> bool {
    year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
}

fn days_in_month(year: i64, month: u64) -> u64 {
    match month {
        2 if is_leap_year(year) => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}

fn ascii_digits(value: &str, start: usize, end: usize) -> Option<&str> {
    let bytes = value.as_bytes();
    let segment = bytes.get(start..end)?;
    if segment.iter().all(|byte| byte.is_ascii_digit()) {
        std::str::from_utf8(segment).ok()
    } else {
        None
    }
}

fn valid_iso_date(value: &str, expected_year: i64, expected_month: u64, expected_day: u64) -> bool {
    let bytes = value.as_bytes();
    value.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && ascii_digits(value, 0, 4).and_then(|part| part.parse::<i64>().ok())
            == Some(expected_year)
        && ascii_digits(value, 5, 7).and_then(|part| part.parse::<u64>().ok())
            == Some(expected_month)
        && ascii_digits(value, 8, 10).and_then(|part| part.parse::<u64>().ok())
            == Some(expected_day)
        && expected_day >= 1
        && expected_day <= days_in_month(expected_year, expected_month)
}

fn valid_iso_timestamp(value: &str) -> bool {
    let bytes = value.as_bytes();
    let year = ascii_digits(value, 0, 4).and_then(|part| part.parse::<i64>().ok());
    let month = ascii_digits(value, 5, 7).and_then(|part| part.parse::<u64>().ok());
    let day = ascii_digits(value, 8, 10).and_then(|part| part.parse::<u64>().ok());
    value.len() == 24
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[10] == b'T'
        && bytes[13] == b':'
        && bytes[16] == b':'
        && bytes[19] == b'.'
        && bytes[23] == b'Z'
        && year.is_some_and(|value| (1..=9999).contains(&value))
        && month.is_some_and(|value| (1..=12).contains(&value))
        && day.is_some_and(|value| {
            let year = year.unwrap_or(0);
            let month = month.unwrap_or(0);
            (1..=days_in_month(year, month)).contains(&value)
        })
        && ascii_digits(value, 11, 13)
            .and_then(|part| part.parse::<u64>().ok())
            .is_some_and(|hour| hour < 24)
        && ascii_digits(value, 14, 16)
            .and_then(|part| part.parse::<u64>().ok())
            .is_some_and(|minute| minute < 60)
        && ascii_digits(value, 17, 19)
            .and_then(|part| part.parse::<u64>().ok())
            .is_some_and(|second| second < 60)
        && ascii_digits(value, 20, 23)
            .and_then(|part| part.parse::<u64>().ok())
            .is_some()
}

fn validate_menu_json(contents: &str) -> Result<(), String> {
    let value: serde_json::Value =
        serde_json::from_str(contents).map_err(|e| format!("menu.json is not valid JSON: {e}"))?;
    let object = value
        .as_object()
        .ok_or_else(|| "menu.json must contain a top-level object.".to_string())?;

    // V5 contract: the file always carries TWO consecutive months (the primary
    // month plus the one after it) so an early publish of the next month never
    // erases the rest of the current one. The "menu" array is what both
    // consumers parse - MenuSync.gs hard-fails without it, and the kiosk's
    // getDailyMenu() matches entries by "date", ignoring the extra month.
    if object.get("version").and_then(|v| v.as_u64()) != Some(5) {
        return Err("menu.json version must be 5.".to_string());
    }
    let generated = object
        .get("generated")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "menu.json generated must be a string.".to_string())?;
    if !valid_iso_timestamp(generated) {
        return Err("menu.json generated must use UTC ISO-8601 format.".to_string());
    }
    let published_at = object
        .get("publishedAt")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "menu.json publishedAt must be a string.".to_string())?;
    if !valid_iso_timestamp(published_at) {
        return Err("menu.json publishedAt must use UTC ISO-8601 format.".to_string());
    }

    let year = object
        .get("year")
        .and_then(|v| v.as_i64())
        .filter(|year| (1..=9999).contains(year))
        .ok_or_else(|| "menu.json year must be an integer from 1 to 9999.".to_string())?;
    let month = object
        .get("month")
        .and_then(|v| v.as_u64())
        .filter(|month| (1..=12).contains(month))
        .ok_or_else(|| "menu.json month must be an integer from 1 to 12.".to_string())?;

    // The second month must be present and must immediately follow the primary
    // month (December rolls over to January of the next year).
    let next_month = object
        .get("nextMonth")
        .and_then(|v| v.as_u64())
        .filter(|month| (1..=12).contains(month))
        .ok_or_else(|| "menu.json nextMonth must be an integer from 1 to 12.".to_string())?;
    let next_year = object
        .get("nextYear")
        .and_then(|v| v.as_i64())
        .filter(|year| (1..=9999).contains(year))
        .ok_or_else(|| "menu.json nextYear must be an integer from 1 to 9999.".to_string())?;
    let (expected_next_month, expected_next_year) =
        if month == 12 { (1, year + 1) } else { (month + 1, year) };
    if next_month != expected_next_month || next_year != expected_next_year {
        return Err(
            "menu.json nextMonth/nextYear must immediately follow month/year.".to_string(),
        );
    }

    let verse = object
        .get("verse")
        .ok_or_else(|| "menu.json verse must be present.".to_string())?;
    if !verse.is_null() {
        let verse = verse
            .as_object()
            .ok_or_else(|| "menu.json verse must be null or an object.".to_string())?;
        if verse.get("text").and_then(|v| v.as_str()).is_none()
            || verse.get("reference").and_then(|v| v.as_str()).is_none()
        {
            return Err("menu.json verse must contain text and reference strings.".to_string());
        }
    }

    let menu = object
        .get("menu")
        .and_then(|v| v.as_array())
        .ok_or_else(|| "menu.json menu must be an array.".to_string())?;
    // Primary month block first, then the following month's block. Each block
    // must contain exactly every calendar day of its month, in order.
    let first_days = days_in_month(year, month);
    let second_days = days_in_month(next_year, next_month);
    let expected_days = first_days + second_days;
    if menu.len() as u64 != expected_days {
        return Err(format!(
            "menu.json menu must contain exactly {expected_days} entries (both months)."
        ));
    }

    for (index, entry) in menu.iter().enumerate() {
        let (entry_year, entry_month, day_number) = if (index as u64) < first_days {
            (year, month, index as u64 + 1)
        } else {
            (next_year, next_month, index as u64 + 1 - first_days)
        };
        let entry = entry
            .as_object()
            .ok_or_else(|| "Each menu.json menu entry must be an object.".to_string())?;
        let date = entry
            .get("date")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Each menu.json menu entry must contain a date string.".to_string())?;
        if !valid_iso_date(date, entry_year, entry_month, day_number) {
            return Err(format!(
                "menu.json menu entry {day_number} of month {entry_month} has an invalid ISO date."
            ));
        }
        if entry.get("day").and_then(|v| v.as_str()).is_none()
            || entry.get("entree").and_then(|v| v.as_str()).is_none()
            || entry.get("special").and_then(|v| v.as_str()).is_none()
            || entry.get("event").and_then(|v| v.as_str()).is_none()
            || entry.get("noSchool").and_then(|v| v.as_bool()).is_none()
        {
            return Err(
                "Each menu.json menu entry must contain day/entree/special/event strings and a boolean noSchool flag."
                    .to_string(),
            );
        }
        if entry
            .get("sides")
            .and_then(|v| v.as_array())
            .is_none_or(|sides| sides.iter().any(|side| side.as_str().is_none()))
        {
            return Err(
                "Each menu.json menu entry sides value must be an array of strings.".to_string()
            );
        }
    }

    Ok(())
}

fn write_menu_json_to_dir(directory: &str, contents: &str) -> Result<PathBuf, String> {
    if directory.trim().is_empty() {
        return Err("No menu.json destination folder configured.".to_string());
    }
    validate_menu_json(contents)?;

    let dir = PathBuf::from(directory.trim());
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create folder {}: {e}", dir.display()))?;
    let dest = dir.join("menu.json");
    atomic_write_bytes(&dest, contents.as_bytes())?;
    Ok(dest)
}

#[tauri::command]
async fn write_menu_json(directory: String, contents: String) -> Result<String, String> {
    let dest = write_menu_json_to_dir(&directory, &contents)?;
    Ok(dest.to_string_lossy().to_string())
}

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

#[tauri::command]
async fn check_directory_writable(directory: String) -> Result<String, String> {
    let dir = check_directory_writable_sync(&directory)?;
    Ok(dir.to_string_lossy().to_string())
}

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
        assert!(atomic_write_bytes(&dest, b"data").is_err());
    }
    /// Build a valid V5 payload for `month`/`year` plus the following month,
    /// with every day empty. Dates use each month's real length.
    fn v5_payload(year: u64, month: u64) -> String {
        let mut entries = Vec::new();
        let mut push_block = |y: u64, m: u64| {
            let days = days_in_month(y as i64, m);
            for day in 1..=days {
                entries.push(format!(
                    "{{\"date\":\"{y:04}-{m:02}-{day:02}\",\"day\":\"Monday\",\"entree\":\"\",\"special\":\"\",\"sides\":[],\"event\":\"\",\"noSchool\":false}}"
                ));
            }
        };
        push_block(year, month);
        let (next_m, next_y) = if month == 12 {
            (1, year + 1)
        } else {
            (month + 1, year)
        };
        push_block(next_y, next_m);
        format!(
            "{{\"version\":5,\"generated\":\"2026-09-02T12:00:00.000Z\",\"publishedAt\":\"2026-09-02T12:00:00.000Z\",\"month\":{month},\"year\":{year},\"nextMonth\":{next_m},\"nextYear\":{next_y},\"verse\":null,\"menu\":[{}]}}",
            entries.join(",")
        )
    }

    #[test]
    fn write_menu_json_round_trip() {
        let dir = temp_dir("cmd");
        // September 2026 (30 days) + October 2026 (31 days) = 61 entries.
        let contents = v5_payload(2026, 9);
        let path =
            write_menu_json_to_dir(&dir.to_string_lossy(), &contents).expect("should succeed");
        assert!(path.ends_with("menu.json"));
        assert_eq!(fs::read_to_string(&path).unwrap(), contents);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn menu_json_validation_accepts_december_rollover() {
        let dir = temp_dir("rollover");
        // December 2026 (31) + January 2027 (31) = 62 entries, and the
        // consecutive-month rule must accept the year boundary.
        let contents = v5_payload(2026, 12);
        let path =
            write_menu_json_to_dir(&dir.to_string_lossy(), &contents).expect("should succeed");
        assert!(path.ends_with("menu.json"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn write_menu_json_rejects_missing_destination_and_invalid_content() {
        assert!(write_menu_json_to_dir("", "{}").is_err());
        let dir = temp_dir("invalid-json");
        assert!(write_menu_json_to_dir(&dir.to_string_lossy(), "not json").is_err());
        assert!(write_menu_json_to_dir(&dir.to_string_lossy(), "{\"version\":5}").is_err());
        assert!(!dir.join("menu.json").exists());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn menu_json_validation_rejects_invalid_dates_and_nested_values() {
        assert!(!valid_iso_timestamp("2026-02-31T12:00:00.000Z"));
        assert!(!valid_iso_timestamp("２０２６-09-02T12:00:00.000Z"));
        assert!(!valid_iso_date("2026-02-31", 2026, 2, 31));
        assert!(!valid_iso_date("2026-09-31", 2026, 9, 30));

        let dir = temp_dir("invalid-shape");

        // A verse missing its reference must fail before the menu checks.
        let mut base: serde_json::Value = serde_json::from_str(&v5_payload(2026, 9)).unwrap();
        let obj = base.as_object_mut().unwrap();
        obj.insert("verse".into(), serde_json::json!({ "text": "only text" }));
        obj.insert("menu".into(), serde_json::Value::Array(vec![]));
        assert!(write_menu_json_to_dir(&dir.to_string_lossy(), &base.to_string()).is_err());

        // The second month must immediately follow the primary month.
        let mut non_consecutive: serde_json::Value =
            serde_json::from_str(&v5_payload(2026, 9)).unwrap();
        let obj = non_consecutive.as_object_mut().unwrap();
        obj.insert("nextMonth".into(), serde_json::json!(11));
        let err = write_menu_json_to_dir(&dir.to_string_lossy(), &non_consecutive.to_string())
            .unwrap_err();
        assert!(
            err.contains("must immediately follow"),
            "unexpected error: {err}"
        );
        assert!(!dir.join("menu.json").exists());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn menu_json_validation_rejects_wrong_day_count() {
        let dir = temp_dir("wrong-count");

        // A valid V5 payload with one of the 61 entries removed: the validator
        // must reject it via the exact two-month day-count rule.
        let mut value: serde_json::Value = serde_json::from_str(&v5_payload(2026, 9)).unwrap();
        let menu = value
            .as_object_mut()
            .unwrap()
            .get_mut("menu")
            .unwrap()
            .as_array_mut()
            .unwrap();
        menu.pop();
        let payload = value.to_string();

        let err = write_menu_json_to_dir(&dir.to_string_lossy(), &payload).unwrap_err();
        assert!(
            err.contains("must contain exactly 61 entries"),
            "unexpected error: {err}"
        );
        assert!(!dir.join("menu.json").exists());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn write_output_file_rejects_bad_names() {
        let dir = temp_dir("names");
        assert!(write_output_file_to_dir(&dir, "../evil.txt", "aGk=").is_err());
        let path = write_output_file_to_dir(&dir, "good.pdf", "aGk=").expect("normal name");
        assert_eq!(fs::read_to_string(path).unwrap(), "hi");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn check_directory_writable_probes() {
        let dir = temp_dir("probe");
        assert!(check_directory_writable_sync(&dir.to_string_lossy()).is_ok());
        let missing = std::env::temp_dir().join(format!(
            "lunch-menu-test-newdir-{}-{}",
            std::process::id(),
            temp_suffix()
        ));
        assert!(check_directory_writable_sync(&missing.to_string_lossy()).is_ok());
        let _ = fs::remove_dir_all(&dir);
        let _ = fs::remove_dir_all(&missing);
    }
}
