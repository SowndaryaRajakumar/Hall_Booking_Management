import React, { useState, useEffect } from 'react';
import { Clock, MapPin, User, FileText, Calendar, XCircle, Building } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Pagination from '../../components/Pagination';
const RejectedRequests = () => {
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  useEffect(() => {
    const fetchRejectedRequests = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/admin-bookings/bookings?status=rejected&page=${currentPage}&limit=10`);
        if (!response.ok) {
          throw new Error('Failed to fetch rejected requests');
        }
        const data = await response.json();
        setRejectedRequests(data.data || []);
        setPagination(data.pagination || pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRejectedRequests();
  }, [currentPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error) {
    return (
     
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <XCircle className="text-red-500 w-16 h-16 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Error Loading Requests</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (

    <div className="max-w-6xl mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Rejected Requests</h1>
          <p className="text-gray-600 mt-1">View all denied hall reservations</p>
        </div>
        <div className="bg-red-100 text-red-800 py-1 px-3 rounded-full text-sm font-medium">
          {rejectedRequests.length} Rejected
        </div>
      </div>

      {rejectedRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <XCircle className="text-red-500" size={28} />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Rejected Requests</h3>
          <p className="text-gray-600">There are no rejected requests at this time. All valid requests have been approved.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rejectedRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow overflow-hidden border-t-4 border-red-500">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Building className="text-red-600" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{request.hall_name}</h3>
                      <p className="text-gray-500 text-sm">ID: {request.hall_id}</p>
                    </div>
                  </div>
                  <span className="bg-red-100 text-red-600 py-1 px-2 rounded text-xs font-medium">
                    Rejected
                  </span>
                </div>

                <div className="space-y-3 mb-2">
                  <div className="flex items-start gap-3">
                    <User className="text-gray-400 mt-1" size={16} />
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Staff:</span> {request.staff_name}
                      </p>
                      <p className="text-xs text-gray-500">Email: {request.staff_email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="text-gray-400 mt-1" size={16} />
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Time:</span> {request.time_from} - {request.time_to}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Calendar className="text-gray-400 mt-1" size={16} />
                    <div className="text-sm">
                      <p className="text-gray-600">
                        <span className="font-medium">Date:</span> {new Date(request.date).toLocaleDateString()}
                      </p>
                      <p className="text-red-600">
                        <span className="font-medium">Rejected on:</span> {new Date(request.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileText className="text-gray-400 mt-1" size={16} />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Reason:</span> {request.reason}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 px-5 py-3 border-t border-red-100">
                <div className="flex items-center text-sm text-red-800">
                  <XCircle className="mr-2" size={16} />
                  Request has been rejected
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

export default RejectedRequests;
