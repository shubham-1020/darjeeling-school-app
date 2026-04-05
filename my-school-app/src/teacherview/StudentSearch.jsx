import React, { useState } from 'react';
import { IoSearchOutline, IoPeopleOutline, IoTrash, IoWarningOutline, IoCloseOutline } from 'react-icons/io5'; // Icons for search, list, delete, modal

const StudentSearch = ({ students, onDeleteStudent, loading, onStudentClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteStudentModal, setShowDeleteStudentModal] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);

    // Filter students based on search term
    const filteredStudents = students.filter(student =>
        student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentIdNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeleteClick = (student) => {
        setStudentToDelete(student);
        setShowDeleteStudentModal(true);
    };

    const confirmDeleteStudent = () => {
        if (studentToDelete) {
            onDeleteStudent(studentToDelete.id);
        }
        setShowDeleteStudentModal(false);
        setStudentToDelete(null);
    };

    return (
        <div className="p-5 bg-white rounded-lg shadow-lg border border-gray-100">
            {/* Search Input */}
            <div className="mb-6 relative">
                <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search students by name or ID..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                    aria-label="Search students"
                />
            </div>

            {/* List of Students */}
            <div>
                <h4 className="text-xl font-medium text-blue-600 mb-4 flex items-center gap-2">
                    <IoPeopleOutline /> Current Students ({filteredStudents.length} of {students.length})
                </h4>
                {loading ? (
                    <p className="text-center text-gray-500 py-6 flex items-center justify-center">
                        <FaSpinner className="animate-spin h-5 w-5 mr-3 text-blue-500" />
                        <span>Loading students...</span>
                    </p>
                ) : filteredStudents.length > 0 ? (
                    <ul className="space-y-3">
                        {filteredStudents.map((student) => (
                            <li key={student.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
                                {/* Student Info - Make whole area clickable, but only text has underline */}
                                <div
                                    className="cursor-pointer flex-1 mb-2 sm:mb-0 pr-4"
                                    onClick={() => onStudentClick(student)} // Call onStudentClick
                                >
                                    <p className="font-semibold text-gray-800 text-lg hover:underline decoration-blue-600 decoration-2 underline-offset-2">{student.studentName}</p>
                                    <p className="text-sm text-gray-500">ID: {student.studentIdNumber}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(student); }} // Stop propagation to prevent parent click
                                    className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 text-sm rounded-md hover:bg-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                    aria-label={`Delete ${student.studentName}`}
                                >
                                    <IoTrash className="text-base" /> Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-gray-500 py-6 border border-dashed border-gray-300 rounded-md">No students match your search or no students have been added to this class yet.</p>
                )}
            </div>

            {/* Delete Student Confirmation Modal */}
            {showDeleteStudentModal && studentToDelete && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-[100]" aria-modal="true" role="dialog">
                    <div className="bg-white p-6 rounded-xl shadow-2xl m-4 max-w-sm w-full animate-fade-in-up relative">
                        <button
                            onClick={() => setShowDeleteStudentModal(false)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Close modal"
                        >
                            <IoCloseOutline className="text-2xl" />
                        </button>
                        <h3 className="text-2xl font-bold text-red-700 mb-4 flex items-center gap-2">
                            <IoWarningOutline className="text-3xl text-red-500" /> Confirm Deletion
                        </h3>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete <span className="font-bold">{studentToDelete.studentName}</span> from this class? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteStudentModal(false)}
                                className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteStudent}
                                className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentSearch;