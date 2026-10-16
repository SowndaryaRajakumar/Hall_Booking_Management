const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const normalizeStatus = (status = '') => {
  const value = String(status || '').trim().toLowerCase();
  const statusMap = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  };
  return statusMap[value] || (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Pending');
};

const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return '-';
  const parts = String(timeStr).split(':');
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10);
    const min = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${String(hour).padStart(2, '0')}:${min} ${ampm}`;
  }
  return timeStr;
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '-';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [_, y, m, d] = match;
    return `${d}-${m}-${y}`;
  }
  return String(dateStr);
};

const formatCurrentTimestamp = () => {
  const now = new Date();
  const options = {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  return now.toLocaleString('en-IN', options);
};

/**
 * Retrieve booking report dataset dynamically from the database
 */
const getReportDataset = async (filters = {}, isExportAll = false) => {
  const whereConditions = [];
  const params = [];

  if (!isExportAll) {
    if (filters.fromDate && String(filters.fromDate).trim()) {
      whereConditions.push('b.date >= ?');
      params.push(String(filters.fromDate).trim().slice(0, 10));
    }

    if (filters.toDate && String(filters.toDate).trim()) {
      whereConditions.push('b.date <= ?');
      params.push(String(filters.toDate).trim().slice(0, 10));
    }

    if (filters.venueId && filters.venueId !== 'all') {
      whereConditions.push('b.hall_id = ?');
      params.push(Number(filters.venueId));
    }

    if (filters.departmentId && filters.departmentId !== 'all') {
      whereConditions.push('(h.DeptID = ? OR s.department = (SELECT DeptName FROM Departments WHERE DeptID = ? LIMIT 1))');
      params.push(Number(filters.departmentId), Number(filters.departmentId));
    }

    if (filters.facultyId && filters.facultyId !== 'all') {
      whereConditions.push('(b.staff_id = ? OR b.staff_email = (SELECT email FROM staff WHERE staff_id = ? LIMIT 1))');
      params.push(Number(filters.facultyId), Number(filters.facultyId));
    }

    if (filters.status && String(filters.status).toLowerCase() !== 'all') {
      whereConditions.push('LOWER(b.status) = LOWER(?)');
      params.push(String(filters.status).trim());
    }

    if (filters.search && String(filters.search).trim()) {
      whereConditions.push('(b.staff_name LIKE ? OR b.staff_email LIKE ? OR b.hall_name LIKE ? OR b.reason LIKE ? OR CAST(b.id AS CHAR) LIKE ?)');
      const term = `%${String(filters.search).trim()}%`;
      params.push(term, term, term, term, term);
    }
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      b.id,
      b.hall_id,
      b.hall_name,
      b.staff_name,
      b.staff_email,
      b.staff_phone,
      b.reason,
      DATE_FORMAT(b.date, '%Y-%m-%d') AS booking_date,
      b.time_from,
      b.time_to,
      b.status,
      b.remarks,
      DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i:%s') AS created_at_formatted,
      COALESCE(s.department, vd.DeptName, 'General') AS department,
      COALESCE(h.VenueType, 'Standard') AS venue_type,
      COALESCE(h.Location, 'N/A') AS location
    FROM bookings b
    LEFT JOIN Halls h ON b.hall_id = h.HallID
    LEFT JOIN Departments vd ON h.DeptID = vd.DeptID
    LEFT JOIN staff s ON (b.staff_id = s.staff_id OR (b.staff_id = 0 AND b.staff_email = s.email))
    ${whereClause}
    ORDER BY b.date DESC, b.time_from ASC, b.id DESC
  `;

  const [rows] = await pool.query(sql, params);

  const normalizedRows = rows.map((r) => ({
    ...r,
    status: normalizeStatus(r.status),
    formatted_date: formatDateDisplay(r.booking_date),
    formatted_time: `${formatTimeDisplay(r.time_from)} - ${formatTimeDisplay(r.time_to)}`,
    display_purpose: r.reason || 'N/A',
    display_remarks: r.remarks || 'None',
    display_phone: r.staff_phone || 'N/A',
  }));

  const totalBookings = normalizedRows.length;
  let approved = 0;
  let pending = 0;
  let rejected = 0;
  let cancelled = 0;

  normalizedRows.forEach((r) => {
    const s = r.status.toLowerCase();
    if (s === 'approved') approved++;
    else if (s === 'pending') pending++;
    else if (s === 'rejected') rejected++;
    else if (s === 'cancelled') cancelled++;
  });

  return {
    rows: normalizedRows,
    summary: {
      totalBookings,
      approved,
      pending,
      rejected,
      cancelled,
    },
  };
};

/**
 * Resolve human-readable filter descriptions for report metadata
 */
const getFilterMeta = async (filters = {}, isExportAll = false) => {
  if (isExportAll) {
    return {
      reportType: 'Complete Report',
      filterString: 'All Records',
      details: [
        { label: 'Date', value: 'All Dates' },
        { label: 'Venue', value: 'All Venues' },
        { label: 'Department', value: 'All Departments' },
        { label: 'Faculty', value: 'All Faculty' },
        { label: 'Status', value: 'All Statuses' },
        { label: 'Search', value: 'None' },
      ],
    };
  }

  const details = [];

  // Date filter
  if (filters.fromDate && filters.toDate) {
    details.push({ label: 'Date', value: `${formatDateDisplay(filters.fromDate)} to ${formatDateDisplay(filters.toDate)}` });
  } else if (filters.fromDate) {
    details.push({ label: 'Date', value: `From ${formatDateDisplay(filters.fromDate)}` });
  } else if (filters.toDate) {
    details.push({ label: 'Date', value: `Up to ${formatDateDisplay(filters.toDate)}` });
  } else {
    details.push({ label: 'Date', value: 'All Dates' });
  }

  // Venue filter
  if (filters.venueId && filters.venueId !== 'all') {
    try {
      const [rows] = await pool.query('SELECT HallName FROM Halls WHERE HallID = ? LIMIT 1', [Number(filters.venueId)]);
      details.push({ label: 'Venue', value: rows[0]?.HallName || `Venue #${filters.venueId}` });
    } catch {
      details.push({ label: 'Venue', value: `Venue #${filters.venueId}` });
    }
  } else {
    details.push({ label: 'Venue', value: 'All Venues' });
  }

  // Department filter
  if (filters.departmentId && filters.departmentId !== 'all') {
    try {
      const [rows] = await pool.query('SELECT DeptName FROM Departments WHERE DeptID = ? LIMIT 1', [Number(filters.departmentId)]);
      details.push({ label: 'Department', value: rows[0]?.DeptName || `Dept #${filters.departmentId}` });
    } catch {
      details.push({ label: 'Department', value: `Dept #${filters.departmentId}` });
    }
  } else {
    details.push({ label: 'Department', value: 'All Departments' });
  }

  // Faculty filter
  if (filters.facultyId && filters.facultyId !== 'all') {
    try {
      const [rows] = await pool.query('SELECT full_name FROM staff WHERE staff_id = ? LIMIT 1', [Number(filters.facultyId)]);
      details.push({ label: 'Faculty', value: rows[0]?.full_name || `Faculty #${filters.facultyId}` });
    } catch {
      details.push({ label: 'Faculty', value: `Faculty #${filters.facultyId}` });
    }
  } else {
    details.push({ label: 'Faculty', value: 'All Faculty' });
  }

  // Status filter
  if (filters.status && String(filters.status).toLowerCase() !== 'all') {
    details.push({ label: 'Status', value: normalizeStatus(filters.status) });
  } else {
    details.push({ label: 'Status', value: 'All Statuses' });
  }

  // Search filter
  if (filters.search && String(filters.search).trim()) {
    details.push({ label: 'Search', value: `"${String(filters.search).trim()}"` });
  }

  const activeFilters = details.filter((d) => !d.value.startsWith('All') && d.value !== 'None');
  const filterString = activeFilters.length > 0
    ? activeFilters.map((d) => `${d.label}: ${d.value}`).join(' | ')
    : 'All Records';

  return {
    reportType: 'Filtered Report',
    filterString,
    details,
  };
};

/**
 * Generate formatted PDF Report using PDFKit
 */
const generateReportPdf = async (dataset, meta) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margins: { top: 32, bottom: 42, left: 32, right: 32 },
        bufferPages: true,
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const printableWidth = doc.page.width - 64; // 841.89 - 64 = 777.89 pt
      const generatedOn = formatCurrentTimestamp();

      // Top Header Accent Bar
      doc.rect(32, 28, printableWidth, 4).fill('#1E3A8A');

      // Title & Header Information
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1E3A8A').text('NEC SMART VENUE MANAGEMENT', 32, 38, {
        align: 'left',
      });
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#475569').text('BOOKING REPORT', 32, 58, {
        align: 'left',
      });

      // Right header details (Generated On & Report Type)
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1E293B').text(`Generated On: ${generatedOn}`, 32, 38, {
        align: 'right',
        width: printableWidth,
      });
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(meta.reportType === 'Filtered Report' ? '#B45309' : '#15803D').text(`Report Type: ${meta.reportType}`, 32, 50, {
        align: 'right',
        width: printableWidth,
      });
      doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Applied Filters: ${meta.filterString}`, 32, 62, {
        align: 'right',
        width: printableWidth,
      });

      // Thin separator
      doc.moveTo(32, 78).lineTo(32 + printableWidth, 78).strokeColor('#E2E8F0').lineWidth(0.75).stroke();

      // Summary Metric Cards
      const cardWidth = (printableWidth - 32) / 5;
      const cardHeight = 44;
      const cardY = 86;

      const summaryCards = [
        { label: 'Total Bookings', value: dataset.summary.totalBookings, bg: '#F8FAFC', border: '#CBD5E1', color: '#1E293B' },
        { label: 'Approved', value: dataset.summary.approved, bg: '#F0FDF4', border: '#86EFAC', color: '#15803D' },
        { label: 'Pending', value: dataset.summary.pending, bg: '#FFFBEB', border: '#FDE68A', color: '#B45309' },
        { label: 'Rejected', value: dataset.summary.rejected, bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' },
        { label: 'Cancelled', value: dataset.summary.cancelled, bg: '#F1F5F9', border: '#CBD5E1', color: '#475569' },
      ];

      summaryCards.forEach((card, idx) => {
        const x = 32 + idx * (cardWidth + 8);
        doc.roundedRect(x, cardY, cardWidth, cardHeight, 4).fillColor(card.bg).fill();
        doc.roundedRect(x, cardY, cardWidth, cardHeight, 4).strokeColor(card.border).lineWidth(1).stroke();

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(card.color).text(card.label.toUpperCase(), x + 8, cardY + 7, {
          width: cardWidth - 16,
          align: 'left',
        });
        doc.fontSize(14).font('Helvetica-Bold').fillColor(card.color).text(String(card.value), x + 8, cardY + 20, {
          width: cardWidth - 16,
          align: 'left',
        });
      });

      // Table Definition
      // Columns: ID, Faculty, Department, Venue, Date, Start Time, End Time, Purpose, Status
      const columns = [
        { key: 'id', title: 'ID', width: 32, align: 'center' },
        { key: 'staff_name', title: 'Faculty', width: 92, align: 'left' },
        { key: 'department', title: 'Department', width: 85, align: 'left' },
        { key: 'hall_name', title: 'Venue', width: 80, align: 'left' },
        { key: 'formatted_date', title: 'Date', width: 68, align: 'center' },
        { key: 'formatted_time', title: 'Time Slot', width: 95, align: 'center' },
        { key: 'display_purpose', title: 'Purpose', width: 145, align: 'left' },
        { key: 'status', title: 'Status', width: 68, align: 'center' },
        { key: 'display_remarks', title: 'Remarks', width: 110, align: 'left' },
      ];

      const headerHeight = 22;
      const maxY = doc.page.height - 46;

      const drawTableHeader = (y) => {
        // Background
        doc.rect(32, y, printableWidth, headerHeight).fillColor('#1E3A8A').fill();
        let curX = 32;
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
        columns.forEach((col) => {
          doc.text(col.title, curX + 3, y + 6, {
            width: col.width - 6,
            align: col.align,
          });
          curX += col.width;
        });
        return y + headerHeight;
      };

      let curY = drawTableHeader(140);

      // Render Rows
      dataset.rows.forEach((row, rowIndex) => {
        // Measure row height
        doc.font('Helvetica').fontSize(7.5);
        const purposeH = doc.heightOfString(row.display_purpose || '', { width: 145 - 6 });
        const remarksH = doc.heightOfString(row.display_remarks || '', { width: 110 - 6 });
        const facultyH = doc.heightOfString(row.staff_name || '', { width: 92 - 6 });
        const deptH = doc.heightOfString(row.department || '', { width: 85 - 6 });
        const venueH = doc.heightOfString(row.hall_name || '', { width: 80 - 6 });

        const contentH = Math.max(purposeH, remarksH, facultyH, deptH, venueH, 12);
        const rowH = Math.min(Math.max(contentH + 10, 20), 65);

        // Check page overflow
        if (curY + rowH > maxY) {
          doc.addPage();
          curY = drawTableHeader(32);
        }

        // Zebra striping
        const isEven = rowIndex % 2 === 0;
        doc.rect(32, curY, printableWidth, rowH).fillColor(isEven ? '#FFFFFF' : '#F8FAFC').fill();

        // Border bottom
        doc.moveTo(32, curY + rowH).lineTo(32 + printableWidth, curY + rowH).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

        let curX = 32;
        columns.forEach((col) => {
          const val = String(row[col.key] || '');

          if (col.key === 'status') {
            const st = val.toLowerCase();
            let pillColor = '#475569';
            let pillBg = '#F1F5F9';
            if (st === 'approved') {
              pillColor = '#15803D';
              pillBg = '#DCFCE7';
            } else if (st === 'pending') {
              pillColor = '#B45309';
              pillBg = '#FEF3C7';
            } else if (st === 'rejected') {
              pillColor = '#B91C1C';
              pillBg = '#FEE2E2';
            }

            const badgeW = 54;
            const badgeH = 13;
            const badgeX = curX + (col.width - badgeW) / 2;
            const badgeY = curY + (rowH - badgeH) / 2;

            doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3).fillColor(pillBg).fill();
            doc.font('Helvetica-Bold').fontSize(7).fillColor(pillColor).text(val, badgeX, badgeY + 2.5, {
              width: badgeW,
              align: 'center',
            });
          } else {
            doc.font(col.key === 'id' ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5).fillColor('#1E293B');
            doc.text(val, curX + 3, curY + 5, {
              width: col.width - 6,
              align: col.align,
              height: rowH - 6,
              ellipsis: true,
            });
          }

          curX += col.width;
        });

        curY += rowH;
      });

      // Add Page Numbers and Footer to all pages
      const pageRange = doc.bufferedPageRange();
      for (let i = 0; i < pageRange.count; i++) {
        doc.switchToPage(i);
        doc.moveTo(32, doc.page.height - 28).lineTo(32 + printableWidth, doc.page.height - 28).strokeColor('#E2E8F0').lineWidth(0.75).stroke();
        doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(
          'Generated by NEC Smart Venue Management System',
          32,
          doc.page.height - 22,
          { align: 'left', width: printableWidth / 2 }
        );
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748B').text(
          `Page ${i + 1} of ${pageRange.count}`,
          32 + printableWidth / 2,
          doc.page.height - 22,
          { align: 'right', width: printableWidth / 2 }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate formatted Excel Report using ExcelJS
 */
const generateReportExcel = async (dataset, meta) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NEC Smart Venue Management System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Booking Report', {
    views: [{ state: 'frozen', ySplit: 11 }],
  });

  const generatedOn = formatCurrentTimestamp();

  // 1. Title Block
  const titleRow = sheet.addRow(['NEC SMART VENUE MANAGEMENT']);
  titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };

  const subTitleRow = sheet.addRow(['BOOKING REPORT']);
  subTitleRow.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF475569' } };

  sheet.addRow([]); // Blank line

  // 2. Metadata Block
  const metaRow1 = sheet.addRow(['Generated On:', generatedOn, '', 'Report Type:', meta.reportType.toUpperCase()]);
  metaRow1.getCell(1).font = { bold: true, color: { argb: 'FF334155' } };
  metaRow1.getCell(4).font = { bold: true, color: { argb: 'FF334155' } };
  metaRow1.getCell(5).font = {
    bold: true,
    color: { argb: meta.reportType === 'Filtered Report' ? 'FFD97706' : 'FF15803D' },
  };

  const metaRow2 = sheet.addRow(['Applied Filters:', meta.filterString]);
  metaRow2.getCell(1).font = { bold: true, color: { argb: 'FF334155' } };

  sheet.addRow([]); // Blank line

  // 3. Summary Statistics Section
  const summaryHeaderRow = sheet.addRow(['Summary Statistics']);
  summaryHeaderRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  summaryHeaderRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' },
  };

  const summaryLabelsRow = sheet.addRow(['Total Bookings', 'Approved', 'Pending', 'Rejected', 'Cancelled']);
  summaryLabelsRow.font = { bold: true, size: 9.5, color: { argb: 'FF334155' } };
  for (let c = 1; c <= 5; c++) {
    summaryLabelsRow.getCell(c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    summaryLabelsRow.getCell(c).alignment = { horizontal: 'center' };
    summaryLabelsRow.getCell(c).border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  }

  const summaryValuesRow = sheet.addRow([
    dataset.summary.totalBookings,
    dataset.summary.approved,
    dataset.summary.pending,
    dataset.summary.rejected,
    dataset.summary.cancelled,
  ]);
  summaryValuesRow.font = { bold: true, size: 12 };
  summaryValuesRow.getCell(1).font = { bold: true, color: { argb: 'FF1E293B' }, size: 12 };
  summaryValuesRow.getCell(2).font = { bold: true, color: { argb: 'FF15803D' }, size: 12 };
  summaryValuesRow.getCell(3).font = { bold: true, color: { argb: 'FFB45309' }, size: 12 };
  summaryValuesRow.getCell(4).font = { bold: true, color: { argb: 'FFDC2626' }, size: 12 };
  summaryValuesRow.getCell(5).font = { bold: true, color: { argb: 'FF475569' }, size: 12 };
  for (let c = 1; c <= 5; c++) {
    summaryValuesRow.getCell(c).alignment = { horizontal: 'center' };
    summaryValuesRow.getCell(c).border = {
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  }

  sheet.addRow([]); // Blank line

  // 4. Booking Table Headers (Row 11)
  const headers = [
    'Booking ID',
    'Faculty Name',
    'Faculty Email',
    'Faculty Phone',
    'Department',
    'Venue Name',
    'Venue Type',
    'Location',
    'Booking Date',
    'Start Time',
    'End Time',
    'Purpose',
    'Booking Status',
    'Remarks',
    'Created Date',
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.height = 25;
  headerRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };

  for (let c = 1; c <= headers.length; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    cell.alignment = {
      horizontal: [1, 9, 10, 11, 13, 15].includes(c) ? 'center' : 'left',
      vertical: 'middle',
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1E293B' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      left: { style: 'thin', color: { argb: 'FF3B82F6' } },
      right: { style: 'thin', color: { argb: 'FF3B82F6' } },
    };
  }

  // 5. Data Rows
  dataset.rows.forEach((row, idx) => {
    const isEven = idx % 2 === 0;
    const rowValues = [
      row.id,
      row.staff_name || '-',
      row.staff_email || '-',
      row.display_phone,
      row.department || '-',
      row.hall_name || '-',
      row.venue_type || '-',
      row.location || '-',
      row.booking_date || '-',
      formatTimeDisplay(row.time_from),
      formatTimeDisplay(row.time_to),
      row.display_purpose,
      row.status,
      row.display_remarks,
      row.created_at_formatted || '-',
    ];

    const dataRow = sheet.addRow(rowValues);
    dataRow.height = 20;

    for (let c = 1; c <= headers.length; c++) {
      const cell = dataRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' },
      };
      cell.alignment = {
        horizontal: [1, 9, 10, 11, 13, 15].includes(c) ? 'center' : 'left',
        vertical: 'middle',
        wrapText: [12, 14].includes(c),
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Status Column Styling
      if (c === 13) {
        const st = (row.status || '').toLowerCase();
        let textColor = 'FF475569';
        let bg = 'FFF1F5F9';
        if (st === 'approved') {
          textColor = 'FF15803D';
          bg = 'FFDCFCE7';
        } else if (st === 'pending') {
          textColor = 'FFB45309';
          bg = 'FFFEF3C7';
        } else if (st === 'rejected') {
          textColor = 'FFDC2626';
          bg = 'FFFEE2E2';
        }
        cell.font = { bold: true, color: { argb: textColor } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bg },
        };
      }
    }
  });

  // 6. Set Column Widths & Auto-Filter
  sheet.columns = [
    { width: 14 }, // Booking ID
    { width: 22 }, // Faculty Name
    { width: 26 }, // Faculty Email
    { width: 16 }, // Phone
    { width: 24 }, // Department
    { width: 20 }, // Venue Name
    { width: 18 }, // Venue Type
    { width: 18 }, // Location
    { width: 15 }, // Booking Date
    { width: 13 }, // Start Time
    { width: 13 }, // End Time
    { width: 32 }, // Purpose
    { width: 16 }, // Status
    { width: 26 }, // Remarks
    { width: 22 }, // Created At
  ];

  sheet.autoFilter = {
    from: { row: 11, column: 1 },
    to: { row: 11 + dataset.rows.length, column: headers.length },
  };

  return workbook.xlsx.writeBuffer();
};

module.exports = {
  getReportDataset,
  getFilterMeta,
  generateReportPdf,
  generateReportExcel,
  normalizeStatus,
  formatDateDisplay,
  formatTimeDisplay,
};
