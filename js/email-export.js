/**
 * Email Export Module
 * Handles email functionality for PDF and TXT exports
 */

const EmailExport = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById('emailPdfBtn').addEventListener('click', () => this.emailPdf());
        document.getElementById('emailTxtBtn').addEventListener('click', () => this.emailTxt());
    },

    /**
     * Email the PDF export
     * Opens email client with recipient pre-filled
     * Note: Web browsers cannot attach files directly
     */
    emailPdf() {
        const recipient = State.pdfEmail;
        const monthName = this.getMonthName(State.currentMonth);
        const subject = `Lunch Menu - ${monthName} ${State.currentYear}`;
        const body = `Please find attached the lunch menu for ${monthName} ${State.currentYear}.\n\n(Note: In web version, please attach the PDF manually after printing. In Tauri desktop app, the file will be attached automatically.)`;

        this.openEmailClient(recipient, subject, body);
    },

    /**
     * Email the TXT export
     * Opens email client with recipient pre-filled
     * Note: Web browsers cannot attach files directly
     */
    emailTxt() {
        const recipient = State.txtEmail;
        const exportContent = FactsExport.generateExport();
        const monthName = this.getMonthName(State.currentMonth);
        const subject = `FACTS Export - ${monthName} ${State.currentYear}`;
        const body = `Please find attached the FACTS export for ${monthName} ${State.currentYear}.\n\n--- FACTS Export Content ---\n${exportContent}\n\n(Note: In web version, please attach the TXT manually. In Tauri desktop app, the file will be attached automatically.)`;

        this.openEmailClient(recipient, subject, body);
    },

    /**
     * Open the user's default email client with pre-filled fields
     */
    openEmailClient(recipient, subject, body) {
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
