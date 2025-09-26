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

      const header = await db.run(SELECT.one.from('db.QC_HEADER').where({ SNORKEL_NO }));
      if (!header) return req.reject(404, `Header not found for ${SNORKEL_NO}`);

      const items = (await db.run(
        SELECT.from('db.QC_ITEM').where({ qC_HEADER_SNORKEL_NO: SNORKEL_NO })
      )) || [];

      const attachments = (await db.run(
        SELECT.from('db.QC_ATTACHMENTS').where({ 'qC_HEADER.SNORKEL_NO': SNORKEL_NO })
      )) || [];

      const tests = (await db.run(
        SELECT.from('db.QC_Test_Table').where({ 'qC_HEADER.SNORKEL_NO': SNORKEL_NO })
      )) || [];

      const measurements = (await db.run(
        SELECT.from('db.QC_MEASUREMENTS').where({ 'qC_HEADER.SNORKEL_NO': SNORKEL_NO })
      )) || [];

      const castings = (await db.run(
        SELECT.from('db.QC_CASTING').where({ 'qC_HEADER.SNORKEL_NO': SNORKEL_NO })
      )) || [];

      const checks = (await db.run(
        SELECT.from('db.QC_CHECK').where({ 'qC_HEADER.SNORKEL_NO': SNORKEL_NO })
      )) || [];

      const twentyPointFive = (await db.run(
        SELECT.from('db.TwentyPointFive').where({ 'qC_HEADER.SNORKEL_NO': SNORKEL_NO })
      )) || [];

      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ margin: 40 });
          const buffers = [];

          doc.on('data', chunk => buffers.push(chunk));
          doc.on('end', () => {
            const base64Content = Buffer.concat(buffers).toString('base64');
            resolve({
              filename: `QC_Report_${SNORKEL_NO}.pdf`,
              mimeType: 'application/pdf',
              content: base64Content
            });
          });

          const printFieldRow = (label, value) => {
            doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
            doc.font('Helvetica').text(value || '-');
          };

          // Exclude these keys from output
          const excludedFields = new Set([
            'id',
            'qc_header_snorkel_no',
            'createdat',
            'createdby',
            'modifiedat',
            'modifiedby'
          ]);

          // Print object fields, skipping excluded ones (case-insensitive)
          const printFilteredFields = (obj) => {
            Object.entries(obj).forEach(([k, v]) => {
              if (v && !excludedFields.has(k.toLowerCase())) {
                printFieldRow(k, v);
              }
            });
          };

          // Normalize strings for loose matching (spaces removed, lowercase, non-alphanumeric removed)
          const normalizeString = (str) =>
            str
              ? str.replace(/\s+/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\d+$/, '')
              : '';

          const looseMatch = (a, b) => {
            const normA = normalizeString(a);
            const normB = normalizeString(b);
            return normA.includes(normB) || normB.includes(normA);
          };

          const ensureSpace = (neededHeight) => {
            if (doc.y + neededHeight > doc.page.height - doc.page.margins.bottom) {
              doc.addPage();
            }
          };

          const lineHeight = 14;
          const sectionTitleHeight = 20;
          const imageHeight = 210;

          // ===== HEADER =====
          doc.rect(40, 40, doc.page.width - 80, 25).fill('#FFFF99');
          doc.fillColor('black').fontSize(16).font('Helvetica-Bold')
            .text(`${header.CUSTOMER_NAME} RH Snorkel Installation Record Sheet`, 45, 45, { align: 'center' });
          doc.moveDown(2);
          doc.fillColor('black').fontSize(10);

          printFieldRow('Snorkel No', header.SNORKEL_NO);
          printFieldRow('Customer Name', header.CUSTOMER_NAME);
          printFieldRow('Production No', header.PRODUCTION_NO);
          printFieldRow('Type', header.TYPE);
          printFieldRow('Date Started', header.DATE_STARTED);
          printFieldRow('Date Ended', header.DATE_ENDED);
          doc.moveDown();

          // ===== GROUP ITEMS BY QUESTION =====
          const groupedItems = {};
          items.forEach(item => {
            const question = item.QUESTION || 'No Question';
            if (!groupedItems[question]) groupedItems[question] = [];
            groupedItems[question].push(item);
          });

          const matchedAttachmentIds = new Set();

          Object.entries(groupedItems).forEach(([question, itemsArray]) => {
            itemsArray.forEach(item => {
              let neededHeight = sectionTitleHeight + lineHeight * 10;

              const relatedAttachments = attachments.filter(att =>
                item.QUESTION && att.question && looseMatch(item.QUESTION, att.question)
              );
              neededHeight += relatedAttachments.length * (imageHeight + 10);

              const relatedTests = tests.filter(test =>
                item.QUESTION && test.QUESTION && looseMatch(item.QUESTION, test.QUESTION)
              );
              neededHeight += relatedTests.length * lineHeight * 5;

              ensureSpace(neededHeight);

              doc.fontSize(12).fillColor('#0000CC').font('Helvetica-Bold')
                .text(`Section: ${question}`);
              doc.fillColor('black').font('Helvetica');

              if (item.DATE_INSPECTED) printFieldRow('Date Inspected', new Date(item.DATE_INSPECTED).toLocaleDateString());
              if (item.INSPECTED_BY) printFieldRow('Inspected By', item.INSPECTED_BY);
              if (item.METHOD) printFieldRow('Method', item.METHOD);
              if (item.ACTUAL_VALUE) printFieldRow('Actual Value', item.ACTUAL_VALUE);
              if (item.actualvalue) printFieldRow('Actual Value', item.actualvalue);
              if (item.TOLERANCE || item.tolerance) printFieldRow('Tolerance', item.TOLERANCE || item.tolerance);
              if (item.COMMENTS) printFieldRow('Comments', item.COMMENTS);
              if (item.CORRECTIVE_ACTION) printFieldRow('Corrective Action', item.CORRECTIVE_ACTION);
              if (item.WORK_ITEM_DESCRIPTION) printFieldRow('Work Item Desc', item.WORK_ITEM_DESCRIPTION);
              if (item.WorkProcessStep) printFieldRow('Work Process Step', item.WorkProcessStep);
              if (item.POSITION) printFieldRow('Position', item.POSITION);
              if (item.SECTION_NO) printFieldRow('Section No', item.SECTION_NO);

              if (item.DECISION_TAKEN) {
                doc.font('Helvetica-Bold').text('Decision Taken: ', { continued: true });
                doc.fillColor(item.DECISION_TAKEN.toLowerCase() === 'ok' ? 'green' : 'red')
                  .text(item.DECISION_TAKEN);
                doc.fillColor('black');
              }

              doc.moveDown();

              // Render related attachments
              for (const att of relatedAttachments) {
                matchedAttachmentIds.add(att.ID);
                try {
                  if (att.file && att.file.trim()) {
                    const buffer = Buffer.from(att.file, 'base64');
                    ensureSpace(imageHeight + 10);
                    doc.image(buffer, { fit: [300, 200], align: 'center' });
                    doc.moveDown();
                  } else {
                    doc.fontSize(9).fillColor('red').text('No image data available').fillColor('black');
                    doc.moveDown();
                  }
                } catch {
                  doc.fontSize(9).fillColor('red').text('Image error').fillColor('black');
                  doc.moveDown();
                }
              }

              // Render related tests
              for (const test of relatedTests) {
                ensureSpace(lineHeight * 6);

                doc.fontSize(12).fillColor('#0000CC').font('Helvetica-Bold')
                  .text(`Test: ${test.testname || '-'}`);
                doc.fillColor('black').font('Helvetica');
                printFilteredFields(test);
                doc.moveDown();
              }

              // Separator line
              doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#999999').stroke();
              doc.moveDown();
            });
          });

          // ===== MEASUREMENTS =====
          if (measurements.length) {
            doc.fontSize(14).fillColor('#0000CC').font('Helvetica-Bold').text('Measurements');
            doc.fontSize(10).fillColor('black');
            measurements.forEach(m => {
              ensureSpace(lineHeight * 10);
              printFilteredFields(m);
              doc.moveDown();
            });
          }

          // ===== CASTING =====
          if (castings.length) {
            doc.fontSize(14).fillColor('#0000CC').font('Helvetica-Bold').text('Casting');
            doc.fontSize(10).fillColor('black');
            castings.forEach(c => {
              ensureSpace(lineHeight * 10);
              printFilteredFields(c);
              doc.moveDown();
            });
          }

          // ===== FINAL CHECK =====
          if (checks.length) {
            doc.fontSize(14).fillColor('#0000CC').font('Helvetica-Bold').text('Final Check');
            doc.fontSize(10).fillColor('black');
            checks.forEach(c => {
              ensureSpace(lineHeight * 10);
              printFilteredFields(c);
              doc.moveDown();
            });
          }

          // ===== 20.5 TESTS =====
          if (twentyPointFive.length) {
            doc.fontSize(14).fillColor('#0000CC').font('Helvetica-Bold').text('20.5 Tests');
            doc.fontSize(10).fillColor('black');
            twentyPointFive.forEach(t => {
              ensureSpace(lineHeight * 10);
              printFilteredFields(t);
              doc.moveDown();
            });
          }

          // ===== REMAINING ATTACHMENTS (not matched) =====
          const remainingAttachments = attachments.filter(att => !matchedAttachmentIds.has(att.ID));
          if (remainingAttachments.length) {
            doc.fontSize(14).fillColor('#0000CC').font('Helvetica-Bold').text('Final Inspection Attachments');
            doc.fontSize(10).fillColor('black');
            for (const att of remainingAttachments) {
              try {
                if (att.file && att.file.trim()) {
                  const buffer = Buffer.from(att.file, 'base64');
                  ensureSpace(imageHeight + 10);
                  doc.image(buffer, { fit: [300, 200], align: 'center' });
                  doc.moveDown();
                }
              } catch {
                doc.fontSize(9).fillColor('red').text('Image error').fillColor('black');
                doc.moveDown();
              }
            }
          }

          doc.end();

        } catch (err) {
          reject(err);
        }
      });

    } catch (err) {
      return req.reject(err);
    }
  });


});
