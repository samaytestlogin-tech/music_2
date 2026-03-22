const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const { protect } = require('../middleware/authMiddleware');
const path = require('path');

// @route   GET /api/certificates/:id/pdf
// @desc    Generate and stream the AUSS certificate PDF for a given certificate ID
//          Accessible by the student who owns it or admins
router.get('/:id/pdf', protect, async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id);
        if (!cert) return res.status(404).json({ error: 'Certificate not found' });

        // Only admin or the student who owns it can download
        if (req.user.role !== 'admin' && cert.student_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margins: { top: 40, bottom: 40, left: 50, right: 50 }
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="certificate-${cert.candidateName.replace(/\s+/g, '_')}.pdf"`
        );
        doc.pipe(res);

        const W = doc.page.width;   // ~841
        const H = doc.page.height;  // ~595

        // Draw the beautiful background template
        doc.image(path.join(__dirname, '../assets/certificate_bg.png'), 0, 0, {
            width: W,
            height: H
        });

        // The image already includes:
        // - Gold Borders & Ornaments
        // - Logo & "AMERICAN UNIVERSITY OF ..."
        // - "OFFICIAL CERTIFICATE OF COMPLETION"

        // ─── Dynamic Text Placement over Template ───
        
        // We need to carefully position the text so it rests perfectly on the empty canvas areas.
        // Assuming the template matches the reference exactly, let's place the variables.
        // The Y coordinates will need to be aligned with where the underlines are in the template image.
        
        let y = 250; // Approximating the first line "This is to certify that: [NAME]"
        const centerX = W / 2;

        // "This is to certify that:" text is now already part of the template or not? 
        // Wait, the generated template REMOVED those texts. 
        // Let's re-add the labels along with the dynamic text, just without the lines because we can just place text.
        // Actually, the prompt asked to keep "AMERICAN UNIV..." and "OFFICIAL CERT..." and remove the written fields.
        // So we need to put back the text "This is to certify that:" 

        // 1. Candidate Name
        doc.font('Helvetica').fontSize(16).fillColor('#333')
            .text('This is to certify that:', 0, y, { align: 'center', width: W });
            
        y += 35;
        doc.font('Helvetica-Bold').fontSize(24).fillColor('#1a2a6c')
            .text(cert.candidateName, 0, y, { align: 'center', width: W });
            
        y += 30;
        doc.moveTo(150, y).lineTo(W - 150, y).lineWidth(1).stroke('#999'); // Add an underline
        y += 5;
        doc.font('Helvetica').fontSize(10).fillColor('#666')
            .text('(Full Name of Candidate)', 0, y, { align: 'center', width: W });

        // 2. Grade and Instrument
        y += 40;
        doc.font('Helvetica').fontSize(16).fillColor('#333')
            .text('has successfully completed the Music Examination for:', 0, y, { align: 'center', width: W });

        y += 30;
        const gradeLine = `${cert.gradeLevel}${cert.instrument ? ' — ' + cert.instrument : ''}`;
        doc.font('Helvetica-Bold').fontSize(20).fillColor('#1a2a6c')
            .text(gradeLine, 0, y, { align: 'center', width: W });
        
        y += 25;
        doc.moveTo(150, y).lineTo(W - 150, y).lineWidth(1).stroke('#999');
        y += 5;
        doc.font('Helvetica').fontSize(10).fillColor('#666')
            .text('(Grade/Level and Instrument)', 0, y, { align: 'center', width: W });

        // 3. Date
        y += 45;
        // e.g. "on the date of: 15 Day of March, 2026"
        const dateText = `on the date of:   ${cert.day}   Day of   ${cert.month},   20${cert.year.slice(-2)}`;
        doc.font('Helvetica').fontSize(16).fillColor('#333')
            .text(dateText, 0, y, { align: 'center', width: W });

        // 4. Center Location
        y += 40;
        doc.font('Helvetica').fontSize(16).fillColor('#333')
            .text(`at:   ${cert.examCenter}`, 0, y, { align: 'center', width: W });
            
        y += 22;
        doc.moveTo(200, y).lineTo(W - 200, y).lineWidth(1).stroke('#999');
        y += 5;
        doc.font('Helvetica').fontSize(10).fillColor('#666')
            .text('(Examination Center Location)', 0, y, { align: 'center', width: W });

        // 5. Result
        y += 40;
        doc.font('Helvetica').fontSize(16).fillColor('#333')
            .text(`Result:   ${cert.awardedGrade}`, 0, y, { align: 'center', width: W });
            
        y += 22;
        doc.moveTo(250, y).lineTo(W - 250, y).lineWidth(1).stroke('#999');
        y += 5;
        doc.font('Helvetica').fontSize(10).fillColor('#666')
            .text('(Awarded Grade/Award)', 0, y, { align: 'center', width: W });

        // 6. Privileges
        y += 35;
        doc.font('Helvetica').fontSize(13).fillColor('#222')
            .text('With all rights and privileges thereunto appertaining.', 0, y, { align: 'center', width: W });

        // ─── Signatures (Bottom) ───
        const sigY = H - 90;
        
        // Chief Examiner (Left)
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a2a6c')
            .text('CHIEF EXAMINER', 120, sigY, { width: 200, align: 'center' });
        doc.moveTo(120, sigY + 30).lineTo(320, sigY + 30).lineWidth(1).stroke('#555');
        doc.font('Helvetica-Oblique').fontSize(14).fillColor('#333')
            .text(cert.chiefExaminerName || 'Approved', 120, sigY + 12, { width: 200, align: 'center' });
        doc.font('Helvetica').fontSize(9).fillColor('#666')
            .text('[Printed Name]', 120, sigY + 35, { width: 200, align: 'center' });

        // Registrar (Right)
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a2a6c')
            .text('UNIVERSITY REGISTRAR', W - 320, sigY, { width: 200, align: 'center' });
        doc.moveTo(W - 320, sigY + 30).lineTo(W - 120, sigY + 30).lineWidth(1).stroke('#555');
        doc.font('Helvetica-Oblique').fontSize(14).fillColor('#333')
            .text(cert.registrarName || 'Approved', W - 320, sigY + 12, { width: 200, align: 'center' });
        doc.font('Helvetica').fontSize(9).fillColor('#666')
            .text('[Printed Name]', W - 320, sigY + 35, { width: 200, align: 'center' });

        // ─── Footer ───────────────────────────────────────────────────────────────
        doc.font('Helvetica').fontSize(8).fillColor('#999')
            .text(`Certificate ID: ${cert._id}  •  Issued: ${new Date(cert.issuedAt).toLocaleDateString()}`, 0, H - 28, {
                align: 'center', width: W
            });

        doc.end();
    } catch (error) {
        console.error('PDF generation error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate PDF' });
        }
    }
});

module.exports = router;
