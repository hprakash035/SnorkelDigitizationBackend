const cds = require('@sap/cds');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');

module.exports = cds.service.impl(async function () {
  const { QC_HEADER, QC_ITEM, QC_ATTACHMENTS, QC_TEST_TABLE } = this.entities;
  // this.before('CREATE', QC_HEADER, async (req) => {
  //   if (req.data.DRAFT_FLAG === undefined) {
  //     req.data.DRAFT_FLAG = true;
  //   }

  //   const type = req.data.TYPE;

  //   if (!type || !['inlet', 'outlet'].includes(type.toLowerCase())) {
  //     return req.error(400, 'Please provide a valid "type": "inlet" or "outlet".');
  //   }

  //   const suffix = type.toLowerCase() === 'inlet' ? 'U' : 'D';
  //   const db = cds.transaction(req);

  //   // Set DATE_STARTED to current system date and time
  //   req.data.DATE_STARTED = new Date().toISOString();

  //   const result = await db.run(SELECT.from(QC_HEADER).columns('SNORKEL_NO'));

  //   let maxNum = 0;
  //   for (const row of result) {
  //     const match = row.SNORKEL_NO.match(/^(\d+)[UD]$/);
  //     if (match) {
  //       const num = parseInt(match[1], 10);
  //       if (num > maxNum) maxNum = num;
  //     }
  //   }

  //   const nextNumber = String(maxNum + 1).padStart(4, '0') + suffix;
  //   req.data.SNORKEL_NO = nextNumber;

  //   delete req.data.type; // Ensure it's not stored
  // });

 
  this.on('generateQCReport', async (req) => {
        try {
            const { SNORKEL_NO } = req.data;
            const db = cds.transaction(req);

            // Fetch header
            const header = await db.run(
                SELECT.one.from('db.QC_HEADER').where({ SNORKEL_NO })
            );
            if (!header) return req.reject(404, `Header not found for ${SNORKEL_NO}`);

            // Fetch items with related tests and attachments
         const items = await cds.transaction(req).run(
  SELECT.from('db.QC_ITEM')
    .where({ qC_HEADER_SNORKEL_NO: SNORKEL_NO })
    .columns(
      'SECTION_NO', 'QUESTION', 'ACTUAL_VALUE', 'TOLERANCE', 'INSPECTED_BY', 'METHOD', 'DECISION_TAKEN', 'COMMENTS', 'CORRECTIVE_ACTION', 'DATE_INSPECTED',
      { qc_TESTS: ['sheetNo', 'actualvalue', 'date', 'ff1', 'ff2', 'fluidity', 'method', 'no', 'position', 'powderweight', 'remark', 'settleduration', 'spec', 'specification', 'testNo', 'testname', 'tf1', 'tf2', 'tolerance', 'vibration', 'watercasting', 'batchNo'] },
      { aTTACHMENTS: ['file', 'mimeType', 'name', 'sectionNo', 'question'] }
    )
);



            return new Promise((resolve, reject) => {
                try {
                    const doc = new PDFDocument({ margin: 40 });
                    const buffers = [];
                    const renderedImages = new Set();

                    doc.on('data', chunk => buffers.push(chunk));
                    doc.on('end', () => {
                        const base64Content = Buffer.concat(buffers).toString('base64');
                        resolve({
                            filename: `QC_Report_${SNORKEL_NO}.pdf`,
                            mimeType: 'application/pdf',
                            content: base64Content
                        });
                    });

                    // Print a label-value row
                    const printFieldRow = (label, value) => {
                        doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
                        doc.font('Helvetica').text(value || '-');
                    };

                    // PDF Title Header
                    doc.rect(40, 40, doc.page.width - 80, 25).fill('#FFFF99');
                    doc.fillColor('black').fontSize(16).font('Helvetica-Bold')
                       .text(`${header.CUSTOMER_NAME || '-'} RH Snorkel Installation Record Sheet`, 45, 45, { align: 'center' });
                    doc.moveDown(2).fontSize(10).fillColor('black');

                    // Header Info
                    printFieldRow('Snorkel No', header.SNORKEL_NO);
                    printFieldRow('Sheet No', header.SHEET_NO);
                    printFieldRow('Date Started', header.DATE_STARTED);
                    printFieldRow('Date Ended', header.DATE_ENDED);
                    printFieldRow('Type', header.TYPE);
                    printFieldRow('Production No', header.PRODUCTION_NO);
                    doc.moveDown();

                    // Sort items by inspected date
                    const sortedItems = items
                        .map(item => ({ ...item, _dateInspected: item.DATE_INSPECTED ? new Date(item.DATE_INSPECTED) : null }))
                        .filter(item => item._dateInspected !== null)
                        .sort((a, b) => a._dateInspected - b._dateInspected);

                    // Render each item
                    sortedItems.forEach(item => {
                        doc.fontSize(12).fillColor('#0000CC').font('Helvetica-Bold')
                            .text(`Section: ${item.QUESTION || '-'}`);
                        doc.fillColor('black').font('Helvetica');
                        if (item._dateInspected) printFieldRow('Date Inspected', item._dateInspected.toLocaleDateString());

                        // Standard fields
                        const fields = [
                            ['Inspected By', item.INSPECTED_BY],
                            ['Method', item.METHOD],
                            ['Actual Value', item.ACTUAL_VALUE],
                            ['Tolerance', item.TOLERANCE],
                            ['Comments', item.COMMENTS],
                            ['Corrective Action', item.CORRECTIVE_ACTION]
                        ];
                        fields.forEach(([label, val]) => val && printFieldRow(label, val));

                        if (item.DECISION_TAKEN) {
                            doc.font('Helvetica-Bold').text('Decision Taken: ', { continued: true });
                            doc.fillColor(item.DECISION_TAKEN.toLowerCase() === 'ok' ? 'green' : 'red')
                                .text(item.DECISION_TAKEN);
                            doc.fillColor('black');
                        }

                        doc.moveDown();

                        // Render related QC_TESTS dynamically (only columns with data)
                        if (item.qc_TESTS && item.qc_TESTS.length > 0) {
                            item.qc_TESTS.forEach(test => {
                                doc.font('Helvetica-Bold').text(`Test: ${test.testname || '-'}`);
                                const testFields = Object.entries(test)
                                    .filter(([k, v]) => k !== 'qC_ITEM' && k !== 'ID' && k !== 'createdAt' && k !== 'modifiedAt' && v)
                                    .map(([k, v]) => [k, v]);
                                testFields.forEach(([label, val]) => printFieldRow(label, val));
                                doc.moveDown();
                            });
                        }

                        // Render related attachments
                        if (item.aTTACHMENTS && item.aTTACHMENTS.length > 0) {
                            item.aTTACHMENTS.forEach(att => {
                                if (att.file && !renderedImages.has(att.file)) {
                                    doc.fontSize(12).fillColor('#0000CC').font('Helvetica-Bold')
                                        .text(`Attachment - Section: ${att.sectionNo || '-'} / Question: ${att.question || '-'}`);
                                    doc.font('Helvetica').fillColor('black');
                                    try {
                                        const buffer = Buffer.from(att.file, 'base64');
                                        doc.image(buffer, { fit: [400, 300], align: 'center' });
                                        renderedImages.add(att.file);
                                    } catch {
                                        doc.fontSize(9).fillColor('red').text('Image error').fillColor('black');
                                    }
                                    doc.moveDown();
                                }
                            });
                        }

                        // Divider line
                        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#999999').stroke();
                        doc.moveDown();
                    });

                    // Final Inspection Tables (QC_MEASUREMENTS, QC_CASTING, QC_CHECK)
                    const finalTables = [
                        { title: 'QC Measurements', entity: 'db.QC_MEASUREMENTS' },
                        { title: 'QC Casting', entity: 'db.QC_CASTING' },
                        { title: 'QC Check', entity: 'db.QC_CHECK' }
                    ];

                    (async () => {
                        for (const { title, entity } of finalTables) {
                            const rows = await db.run(
                                SELECT.from(entity).where({ 'qC_HEADER.SNORKEL_NO': SNORKEL_NO }).columns('*')
                            ) || [];
                            if (rows.length > 0) {
                                doc.addPage();
                                doc.fontSize(14).fillColor('#0000CC').font('Helvetica-Bold').text(title);
                                doc.moveDown(0.5);
                                rows.forEach(row => {
                                    Object.entries(row).forEach(([k, v]) => {
                                        if (k !== 'qC_HEADER' && v) printFieldRow(k, v);
                                    });
                                    doc.moveDown();
                                    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#999999').stroke();
                                    doc.moveDown();
                                });
                            }
                        }
                        doc.end();
                    })();

                } catch (pdfError) {
                    console.error('PDF generation error:', pdfError);
                    reject(new Error('Failed to generate PDF'));
                }
            });

        } catch (err) {
            console.error('Error in generateQCReport:', err);
            req.reject(500, 'Internal Server Error while generating QC Report');
        }
    });
});
