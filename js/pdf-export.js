/**
 * PDF Export Module
 * Handles real PDF generation for the Publish Month workflow.
 *
 * Requires the vendored jspdf and html2canvas UMD bundles (js/vendor/),
 * which are copied from node_modules by `npm install` (scripts/copy-vendor.js).
 * Saving the blob to a file and attaching it to email is handled by Publish.
 */

const PdfExport = {
    init() {
        // Nothing to set up here; generation happens on demand.
    },

    /**
     * Convert a Blob to a base64 string without blowing the call stack.
     * (Spreading a large Uint8Array through String.fromCharCode(...) throws
     * "Maximum call stack size exceeded" for multi-megabyte PDFs.)
     */
    async blobToBase64(blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const CHUNK = 0x8000; // 32k
        for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
        }
        return btoa(binary);
    },

    /**
     * Render the current calendar to a real PDF blob.
     *
     * The PDF is built client-side with jsPDF + html2canvas and mirrors the
     * landscape print design (css/pdf.css). The blob is returned; saving it to
     * a file (or attaching it to an email) is handled by the Publish workflow.
     *
     * @returns {Promise<Blob>}
     */
    async generatePdf() {
        if (!window.jspdf?.jsPDF || typeof html2canvas !== 'function') {
            throw new Error('PDF libraries are not loaded. Please reinstall the app.');
        }

        State.showLoading('Generating PDF...');

        try {
            // Add preview mode class for consistent PDF generation
            document.body.classList.add('preview-mode');

            // Wait for fonts to load, then one animation frame so the
            // preview-mode styles are fully applied before capturing.
            await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(resolve));

            const { jsPDF } = window.jspdf;
            // Capture the print layout (logo header + calendar). In preview mode
            // the side panels are hidden, so .main-content is exactly what the
            // print stylesheet renders — minus the printer's own margins.
            const element = document.querySelector('.main-content') ||
                document.getElementById('calendarContainer');

            if (!element) {
                throw new Error('Print layout not found');
            }

            // Preview CSS pins .main-content to the viewport with a scrollbar;
            // html2canvas would only capture the visible part. Let it grow to its
            // full content height for the duration of the capture.
            const prevHeight = element.style.height;
            const prevOverflow = element.style.overflow;
            element.style.height = 'auto';
            element.style.overflow = 'visible';

            // Cream paper, matching --pdf-cream (css/app.css print design).
            const pdfCream = getComputedStyle(document.documentElement)
                .getPropertyValue('--pdf-cream').trim() || '#fdf8f0';

            // Ensure the header logo is decoded before capture (fonts.ready
            // only covers fonts, not images).
            const logo = element.querySelector('.print-logo');
            if (logo && !logo.complete) {
                await new Promise(resolve => {
                    logo.addEventListener('load', resolve, { once: true });
                    logo.addEventListener('error', resolve, { once: true });
                });
            }

            let canvas;
            try {
                canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: pdfCream,
                    logging: false // html2canvas's default debug logging floods the console
                });
            } finally {
                element.style.height = prevHeight;
                element.style.overflow = prevOverflow;
            }

            const imgData = canvas.toDataURL('image/png');

            // Letter landscape to match css/pdf.css @page (0.25in 0.35in 0.2in 0.35in).
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'letter'
            });

            const pageWidth = 279.4;
            const pageHeight = 215.9;
            const marginTop = 6.35;
            const marginSide = 8.89;
            const marginBottom = 5.08;

            // Image scaled to fit the printable area (the calendar header already
            // carries the month title, so no separate title block is drawn).
            const availableWidth = pageWidth - (marginSide * 2);
            const availableHeight = pageHeight - marginTop - marginBottom;
            let imgWidth = availableWidth;
            let imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (imgHeight > availableHeight) {
                imgHeight = availableHeight;
                imgWidth = (canvas.width * imgHeight) / canvas.height;
            }

            const imgX = (pageWidth - imgWidth) / 2;
            pdf.addImage(imgData, 'PNG', imgX, marginTop, imgWidth, imgHeight);

            return pdf.output('blob');

        } catch (error) {
            State.showError(`Failed to generate PDF: ${error.message}`);
            throw error;
        } finally {
            // Remove preview mode
            document.body.classList.remove('preview-mode');
            State.hideLoading();
        }
    },

};
