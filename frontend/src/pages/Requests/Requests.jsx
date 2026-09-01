import React from "react";
import { Link } from "react-router-dom";
import { FileCheck, FileX, FileClock } from "lucide-react";

const RequestsPage = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Hall Requests</h1>
        <p className="text-gray-600">Manage and track all hall requests</p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
            <FileClock size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold m-0">12</h3>
            <p className="text-gray-500 m-0">Pending</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 flex items-center">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-4">
            <FileCheck size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold m-0">28</h3>
            <p className="text-gray-500 m-0">Approved</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 flex items-center">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-4">
            <FileX size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold m-0">5</h3>
            <p className="text-gray-500 m-0">Rejected</p>
          </div>
        </div>
      </div>

      {/* Request Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link 
          to="/requests/pending" 
          className="bg-white rounded-lg shadow border-l-4 border-blue-500 p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-800 m-0">Pending Requests</h2>
            <FileClock className="text-blue-500" size={20} />
          </div>
          <p className="text-gray-600 mb-4">Review requests awaiting approval</p>
          <div className="flex justify-end">
            <span className="text-blue-600 text-sm font-medium">View Details</span>
          </div>
        </Link>

        <Link 
          to="/requests/approved" 
          className="bg-white rounded-lg shadow border-l-4 border-green-500 p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-800 m-0">Approved Requests</h2>
            <FileCheck className="text-green-500" size={20} />
          </div>
          <p className="text-gray-600 mb-4">Access all approved requests</p>
          <div className="flex justify-end">
            <span className="text-green-600 text-sm font-medium">View Details</span>
          </div>
        </Link>

        <Link 
          to="/requests/rejected" 
          className="bg-white rounded-lg shadow border-l-4 border-red-500 p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-800 m-0">Rejected Requests</h2>
            <FileX className="text-red-500" size={20} />
          </div>
          <p className="text-gray-600 mb-4">Review denied requests</p>
          <div className="flex justify-end">
            <span className="text-red-600 text-sm font-medium">View Details</span>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default RequestsPage;