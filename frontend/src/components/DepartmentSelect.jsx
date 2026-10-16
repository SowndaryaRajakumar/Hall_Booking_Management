import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Users, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDepartments } from '../api/departmentApi';
import { getAllHalls } from '../api/hallApi';
import { normalizeRole } from '../routes/PermissionRoute';

const DepartmentSelect = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [adminHalls, setAdminHalls] = useState([]);
  const [loading, setLoading] = useState(true);

  const rawRole = localStorage.getItem("role") || "";
  const role = normalizeRole(rawRole);
  let storedUser = {};
  try {
    storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    storedUser = {};
  }
  const userDeptId = storedUser.department_id || storedUser.departmentId;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, hallsRes] = await Promise.allSettled([
          getDepartments(),
          getAllHalls({ status: "active", limit: 100 }),
        ]);

        if (deptRes.status === "fulfilled") {
          const list = Array.isArray(deptRes.value) ? deptRes.value : deptRes.value?.data || [];
          setDepartments(
            list.map((d) => ({
              id: d.DeptID || d.id,
              name: d.DeptName || d.name,
              code: d.DeptCode || d.code || "",
              students: d.Students || d.students || 0,
              description: d.Description || d.description || `Department of ${d.DeptName || d.name}`,
            }))
          );
        }

        if (hallsRes.status === "fulfilled") {
          const hallList = Array.isArray(hallsRes.value?.data)
            ? hallsRes.value.data
            : Array.isArray(hallsRes.value)
            ? hallsRes.value
            : [];

          // Filter common venues / administrative halls
          const common = hallList.filter(
            (h) => h.ownershipType === "COMMON" || h.ownership_type === "COMMON"
          );
          setAdminHalls(
            common.map((h) => ({
              id: h.hallId || h.id || h.HallID,
              name: h.hallName || h.name || h.HallName,
              code: (h.hallName || "").slice(0, 4).toUpperCase(),
              capacity: h.capacity || h.Capacity || 0,
              description: h.additionalFeatures || `College Common Facility - ${h.hallName}`,
              location: h.location || h.Location || "Main Campus",
              facilities: h.facilities || [],
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load departments or halls:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { delayChildren: 0.2, staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
  };

  const handleAdminHallClick = (hall) => {
    navigate(`/admin-halls/${hall.id}`, { state: { hall } });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            BOOKING SELECTION
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose a department or college common venue to proceed with your booking timetable.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading available departments and venues...
          </div>
        ) : (
          <>
            {/* Departments Section */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Building2 className="text-blue-600" />
              Academic Departments
            </h2>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid md:grid-cols-2 gap-6 mb-16"
            >
              {departments.map((dept) => {
                const isUserDept = userDeptId && Number(userDeptId) === Number(dept.id);
                return (
                  <motion.div
                    key={dept.id}
                    variants={itemVariants}
                    whileHover="hover"
                    onClick={() =>
                      navigate(`/select-timeslot/${dept.id}`, {
                        state: {
                          department: {
                            DeptID: dept.id,
                            DeptName: dept.name,
                            DeptCode: dept.code,
                            Students: dept.students,
                            Description: dept.description,
                          },
                        },
                      })
                    }
                    className={`bg-white shadow-sm hover:shadow-md rounded-2xl border transition-all cursor-pointer p-6 relative overflow-hidden ${
                      isUserDept ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"
                    }`}
                  >
                    {isUserDept && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Your Department
                      </span>
                    )}

                    <div className="flex items-center mb-4">
                      <div className="bg-blue-50 p-3 rounded-2xl mr-4 text-blue-600">
                        <Building2 size={28} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{dept.name}</h3>
                        {dept.code && (
                          <span className="text-xs font-semibold text-gray-400 uppercase">
                            Code: {dept.code}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {dept.description}
                    </p>

                    <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                      <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                        View Department Venues <ArrowRight size={14} />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Common / Administrative Venues Section */}
            {adminHalls.length > 0 && (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Users className="text-indigo-600" />
                  Common College Venues
                </h2>

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid md:grid-cols-2 gap-6"
                >
                  {adminHalls.map((hall) => (
                    <motion.div
                      key={hall.id}
                      variants={itemVariants}
                      whileHover="hover"
                      onClick={() => handleAdminHallClick(hall)}
                      className="bg-white shadow-sm hover:shadow-md rounded-2xl border border-gray-200 p-6 cursor-pointer transition-all"
                    >
                      <div className="flex items-center mb-4">
                        <div className="bg-indigo-50 p-3 rounded-2xl mr-4 text-indigo-600">
                          <Users size={28} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-gray-900">{hall.name}</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                              Common
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">Capacity: {hall.capacity}</span>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm mb-4">{hall.description}</p>

                      <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                        <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                          Book Common Venue <ArrowRight size={14} />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DepartmentSelect;