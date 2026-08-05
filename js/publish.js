/**
 * Publish Month - the single publishing workflow.
 *
 * Replaces the scattered Preview / Print / Text Export / Email buttons with one
 * Publish Month flow that produces all required outputs:
 *   1. A real PDF file  (Lunch Menu - September 2026.pdf)  -> Downloads
 *   2. A real TXT file   (Lunch Menu - September 2026.txt) -> Downloads
 *   3. menu.json         -> the configured Google Drive-synced folder (atomic)
 *   4. The staff-office email (TXT always attached; PDF only when generated)
 *
 * The workflow is honest: every step reports its own success/failure and the
 * overall result is only "complete" when menu.json was actually written.
 */

const Publish = (function () {
    'use strict';

    let isRunning = false;
    let lastPlan = null;

    function isTauri() {
        return !!(window.__TAURI__ && window.__TAURI__.invoke);
    }

    function pdfLibrariesAvailable() {
        return typeof window.jspdf !== 'undefined' && typeof html2canvas === 'function';
    }

    /** UTF-8-safe base64 (btoa alone corrupts non-Latin-1 characters). */
    function base64FromString(str) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        const CHUNK = 0x8000;
        for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
        }
        return btoa(binary);
    }

    function downloadTextFile(fileName, contents, mime) {
        const blob = new Blob([contents], { type: mime || 'text/plain;charset=utf-8' });
        downloadBlob(fileName, blob);
    }

    function downloadBlob(fileName, blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    // ------------------------------------------------------------------
    // Last-published badge
    // ------------------------------------------------------------------

    function updateBadge() {
        const badge = document.getElementById('publishedBadge');
        if (!badge) return;
        const iso = State.getLastPublished(State.currentMonth, State.currentYear);
        if (iso) {
            badge.textContent = '✓ Published';
            badge.title = `Published ${new Date(iso).toLocaleString()}`;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    // ------------------------------------------------------------------
    // Confirmation
    // ------------------------------------------------------------------

    function buildConfig() {
        const smtpComplete = !!(
            State.smtpHost && State.smtpUser && State.smtpPassword
        );
        return {
            menuJsonFolder: State.menuJsonFolder,
            staffEmail: State.staffEmail,
            smtpComplete,
            browserMode: !isTauri()
        };
    }

    function open() {
        const menu = State.getMenu(State.currentMonth, State.currentYear);
        lastPlan = MenuData.buildPublishPlan(
            menu, State.currentMonth, State.currentYear, State.settings, buildConfig()
        );
        renderConfirmation(lastPlan);
        document.getElementById('publishModal').style.display = 'flex';
    }

    function renderConfirmation(plan) {
        const body = document.getElementById('publishModalBody');
        body.innerHTML = '';

        const headline = el('h3', 'publish-headline', `Publish ${plan.monthLabel}?`);
        const sub = el('p', 'publish-subline',
            `${plan.instructionalDays} instructional days · ${plan.missingEntreeCount} missing an entrée`);
        body.appendChild(headline);
        body.appendChild(sub);

        const list = el('ul', 'publish-checklist');

        const savedToDownloads = plan.browserMode
            ? 'downloaded (the desktop app saves files to Downloads)'
            : 'saved to your Downloads folder';

        const txtRow = el('li', 'checklist-item');
        txtRow.appendChild(el('span', 'check-ok', '✓'));
        txtRow.appendChild(el('div', 'checklist-text',
            `TXT file "${plan.fileName}.txt" will be ${savedToDownloads} (for FACTS / RenWeb import).`));
        list.appendChild(txtRow);

        const pdfRow = el('li', 'checklist-item');
        if (pdfLibrariesAvailable()) {
            pdfRow.appendChild(el('span', 'check-ok', '✓'));
            pdfRow.appendChild(el('div', 'checklist-text',
                `PDF file "${plan.fileName}.pdf" will be generated and ${savedToDownloads}.`));
        } else {
            pdfRow.appendChild(el('span', 'check-warn', '!'));
            pdfRow.appendChild(el('div', 'checklist-text',
                'Automatic PDF generation is unavailable (missing components). PDF will be skipped — use Preview → Print → "Save as PDF" instead.'));
        }
        list.appendChild(pdfRow);

        const jsonRow = el('li', 'checklist-item');
        if (plan.jsonConfigured || !isTauri()) {
            jsonRow.appendChild(el('span', 'check-ok', '✓'));
        } else {
            jsonRow.appendChild(el('span', 'check-warn', '!'));
        }
        jsonRow.appendChild(el('div', 'checklist-text', plan.jsonDeliveryLabel));
        list.appendChild(jsonRow);

        const emailRow = el('li', 'checklist-item');
        if (plan.emailConfigured && isTauri()) {
            emailRow.appendChild(el('span', 'check-ok', '✓'));
        } else {
            emailRow.appendChild(el('span', 'check-warn', '!'));
        }
        emailRow.appendChild(el('div', 'checklist-text', plan.emailDeliveryLabel));
        list.appendChild(emailRow);

        body.appendChild(list);

        if (plan.warnings.length > 0) {
            const warnBox = el('div', 'publish-warnings');
            warnBox.appendChild(el('h4', null, 'Before you publish'));
            plan.warnings.forEach(w => warnBox.appendChild(el('p', null, `• ${w}`)));
            body.appendChild(warnBox);
        }

        // Folder-writable status (desktop only) - verified live before publishing.
        const folderStatus = el('p', 'publish-folder-status');
        body.appendChild(folderStatus);

        const actions = el('div', 'publish-actions');
        const cancelBtn = el('button', 'btn btn-secondary', 'Cancel');
        cancelBtn.id = 'cancelPublishBtn';
        cancelBtn.addEventListener('click', close);

        const publishBtn = el('button', 'btn btn-primary', 'Publish Month');
        publishBtn.id = 'confirmPublishBtn';
        publishBtn.addEventListener('click', () => runPublish());
        actions.appendChild(cancelBtn);
        actions.appendChild(publishBtn);
        body.appendChild(actions);

        if (!plan.canPublish) {
            const hint = el('p', 'publish-hint',
                'Publish is disabled until a menu.json destination folder is configured (Settings → menu.json destination).');
            body.appendChild(hint);
        }

        // Live check: confirm the destination folder is actually writable BEFORE
        // enabling publish. In desktop mode the button stays disabled until the
        // probe passes (or until plan.canPublish is false, which also disables).
        const needsPreflight = plan.jsonConfigured && isTauri();
        if (needsPreflight) {
            publishBtn.disabled = true;
        } else {
            publishBtn.disabled = !plan.canPublish;
        }
        publishBtn.focus();

        if (needsPreflight) {
            folderStatus.textContent = 'Checking menu.json destination folder…';
            window.__TAURI__.invoke('check_directory_writable', {
                directory: State.menuJsonFolder
            }).then(() => {
                folderStatus.textContent = `✓ menu.json destination is writable: ${State.menuJsonFolder}`;
                publishBtn.disabled = false;
            }).catch((err) => {
                folderStatus.textContent = `✗ menu.json destination is NOT writable: ${err}`;
                publishBtn.disabled = true;
                publishBtn.title = 'Choose a writable destination folder in Settings';
            });
        } else {
            folderStatus.style.display = 'none';
        }
    }

    function close() {
        // Never allow closing mid-publish: the run owns the modal until done.
        if (isRunning) return;
        document.getElementById('publishModal').style.display = 'none';
    }

    // ------------------------------------------------------------------
    // Publishing
    // ------------------------------------------------------------------

    async function runPublish() {
        if (isRunning) return;
        isRunning = true;

        const body = document.getElementById('publishModalBody');
        const plan = lastPlan || MenuData.buildPublishPlan(
            State.getMenu(State.currentMonth, State.currentYear),
            State.currentMonth, State.currentYear, State.settings, buildConfig()
        );

        body.innerHTML = '';
        body.appendChild(el('h3', 'publish-headline', `Publishing ${plan.monthLabel}…`));
        body.appendChild(el('p', 'publish-subline', 'This usually takes a few seconds.'));

        const results = [];
        const record = (key, label, ok, detail) => results.push({ key, label, ok, detail });

        const tauri = isTauri();

        // --- 1. TXT file -------------------------------------------------
        try {
            const txtBase64 = base64FromString(plan.txt);
            if (tauri) {
                const path = await window.__TAURI__.invoke('write_output_file', {
                    directory: '',
                    file_name: `${plan.fileName}.txt`,
                    contents_base64: txtBase64
                });
                record('txt', 'TXT file', true, `Saved to ${path}`);
            } else {
                downloadTextFile(`${plan.fileName}.txt`, plan.txt);
                record('txt', 'TXT file', true, 'Downloaded (desktop app saves to Downloads)');
            }
        } catch (err) {
            record('txt', 'TXT file', false, String(err));
        }

        // --- 2. PDF file ---------------------------------------------------
        let pdfBase64 = null;
        if (pdfLibrariesAvailable()) {
            try {
                const blob = await PdfExport.generatePdf();
                pdfBase64 = await PdfExport.blobToBase64(blob);
                if (tauri) {
                    const path = await window.__TAURI__.invoke('write_output_file', {
                        directory: '',
                        file_name: `${plan.fileName}.pdf`,
                        contents_base64: pdfBase64
                    });
                    record('pdf', 'PDF file', true, `Saved to ${path}`);
                } else {
                    downloadBlob(`${plan.fileName}.pdf`, blob);
                    record('pdf', 'PDF file', true, 'Downloaded (desktop app saves to Downloads)');
                }
            } catch (err) {
                pdfBase64 = null;
                record('pdf', 'PDF file', false,
                    `PDF could not be generated automatically (${err}). Use Preview → Print → "Save as PDF" instead.`);
            }
        } else {
            record('pdf', 'PDF file', false,
                'Automatic PDF generation is unavailable (missing components). Use Preview → Print → "Save as PDF" instead.');
        }

        // --- 3. menu.json (required integration output) -------------------
        const jsonText = JSON.stringify(plan.json, null, 2);
        let jsonOk = false;
        try {
            if (tauri) {
                const path = await window.__TAURI__.invoke('write_menu_json', {
                    directory: State.menuJsonFolder,
                    contents: jsonText
                });
                record('json', 'menu.json', true, `Written to ${path}`);
            } else {
                downloadTextFile('menu.json', jsonText, 'application/json');
                record('json', 'menu.json', true,
                    'Downloaded (the sync-folder write requires the desktop app)');
            }
            jsonOk = true;
        } catch (err) {
            record('json', 'menu.json', false,
                `menu.json was NOT written: ${err}. Publishing did not complete successfully.`);
        }

        // --- 4. Staff-office email -----------------------------------------
        const subject = `Lunch Menu — ${plan.monthLabel}`;
        const emailBody = `Please find attached the lunch menu for ${plan.monthLabel}.\n\nSpecials are for teachers and 12th-grade students.`;
        if (plan.emailConfigured && tauri) {
            try {
                await window.__TAURI__.invoke('send_publish_email', {
                    recipient: State.staffEmail,
                    subject,
                    body: emailBody,
                    txt_content: plan.txt,
                    txt_attachment_name: `${plan.fileName}.txt`,
                    pdf_base64: pdfBase64 || null,
                    pdf_attachment_name: pdfBase64 ? `${plan.fileName}.pdf` : null,
                    smtp_host: State.smtpHost || null,
                    smtp_port: State.smtpPort || null,
                    smtp_user: State.smtpUser || null,
                    smtp_password: State.smtpPassword || null
                });
                record('email', 'Staff-office email', true,
                    `Sent to ${State.staffEmail} (TXT attached${pdfBase64 ? ' + PDF' : ''})`);
            } catch (err) {
                record('email', 'Staff-office email', false,
                    `Email was NOT sent: ${err}. The files above were still saved.`);
            }
        } else {
            record('email', 'Staff-office email', false,
                plan.emailConfigured
                    ? 'Skipped — sending email requires the desktop app.'
                    : 'Skipped — no staff-office recipient configured.');
        }

        // --- 5. Record published snapshot + verdict -----------------------
        if (jsonOk) {
            State.markPublished(State.currentMonth, State.currentYear, plan.json.publishedAt);
            updateBadge();
        }

        const verdict = MenuData.buildVerdict(jsonOk, plan.monthLabel);

        renderResults(results, verdict);
        isRunning = false;
    }

    function renderResults(results, verdict) {
        const body = document.getElementById('publishModalBody');
        body.innerHTML = '';

        const banner = el('div', verdict.startsWith('Publishing complete')
            ? 'publish-verdict ok'
            : 'publish-verdict fail', verdict);
        body.appendChild(banner);

        const list = el('ul', 'publish-checklist');
        results.forEach(r => {
            const row = el('li', 'checklist-item');
            row.appendChild(el('span', r.ok ? 'check-ok' : 'check-fail', r.ok ? '✓' : '✗'));
            const text = el('div', 'checklist-text');
            text.appendChild(el('strong', null, r.label));
            text.appendChild(el('p', 'checklist-detail', r.detail));
            row.appendChild(text);
            list.appendChild(row);
        });
        body.appendChild(list);

        const actions = el('div', 'publish-actions');
        const doneBtn = el('button', 'btn btn-primary', 'Done');
        doneBtn.addEventListener('click', close);
        actions.appendChild(doneBtn);
        body.appendChild(actions);
        doneBtn.focus();
    }

    // ------------------------------------------------------------------
    // Test email (settings helper)
    // ------------------------------------------------------------------

    async function sendTestEmail() {
        const recipient = State.staffEmail;
        if (!recipient) {
            State.showError('Set a staff-office email recipient in Settings first.');
            return false;
        }
        if (!isTauri()) {
            State.showError('Sending email requires the desktop app.');
            return false;
        }

        State.showLoading('Sending test email…');
        try {
            await window.__TAURI__.invoke('send_publish_email', {
                recipient,
                subject: 'Lunch Menu Publisher — Test Email',
                body: 'This is a test email from Lunch Menu Publisher. If you received this, email is configured correctly.',
                txt_content: 'Test email — no menu attached.',
                txt_attachment_name: 'test-email.txt',
                pdf_base64: null,
                pdf_attachment_name: null,
                smtp_host: State.smtpHost || null,
                smtp_port: State.smtpPort || null,
                smtp_user: State.smtpUser || null,
                smtp_password: State.smtpPassword || null
            });
            alert('Test email sent successfully!');
            return true;
        } catch (err) {
            State.showError(`Test email failed: ${err}`);
            return false;
        } finally {
            State.hideLoading();
        }
    }

    function init() {
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) publishBtn.addEventListener('click', open);

        const closeBtn = document.getElementById('closePublish');
        if (closeBtn) closeBtn.addEventListener('click', close);

        // Escape closes the modal (safe cancel).
        const modal = document.getElementById('publishModal');
        if (modal) {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !isRunning) close();
            });
        }

        updateBadge();
    }

    return {
        init,
        open,
        close,
        updateBadge,
        runPublish,
        sendTestEmail,
        isTauri
    };
})();
