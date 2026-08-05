/**
 * Email Export Module
 * Handles email functionality for PDF and TXT exports
 *
 * In Tauri desktop app, uses window.__TAURI__ for native email.
 * In browser, falls back to mailto: links.
 */

const EmailExport = {
    isTauri: false,

    init() {
        // Detect Tauri availability once at init
        this.isTauri = !!(window.__TAURI__?.invoke);
        this.setupEventListeners();
    },

    setupEventListeners() {
        const emailPdfBtn = document.getElementById('emailPdfBtn');
        if (emailPdfBtn) emailPdfBtn.addEventListener('click', () => this.emailPdf());
        const emailTxtBtn = document.getElementById('emailTxtBtn');
        if (emailTxtBtn) emailTxtBtn.addEventListener('click', () => this.emailTxt());
    },

    /**
     * SMTP config from Settings, sent to the Rust backend with every email.
     * The backend falls back to .env values when these are empty.
     */
    smtpArgs() {
        return {
            smtpHost: State.smtpHost || null,
            smtpPort: State.smtpPort || null,
            smtpUser: State.smtpUser || null,
            smtpPassword: State.smtpPassword || null
        };
    },

    /**
     * Email the PDF export
     * Uses Tauri command to send PDF attachment
     */
    async emailPdf() {
        const recipient = State.pdfEmail;
        if (!recipient) {
            alert('Please set a default email recipient in Settings first.');
            return;
        }

        const monthName = getMonthName(State.currentMonth);
        const subject = `Lunch Menu - ${monthName} ${State.currentYear}`;

        try {
            if (this.isTauri) {
                // Generate PDF and send via Tauri
                const pdfBlob = await PdfExport.generatePdf();
                const base64 = await PdfExport.blobToBase64(pdfBlob);

                await window.__TAURI__.invoke('send_pdf_email', {
                    recipient: recipient,
                    subject: subject,
                    pdfBase64: base64,
                    ...this.smtpArgs()
                });
                alert('PDF email sent successfully via Tauri!');
            } else {
                // Web fallback: open mailto with PDF generation instructions
                const body = `Please find attached the lunch menu PDF for ${monthName} ${State.currentYear}.

(Note: In web version, please generate and attach the PDF manually.)`;
                this.openEmailClientMailto(recipient, subject, body);
            }
        } catch (error) {
            console.error('PDF email send failed:', error);
            alert('Failed to send email. Please check your SMTP settings and try again.');
        }
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
        const monthName = getMonthName(State.currentMonth);
        const subject = `Menu Export - ${monthName} ${State.currentYear}`;

        try {
            if (this.isTauri) {
                await window.__TAURI__.invoke('send_menu_email', {
                    recipient: recipient,
                    subject: subject,
                    menuContent: exportContent,
                    ...this.smtpArgs()
                });
                alert('Email sent successfully via Tauri!');
            } else {
                // Fallback: open mailto with the content
                const body = `Please find attached the menu export for ${monthName} ${State.currentYear}.

--- Menu Export Content ---
${exportContent}`;
                this.openEmailClientMailto(recipient, subject, body);
            }
        } catch (error) {
            console.error('TXT email send failed:', error);
            alert('Failed to send email. Please check your SMTP settings and try again.');
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

};

