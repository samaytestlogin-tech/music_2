const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

const cert = {
    _id: "test12345",
    candidateName: "John Doe",
    gradeLevel: "Grade 8",
    instrument: "Piano",
    day: "18th",
    month: "March",
    year: "2026",
    examCenter: "London Test Center",
    awardedGrade: "Distinction",
    chiefExaminerName: "Jane Smith",
    registrarName: "Robert Johnson",
    issuedAt: new Date().toISOString()
};

function generateTestPDF() {
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 50, right: 50 }
    });

    const outStream = fs.createWriteStream(path.join(__dirname, 'test_certificate.pdf'));
    doc.pipe(outStream);

    const W = doc.page.width;   // ~841
    const H = doc.page.height;  // ~595

    doc.image(path.join(__dirname, 'assets/certificate_bg.png'), 0, 0, {
        width: W,
        height: H
    });

    let y = 250;
    const centerX = W / 2;

    // 1. Candidate Name
    doc.font('Helvetica').fontSize(16).fillColor('#333')
        .text('This is to certify that:', 0, y, { align: 'center', width: W });
        
    y += 35;
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#1a2a6c')
        .text(cert.candidateName, 0, y, { align: 'center', width: W });
        
    y += 30;
    doc.moveTo(150, y).lineTo(W - 150, y).lineWidth(1).stroke('#999'); 
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

    doc.font('Helvetica').fontSize(8).fillColor('#999')
        .text(`Certificate ID: ${cert._id}  •  Issued: ${new Date(cert.issuedAt).toLocaleDateString()}`, 0, H - 28, {
            align: 'center', width: W
        });

    doc.end();
    console.log("PDF generated at test_certificate.pdf");
}

generateTestPDF();
