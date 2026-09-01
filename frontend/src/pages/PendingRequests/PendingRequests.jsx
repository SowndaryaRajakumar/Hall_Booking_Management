import React, { useState, useEffect } from "react";
import axios from "axios";
import { Clock, User, FileText, Calendar, CheckCircle, XCircle, Building } from "lucide-react";
import { toast } from "react-toastify";
import Pagination from "../../components/Pagination";

// Create a custom axios instance with the baseURL
const api = axios.create({
  baseURL: 'http://localhost:5000'
});

const PendingRequests = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  useEffect(() => {
    fetchPendingRequests();
  }, [currentPage]);

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin-bookings/bookings', {
        params: { status: 'pending', page: currentPage, limit: 10 }
      });
      setPendingRequests(response.data?.data || []);
      setPagination(response.data?.pagination || pagination);
      if (currentPage > 1 && (response.data?.data || []).length === 0) setCurrentPage(currentPage - 1);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      toast.error('Failed to load pending requests', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setPendingRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async (id) => {
    const toastId = toast.loading("Processing approval...", {
      position: "top-right",
      autoClose: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: false,
      closeButton: false
    });

    try {
      setProcessingId(id);
      const response = await api.patch(`/api/admin-bookings/${id}/status`, {
        status: 'approved'
      });

      if (response.status === 200) {
        setPendingRequests(prevRequests => prevRequests.filter(req => req.id !== id));
        toast.update(toastId, {
          render: "Request approved successfully! 🎉",
          type: "success",
          isLoading: false,
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
        await fetchPendingRequests();
      } else {
        throw new Error('Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.update(toastId, {
        render: "Failed to approve request. Please try again.",
        type: "error",
        isLoading: false,
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (id) => {
    const toastId = toast.loading("Processing rejection...", {
      position: "top-right",
      autoClose: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: false,
      closeButton: false
    });

    try {
      setProcessingId(id);
      const response = await api.patch(`/api/admin-bookings/${id}/status`, {
        status: 'rejected'
      });

      if (response.status === 200) {
        setPendingRequests(prevRequests => prevRequests.filter(req => req.id !== id));
        toast.update(toastId, {
          render: "Request rejected successfully",
          type: "info",
          isLoading: false,
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
        await fetchPendingRequests();
      } else {
        throw new Error('Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.update(toastId, {
        render: "Failed to reject request. Please try again.",
        type: "error",
        isLoading: false,
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pending requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pending Requests</h1>
          <p className="text-gray-600 mt-1">Review and manage hall booking requests</p>
        </div>
        <div className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-sm font-medium">
          {pendingRequests.length} Pending
        </div>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Pending Requests</h3>
          <p className="text-gray-600">All requests have been processed</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Building className="text-blue-500" />
                    <div>
                      <h3 className="text-lg font-semibold">{request.hall_name}</h3>
                      <p className="text-sm text-gray-500">Booking #{request.id}</p>
                    </div>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    Pending
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <User className="text-gray-400" size={18} />
                    <div>
                      <p className="text-sm font-medium">{request.staff_name}</p>
                      <p className="text-xs text-gray-500">{request.staff_email}</p>
                      <p className="text-xs text-gray-500">{request.staff_phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="text-gray-400" size={18} />
                    <p className="text-sm">{formatDate(request.date)}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="text-gray-400" size={18} />
                    <p className="text-sm">{request.time_from} - {request.time_to}</p>
                  </div>

                  <div className="flex items-start space-x-2">
                    <FileText className="text-gray-400 mt-1" size={18} />
                    <p className="text-sm">{request.reason}</p>
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => handleApproveRequest(request.id)}
                    disabled={processingId === request.id}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {processingId === request.id ? (
                      <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        <span>Approve</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request.id)}
                    disabled={processingId === request.id}
                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {processingId === request.id ? (
                      <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>
                    ) : (
                      <>
                        <XCircle size={18} />
                        <span>Reject</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};

export default PendingRequests;
