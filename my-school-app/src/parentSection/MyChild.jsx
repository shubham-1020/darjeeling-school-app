import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AllClasses from "./AllClasses";

function MyChild() {
  const location = useLocation();
  const navigate = useNavigate();

  // student data passed from FetchStudents.jsx OR fallback fetch
  const student = location.state;

  if (!student) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-semibold">
          No student data found. Please go back.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* 🔹 Header Section */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Student's Profile  - {student.studentName}
        </h1>

        {/* Optional Student Avatar */}
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
          {student.studentName?.charAt(0) || "S"}
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white shadow-lg rounded-xl p-6">
        <div>
          <p className="text-gray-500 text-sm">Class</p>
          <p className="text-lg font-semibold">{student.className}</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">Section</p>
          <p className="text-lg font-semibold">{student.section}</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">Roll No</p>
          <p className="text-lg font-semibold">{student.studentIdNumber}</p>
        </div>
        <div>
          <AllClasses studentId={student.id} /> 
        </div>
      </div>
    </div>
  );
}

export default MyChild;
