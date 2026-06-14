/**
 * Email Export Module
 * Handles email functionality for PDF and TXT exports
 *
 * In Tauri desktop app, uses window.__TAURI__ for native email.
 * In browser, falls back to mailto: links.
 */

const EmailExport = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        const emailPdfBtn = document.getElementById('emailPdfBtn');
        if (!emailPdfBtn) return;
        emailPdfBtn.addEventListener('click', () => this.emailPdf());
        document.getElementById('emailTxtBtn').addEventListener('click', () => this.emailTxt());
    },

    /**
     * Email the PDF export
     * Opens email client with recipient pre-filled
     * Note: Web browsers cannot attach files directly
     * For Tauri, you would need a separate Rust command to handle PDF attachment and sending.
     */
    emailPdf() {
        const recipient = State.pdfEmail;
        const monthName = this.getMonthName(State.currentMonth);
        const subject = `Lunch Menu - ${monthName} ${State.currentYear}`;
        const body = `Please find attached the lunch menu for ${monthName} ${State.currentYear}.\n\n(Note: In web version, please attach the PDF manually after printing. In Tauri desktop app, the file will be attached automatically.)`;

        // Fallback to mailto for PDF for now, or implement a separate Tauri command for PDF sending
        this.openEmailClientMailto(recipient, subject, body);
    },

    /**
     * Email the TXT export using Tauri command
     */
    async emailTxt() {
        const recipient = State.txtEmail;
        if (!recipient) {
            alert('Please set a default email recipient in Settings first.');
            return;
        }

        const exportContent = TextExport.generateExport();
        const monthName = this.getMonthName(State.currentMonth);
        const subject = `Menu Export - ${monthName} ${State.currentYear}`;

        try {
            // Call the Rust command to send the email (Tauri desktop only)
            const tauriInvoke = window.__TAURI__?.tauri?.invoke;
            if (tauriInvoke) {
                await tauriInvoke('send_menu_email', {
                    recipient: recipient,
                    subject: subject,
                    menuContent: exportContent,
                });
                alert('Email sent successfully via Tauri!');
            } else {
                // Fallback: open mailto with the content
                const body = `Please find attached the menu export for ${monthName} ${State.currentYear}.\n\n--- Menu Export Content ---\n${exportContent}`;
                this.openEmailClientMailto(recipient, subject, body);
            }
        } catch (error) {
            // Failed to send email — user already notified via alert
            alert(`Failed to send email: ${error}`);
        }
    },

    /**
     * Open the user's default email client with pre-filled fields (for web fallback or PDF)
     */
    openEmailClientMailto(recipient, subject, body) {
        if (!recipient) {
            alert('Please set a default email recipient in Settings first.');
            return;
        }

        // Create mailto link
        const mailtoLink = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        // Open email client
        window.location.href = mailtoLink;
    },

    /**
     * Get month name from month number (0-11)
     */
    getMonthName(month) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month];
    }
};

