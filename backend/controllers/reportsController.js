const pool = require('../config/db');
const { getPagination, makePagination } = require('../utils/pagination');
const {
  getReportDataset,
  getFilterMeta,
  generateReportPdf,
  generateReportExcel,
} = require('../services/reportExportService');

/**
 * Get comprehensive reports data with optional filter support
 */
exports.getReports = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    // Check if any filters are passed
    const hasFilters = Boolean(
      req.query.fromDate ||
      req.query.toDate ||
      (req.query.venueId && req.query.venueId !== 'all') ||
      (req.query.departmentId && req.query.departmentId !== 'all') ||
      (req.query.facultyId && req.query.facultyId !== 'all') ||
      (req.query.status && req.query.status.toLowerCase() !== 'all') ||
      req.query.search
    );

    // 1. Fetch filtered dataset for the table and summary metrics
    const reportDataset = await getReportDataset(req.query, !hasFilters);
    const totalRecords = reportDataset.rows.length;
    const paginatedRecords = reportDataset.rows.slice(offset, offset + limit);

    // 2. Fetch standard venue/hall totals
    const [hallTotals] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM Halls) AS totalVenues,
        (SELECT COUNT(*) FROM Halls WHERE ActiveStatus = 1) AS activeVenues
    `);
    const totalVenues = Number(hallTotals[0]?.totalVenues || 0);
    const activeVenues = Number(hallTotals[0]?.activeVenues || 0);

    // 3. Top venues and faculty breakdowns
    const [venueResults, facultyResults, dateResults, dateCountResults] = await Promise.all([
      pool.query(`
        SELECT hall_name AS venueName, COUNT(*) AS count 
        FROM bookings 
        GROUP BY hall_name 
        ORDER BY count DESC 
        LIMIT 10
      `),
      pool.query(`
        SELECT staff_name AS facultyName, staff_email AS email, COUNT(*) AS count 
        FROM bookings 
        GROUP BY staff_name, staff_email 
        ORDER BY count DESC 
        LIMIT 10
      `),
      pool.query(`
        SELECT DATE_FORMAT(date, '%Y-%m-%d') AS bookingDate, COUNT(*) AS count 
        FROM bookings 
        GROUP BY DATE_FORMAT(date, '%Y-%m-%d') 
        ORDER BY bookingDate DESC 
        LIMIT ? OFFSET ?
      `, [limit, offset]),
      pool.query(`SELECT COUNT(DISTINCT DATE_FORMAT(date, '%Y-%m-%d')) AS total FROM bookings`),
    ]);

    const bookingsByVenue = venueResults[0];
    const bookingsByFaculty = facultyResults[0];
    const bookingsByDate = dateResults[0];
    const totalDates = dateCountResults[0][0]?.total || 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalBookings: reportDataset.summary.totalBookings,
          pendingBookings: reportDataset.summary.pending,
          approvedBookings: reportDataset.summary.approved,
          rejectedBookings: reportDataset.summary.rejected,
          cancelledBookings: reportDataset.summary.cancelled,
          totalVenues,
          activeVenues,
        },
        records: paginatedRecords,
        bookingsByVenue,
        bookingsByFaculty,
        bookingsByDate,
        pagination: makePagination({ page, limit, total: totalRecords }),
        datePagination: makePagination({ page, limit, total: totalDates }),
      },
    });
  } catch (error) {
    console.error('Reports calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate reports',
      error: error.message,
    });
  }
};

/**
 * Export report as PDF (Filtered or All)
 */
exports.exportPdf = async (req, res) => {
  try {
    const isExportAll = req.query.exportAll === 'true' || req.query.exportAll === true;
    const dataset = await getReportDataset(req.query, isExportAll);

    if (dataset.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: isExportAll
          ? 'No booking records found in the database.'
          : 'No records found for the selected filters.',
      });
    }

    const meta = await getFilterMeta(req.query, isExportAll);
    const pdfBuffer = await generateReportPdf(dataset, meta);

    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `NEC_Booking_Report_${isExportAll ? 'All' : 'Filtered'}_${todayStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error) {
    console.error('PDF export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate PDF report',
      error: error.message,
    });
  }
};

/**
 * Export report as Excel (.xlsx) (Filtered or All)
 */
exports.exportExcel = async (req, res) => {
  try {
    const isExportAll = req.query.exportAll === 'true' || req.query.exportAll === true;
    const dataset = await getReportDataset(req.query, isExportAll);

    if (dataset.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: isExportAll
          ? 'No booking records found in the database.'
          : 'No records found for the selected filters.',
      });
    }

    const meta = await getFilterMeta(req.query, isExportAll);
    const excelBuffer = await generateReportExcel(dataset, meta);

    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `NEC_Booking_Report_${isExportAll ? 'All' : 'Filtered'}_${todayStr}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    return res.end(excelBuffer);
  } catch (error) {
    console.error('Excel export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Excel report',
      error: error.message,
    });
  }
};
