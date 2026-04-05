import React from "react";
import { Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaChalkboardTeacher, FaGraduationCap, FaSchool } from "react-icons/fa"; // Importing icons
import AdminNotice from "./AddNotice";

export default function SelectPage() {
  return (
    <>
      <AdminNotice />
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      
      <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 lg:p-12 text-center max-w-2xl w-full transform transition-all duration-300 hover:scale-[1.01]">
        <FaSchool className="text-indigo-600 text-6xl mx-auto mb-6 animate-bounce-slow" /> {/* Added a subtle animation */}
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
          Welcome to the <span className="text-indigo-600">Admin Dashboard</span>!
        </h1>
        <p className="text-xl text-gray-700 mb-10 max-w-md mx-auto">
          Your central hub for managing school operations. Please select an option to proceed:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Link for Manage Teachers */}
          <Link
            to="/admin-dashboard/manage-teachers"
            className="flex flex-col items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 px-4 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-xl group"
            aria-label="Manage Teachers"
          >
            <FaChalkboardTeacher className="text-4xl mb-3 text-indigo-200 group-hover:text-white transition-colors duration-300" />
            <span className="text-2xl">Manage Teachers</span>
          </Link>

          {/* Link for Manage Classes */}
          <Link
            to="/admin-dashboard/manage-classes"
            className="flex flex-col items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold py-6 px-4 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-xl group"
            aria-label="Manage Classes"
          >
            <FaGraduationCap className="text-4xl mb-3 text-green-200 group-hover:text-white transition-colors duration-300" />
            <span className="text-2xl">Manage Classes</span>
          </Link>
        </div>
      </div>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored" // Using 'colored' theme for better visual consistency
      />
    </div>
    </>
  );
}