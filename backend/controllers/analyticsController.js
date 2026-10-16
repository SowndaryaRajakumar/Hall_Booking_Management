const {
  getVenueUtilizationAnalytics,
  getAvailabilityHeatmap,
} = require('../services/analyticsService');

const getVenueUtilization = async (req, res) => {
  try {
    const data = await getVenueUtilizationAnalytics();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching venue utilization analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute venue utilization analytics',
      error: error.message,
    });
  }
};

const getHeatmap = async (req, res) => {
  try {
    const { date, venueType, deptId, search } = req.query;
    const data = await getAvailabilityHeatmap({ date, venueType, deptId, search });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching availability heatmap:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute availability heatmap',
      error: error.message,
    });
  }
};

module.exports = {
  getVenueUtilization,
  getHeatmap,
};
