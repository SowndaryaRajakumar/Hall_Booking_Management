import axios from "axios";

const BASE_URL = "http://localhost:5000/api/reports";

const buildHeaders = () => {
  const token = localStorage.getItem("token");
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to fetch reports");
  }
  return data;
};

/**
 * Fetch reports overview and filtered records with pagination
 */
export const getReportsData = async ({
  page = 1,
  limit = 10,
  fromDate = "",
  toDate = "",
  venueId = "all",
  departmentId = "all",
  facultyId = "all",
  status = "all",
  search = "",
} = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  if (venueId && venueId !== "all") params.set("venueId", venueId);
  if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
  if (facultyId && facultyId !== "all") params.set("facultyId", facultyId);
  if (status && status !== "all") params.set("status", status);
  if (search && search.trim()) params.set("search", search.trim());

  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    method: "GET",
    headers: buildHeaders(),
  });
  const data = await parseResponse(response);
  return data.data;
};

/**
 * Export report as PDF or Excel (Filtered or All)
 */
export const exportReportFile = async ({
  type = "pdf",
  filters = {},
  exportAll = false,
} = {}) => {
  const token = localStorage.getItem("token");
  const params = {};

  if (exportAll) {
    params.exportAll = "true";
  } else {
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.venueId && filters.venueId !== "all") params.venueId = filters.venueId;
    if (filters.departmentId && filters.departmentId !== "all") params.departmentId = filters.departmentId;
    if (filters.facultyId && filters.facultyId !== "all") params.facultyId = filters.facultyId;
    if (filters.status && filters.status !== "all") params.status = filters.status;
    if (filters.search && filters.search.trim()) params.search = filters.search.trim();
  }

  try {
    const response = await axios.get(`${BASE_URL}/export/${type}`, {
      params,
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      responseType: "blob",
    });

    const disposition = response.headers["content-disposition"] || response.headers["Content-Disposition"];
    let filename = "";
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (!filename) {
      filename = `NEC_Booking_Report_${exportAll ? "All" : "Filtered"}_${todayStr}.${type === "excel" ? "xlsx" : "pdf"}`;
    }

    const mimeType =
      type === "excel"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";

    const blob = new Blob([response.data], { type: mimeType });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);

    return { success: true, filename };
  } catch (error) {
    if (error.response && error.response.data instanceof Blob) {
      const text = await error.response.data.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.message || "Failed to generate report");
      } catch (parseErr) {
        if (text && !text.includes("<!DOCTYPE")) {
          throw new Error(text);
        }
      }
    }
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      "Failed to generate report. Please try again."
    );
  }
};
