import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../setup';
// import AddHomework from '../homework/AddHomework';
// import ListOfHomework from '../homework/ListOfHomework';
import AddClassNotice from './classNotice/AddClassNotice';

import {
    doc,
    updateDoc,
    serverTimestamp,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    deleteDoc,
    setDoc,
    getDoc
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
    IoArrowBack,
    IoAdd,
    IoPencil,
    IoTrash,
    IoSchoolOutline,
    IoCalendarOutline,
    IoBookOutline,
    IoChatbubblesOutline,
    IoSaveOutline, // Added for save button
    IoCloseOutline // Added for cancel/close
} from 'react-icons/io5';
import StudentSearch from './StudentSearch'; // Not used in current code but kept in imports
import StudentDetailView from './StudentDetailView';

// Custom Spinner SVG for consistent loading indicators
const Spinner = ({ className = "h-5 w-5", color = "text-white" }) => (
    <svg className={`animate-spin ${className} ${color}`} viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const ClassDetail = ({ selectedClass, onClassUpdated, onClassDeleted, onBackToList }) => {
    const [user] = useAuthState(auth);
    const [editFormData, setEditFormData] = useState({
        className: '',
        section: '',
        subject: '',
    });
    const [loadingClassUpdate, setLoadingClassUpdate] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Student management states
    const [studentName, setStudentName] = useState('');
    const [studentIdNumber, setStudentIdNumber] = useState('');
    const [studentsInClass, setStudentsInClass] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [addingStudent, setAddingStudent] = useState(false);
    const [showAddStudentForm, setShowAddStudentForm] = useState(false);
    const [refreshStudentsTrigger, setRefreshStudentsTrigger] = useState(0);

    // UI state variables for tabs
    const [activeTab, setActiveTab] = useState('students');

    // State for selected student
    const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);

    //admin notice states
const [adminNotices, setAdminNotices] = useState(false);

    // Attendance states
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [dailyAttendance, setDailyAttendance] = useState({}); // { studentId: 'Present'/'Absent', ... }
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [savingAttendance, setSavingAttendance] = useState(false);

    // Simple Alert/Snackbar state
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState(''); // 'success', 'error', 'warning', 'info'
    const [showAlert, setShowAlert] = useState(false);

    const showMessage = useCallback((message, type) => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 5000); // Hide after 5 seconds
    }, []);

    const fetchDailyAttendance = useCallback(async (classId, date, teacherUid, currentStudentsInClass) => {
        if (!classId || !teacherUid || !currentStudentsInClass) return;
        setLoadingAttendance(true);
        try {
            const attendanceDoc = doc(db, 'attendance', `${classId}_${date}`);
            const docSnap = await getDoc(attendanceDoc);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const fetchedAttendance = {};
                if (Array.isArray(data.records)) {
                    data.records.forEach(record => {
                        fetchedAttendance[record.studentId] = record.status;
                    });
                }
                setDailyAttendance(fetchedAttendance);
            }
            else {
                // Initialize attendance for all students as 'Absent' if no record exists
                const initialAttendance = {};
                currentStudentsInClass.forEach(student => {
                    initialAttendance[student.id] = 'Absent'
                });
                setDailyAttendance(initialAttendance);
            }
        }
        catch (error) {
            console.error('Error fetching daily attendance:', error);
            showMessage('Error fetching daily attendance. Check your network or permissions.', 'error');
            setDailyAttendance({});
        } finally {
            setLoadingAttendance(false);
        }
    }, [showMessage]);

    const fetchStudentsForClass = useCallback(async (classId) => {
        if (!classId || !user) return [];

        setLoadingStudents(true);

        try {
            const q = query(collection(db, 'students'),
                where('classId', '==', classId),
                where('teacherUid', '==', user.uid),
            );
            const querySnapshot = await getDocs(q);
            const studentData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setStudentsInClass(studentData);
            return studentData; // Return the fetched data for use in useEffect
        }
        catch (error) {
            console.error('Error fetching students:', error);
            showMessage('Error fetching students. Check your network or permissions.', 'error');
            setStudentsInClass([]);
            return []; // Return empty array on error
        }
        finally {
            setLoadingStudents(false);
        }
    }, [user, showMessage]);


    // Effect 1: Initialize/reset class details when selectedClass changes, and trigger student fetch
    useEffect(() => {
        if (selectedClass) {
            setEditFormData({
                className: selectedClass.className,
                section: selectedClass.section,
                subject: selectedClass.subject,
            });
            // Trigger student fetch by updating a trigger state
            setRefreshStudentsTrigger(prev => prev + 1);
        } else {
            setEditFormData({ className: '', section: '', subject: '' });
            setStudentsInClass([]); // Clear students when no class is selected
            setDailyAttendance({}); // Clear attendance when no class is selected
        }
        setShowAddStudentForm(false);
        setStudentName('');
        setStudentIdNumber('');
        setSelectedStudentForDetails(null);
        setIsEditing(false); // Reset editing state
    }, [selectedClass]); // Depend ONLY on selectedClass

    // Effect 2: Fetch students when selectedClass, user, or refreshStudentsTrigger changes
    useEffect(() => {
        const loadStudents = async () => {
            if (selectedClass && user) {
                await fetchStudentsForClass(selectedClass.id);
            }
        };
        loadStudents();
    }, [selectedClass, user, fetchStudentsForClass, refreshStudentsTrigger]);

    // Effect 3: Fetch attendance when activeTab, selectedClass, user, attendanceDate, or studentsInClass changes
    useEffect(() => {
        if (activeTab === 'attendance' && selectedClass && user) {
            // Only fetch if studentsInClass is populated for the current class.
            if (studentsInClass.length > 0) {
                 fetchDailyAttendance(selectedClass.id, attendanceDate, user.uid, studentsInClass);
            } else {
                // If on attendance tab but no students, ensure attendance is empty
                setDailyAttendance({});
            }
        } else if (activeTab !== 'attendance' && Object.keys(dailyAttendance).length > 0) {
            // Only clear if not on attendance tab AND dailyAttendance is not already empty
            setDailyAttendance({});
        }
    }, [activeTab, selectedClass, user, attendanceDate, studentsInClass, fetchDailyAttendance]);


    const handleEditChange = (e) => {
        setEditFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleUpdateClass = useCallback(async () => {
        if (!selectedClass || !selectedClass.id) {
            showMessage('No class selected for update.', 'warning');
            return;
        }
        setLoadingClassUpdate(true);
        try {
            const classRef = doc(db, 'classes', selectedClass.id);
            await updateDoc(classRef, {
                ...editFormData,
                updatedAt: serverTimestamp(),
            });
            showMessage('Class details updated successfully!', 'success');
            onClassUpdated(); // Notify parent to refresh list, which might update selectedClass prop
            setIsEditing(false);
        }
        catch (error) {
            console.error('Error updating class:', error);
            showMessage('Failed to update class details. Check your network or permissions.', 'error');
        }
        finally {
            setLoadingClassUpdate(false);
        }
    }, [selectedClass, editFormData, onClassUpdated, showMessage]);

    const handleDeleteClass = async () => {
        if (!selectedClass || !selectedClass.id) return;
        if (window.confirm(`Are you sure you want to delete "${selectedClass.className}"? This will also remove all associated student records, attendance, homework, and class notices for this class.`)) {
            try {
                // Delete associated students
                const studentsQuery = query(collection(db, 'students'), where('classId', '==', selectedClass.id));
                const studentsSnapshot = await getDocs(studentsQuery);
                const studentDeletePromises = studentsSnapshot.docs.map(studentDoc =>
                    deleteDoc(doc(db, 'students', studentDoc.id)));

                // Delete associated attendance records
                const attendanceQuery = query(collection(db, 'attendance'), where('classId', '==', selectedClass.id));
                const attendanceSnapshot = await getDocs(attendanceQuery);
                const attendanceDeletePromises = attendanceSnapshot.docs.map(docToDelete =>
                    deleteDoc(doc(db, 'attendance', docToDelete.id))
                );

                // Delete associated homework
                // const homeworkQuery = query(collection(db, 'homework'), where('classId', '==', selectedClass.id));
                // const homeworkSnapshot = await getDocs(homeworkQuery);
                // const homeworkDeletePromises = homeworkSnapshot.docs.map(hwDoc =>
                //     deleteDoc(doc(db, 'homework', hwDoc.id))
                // );

                // Delete associated class notices
                const classNoticeQuery = query(collection(db, 'classNotices'), where('classId', '==', selectedClass.id));
                const classNoticeSnapshot = await getDocs(classNoticeQuery);
                const classNoticeDeletePromises = classNoticeSnapshot.docs.map(cnDoc =>
                    deleteDoc(doc(db, 'classNotices', cnDoc.id))
                );


                await Promise.all([...studentDeletePromises, ...attendanceDeletePromises, ...homeworkDeletePromises, ...classNoticeDeletePromises]);
                await deleteDoc(doc(db, 'classes', selectedClass.id));

                showMessage('Class and all associated data deleted successfully!', 'success');
                onClassDeleted(); // Notify parent to refresh and clear selected class
            } catch (err) {
                console.error('Error deleting class and/or associated data:', err);
                showMessage('Failed to delete class and/or associated data. Check your network or permissions.', 'error');
            }
        }
    };

    const handleAddStudentToClass = async () => {
        if (!studentName.trim() || !studentIdNumber.trim()) {
            showMessage('Please enter student name and ID number.', 'warning');
            return;
        }
        if (!user || !selectedClass || !selectedClass.id) {
            showMessage('Authentication or class selection error. Please log in and select a class.', 'error');
            return;
        }

        setAddingStudent(true);
        try {
            const q = query(collection(db, 'students'),
                where('classId', '==', selectedClass.id),
                where('teacherUid', '==', user.uid),
                where('studentIdNumber', '==', studentIdNumber.trim())
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                showMessage('A student with this ID already exists in this class.', 'warning');
                setAddingStudent(false);
                return;
            }
            await addDoc(collection(db, 'students'), {
                studentName: studentName.trim(),
                studentIdNumber: studentIdNumber.trim(),
                classId: selectedClass.id,
                teacherUid: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                className: selectedClass.className, // Store class name for easier lookup
                section: selectedClass.section,
                subject: selectedClass.subject,
            });
            showMessage(`${studentName} added to ${selectedClass.className}!`, 'success');
            setStudentName('');
            setStudentIdNumber('');
            setShowAddStudentForm(false); // Hide form after adding

            setRefreshStudentsTrigger(prev => prev + 1); // Trigger student list refresh
        } catch (error) {
            console.error('Error adding student to class:', error);
            showMessage('Failed to add student. Check your network or permissions.', 'error');
        } finally {
            setAddingStudent(false);
        }
    };

    const handleDeleteStudent = async (studentId) => {
        if (!window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'students', studentId));
            showMessage('Student deleted!', 'success');

            setRefreshStudentsTrigger(prev => prev + 1); // Trigger student list refresh

            if (selectedStudentForDetails && selectedStudentForDetails.id === studentId) {
                setSelectedStudentForDetails(null);
            }
        } catch (err) {
            console.error('Error deleting student:', err);
            showMessage('Failed to delete student. Check your network or permissions.', 'error');
        }
    };

    const handleStudentClick = (student) => {
        setSelectedStudentForDetails(student);
    };

    const handleCloseStudentDetails = () => {
        setSelectedStudentForDetails(null);
    };

    const handleAttendanceChange = (studentId, status) => {
        setDailyAttendance(prev => ({
            ...prev,
            [studentId]: status,
        }));
    };

    const handleSaveAttendance = async () => {
        if (!selectedClass || !selectedClass.id || !user) {
            showMessage('Please select a class and ensure you are logged in.', 'warning');
            return;
        }
        setSavingAttendance(true);
        try {
            const attendanceRecords = studentsInClass.map(
                student => ({
                    studentId: student.id,
                    studentName: student.studentName,
                    status: dailyAttendance[student.id] || 'Absent', // Default to Absent if not set
                })
            );
            const attendanceRef = doc(db, 'attendance', `${selectedClass.id}_${attendanceDate}`);
            await setDoc(attendanceRef, {
                classId: selectedClass.id,
                className: selectedClass.className, // Storing class name for easier querying/display
                date: attendanceDate,
                teacherUid: user.uid,
                records: attendanceRecords,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }, { merge: true }); // Use merge to avoid overwriting entire document if other fields exist

            showMessage('Attendance saved successfully!', 'success');
        }
        catch (error) {
            console.error('Error saving attendance:', error);
            showMessage('Failed to save attendance. Check your network or permissions.', 'error');
        } finally {
            setSavingAttendance(false);
        }
    };

    const alertClasses = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700',
    };

    if (!selectedClass) {
        return (
            <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-xl shadow-lg text-center text-gray-600 border border-gray-200">
                <IoSchoolOutline className="mx-auto text-6xl text-green-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Class Selected</h3>
                <p>Please select a class from the list on the left to view its details, manage students, attendance, and notices.</p>
                <button
                    onClick={onBackToList}
                    className="mt-6 flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-300 shadow-md font-medium mx-auto"
                >
                    <IoArrowBack className="text-lg" /> Back to Classes List
                </button>
            </div>
        );
    }

    return (
        <div className="relative max-w-5xl mx-auto my-6 p-4 sm:p-8 bg-white rounded-xl shadow-2xl flex flex-col gap-6">
            {/* Alert/Snackbar */}
            {showAlert && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-lg border ${alertClasses[alertType]} shadow-xl flex items-center space-x-3 transition-all duration-300 ${showAlert ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}
                    role="alert" aria-live="polite">
                    {alertType === 'success' && <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                    {alertType === 'error' && <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2A9 9 0 111 12a9 9 0 0118 0z"></path></svg>}
                    {alertType === 'warning' && <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                    {alertType === 'info' && <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                    <span className="font-medium">{alertMessage}</span>
                    <button onClick={() => setShowAlert(false)} className="ml-auto -mr-1.5 p-1 rounded-full hover:bg-opacity-20 transition-colors" aria-label="Close alert">
                        <IoCloseOutline className="h-5 w-5" />
                    </button>
                </div>
            )}

            {/* Header: Class Name and Back Button */}
            <div className="flex flex-col sm:flex-row justify-between items-center pb-6 border-b border-gray-200">
                <h2 className="text-3xl font-extrabold text-green-800 mb-3 sm:mb-0">
                    <IoSchoolOutline className="inline-block align-bottom mr-2 text-green-600" />
                    {selectedClass.className}
                    <span className="text-xl font-medium text-gray-500 ml-3">({selectedClass.section})</span>
                </h2>
                <button
                    onClick={onBackToList}
                    className="flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-300 text-base font-medium border border-gray-200 shadow-sm"
                    aria-label="Back to classes list"
                >
                    <IoArrowBack className="text-xl" /> Back to Classes
                </button>
            </div>

            {/* Main Content Area */}
            {selectedStudentForDetails ? (
                <StudentDetailView
                    student={selectedStudentForDetails}
                    onClose={handleCloseStudentDetails}
                    teacherUid={user?.uid}
                    classId={selectedClass.id}
                />
            ) : (
                <div className="flex flex-col gap-8">
                    {/* Class Details & Edit Section */}
                    <div className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg border border-green-100 p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-5 border-b border-green-200/50">
                            <h3 className="text-2xl font-semibold text-green-700 mb-2 sm:mb-0">
                                {isEditing ? 'Edit Class Details' : 'Class Overview'}
                            </h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`flex items-center gap-1.5 px-5 py-2 rounded-lg transition-all duration-300 text-sm font-medium shadow-md
                                        ${isEditing ? 'bg-orange-500 text-white hover:bg-orange-600 transform scale-105' : 'bg-green-600 text-white hover:bg-green-700'}`}
                                    aria-label={isEditing ? 'Cancel editing class details' : 'Edit class details'}
                                >
                                    {isEditing ? <><IoCloseOutline className="text-base" /> Cancel</> : <><IoPencil className="text-base" /> Edit Details</>}
                                </button>
                                <button
                                    onClick={handleDeleteClass}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 text-sm font-medium shadow-md"
                                    aria-label="Delete class"
                                >
                                    <IoTrash className="text-base" /> Delete Class
                                </button>
                            </div>
                        </div>

                        {!isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg text-gray-700">
                                <p><strong className="font-semibold text-gray-800">Class Name:</strong> {selectedClass.className}</p>
                                <p><strong className="font-semibold text-gray-800">Subject:</strong> {selectedClass.subject}</p>
                                <p><strong className="font-semibold text-gray-800">Section:</strong> {selectedClass.section}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {['className', 'section', 'subject'].map((field) => (
                                    <div key={field}>
                                        <label htmlFor={`edit-${field}`} className="block text-sm font-medium text-gray-700 mb-1">
                                            {field.replace(/^\w/, c => c.toUpperCase()).replace('Classname', 'Class Name')}:
                                        </label>
                                        <input
                                            id={`edit-${field}`}
                                            type="text"
                                            name={field}
                                            value={editFormData[field]}
                                            onChange={handleEditChange}
                                            placeholder={field.replace(/^\w/, c => c.toUpperCase()).replace('Classname', 'Class Name')}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-base"
                                            aria-required="true"
                                        />
                                    </div>
                                ))}
                                <div className="md:col-span-2">
                                    <button
                                        onClick={handleUpdateClass}
                                        disabled={loadingClassUpdate}
                                        className="mt-4 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-300 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center"
                                        aria-label="Update class details"
                                    >
                                        {loadingClassUpdate ? (
                                            <span className="flex items-center">
                                                <Spinner />
                                                Updating...
                                            </span>
                                        ) : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex flex-wrap gap-x-3 gap-y-2 border-b-2 border-gray-100 mt-4" role="tablist">
                        <TabButton
                            icon={<IoSchoolOutline />}
                            label={`Students (${studentsInClass.length})`}
                            isActive={activeTab === 'students'}
                            onClick={() => setActiveTab('students')}
                            id="tab-students"
                            aria-controls="panel-students"
                        />
                        <TabButton
                            icon={<IoCalendarOutline />}
                            label="Attendance"
                            isActive={activeTab === 'attendance'}
                            onClick={() => setActiveTab('attendance')}
                            id="tab-attendance"
                            aria-controls="panel-attendance"
                        />
                        {/* <TabButton
                            icon={<IoBookOutline />}
                            label="Homework"
                            isActive={activeTab === 'homework'}
                            onClick={() => setActiveTab('homework')}
                            id="tab-homework"
                            aria-controls="panel-homework"
                        /> */}
                        <TabButton
                            icon={<IoChatbubblesOutline />}
                            label="Class Notice"
                            isActive={activeTab === 'notice'}
                            onClick={() => setActiveTab('notice')}
                            id="tab-class-notice"
                            aria-controls="panel-class-notice"
                        />
                    </div>

                    {/* Tab Content */}
                    <div className="p-6 bg-gray-50 rounded-b-xl shadow-inner border border-gray-100 min-h-[400px]">
                        {activeTab === 'students' && (
                            <div id="panel-students" role="tabpanel" aria-labelledby="tab-students" tabIndex="0">
                                <h3 className="text-2xl font-semibold text-green-700 mb-5">Student Management</h3>
                                <button
                                    onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 text-base font-medium mb-5 shadow-md"
                                    aria-label={showAddStudentForm ? 'Hide add student form' : 'Add new student'}
                                >
                                    <IoAdd className="text-xl" /> {showAddStudentForm ? 'Hide Form' : 'Add New Student'}
                                </button>

                                {showAddStudentForm && (
                                    <div className="p-5 mb-6 bg-white rounded-lg shadow-md border border-blue-100 flex flex-col gap-4">
                                        <h4 className="text-lg font-medium text-gray-800">Add New Student</h4>
                                        <div>
                                            <label htmlFor="student-name" className="block text-sm font-medium text-gray-700 mb-1">Student Name:</label>
                                            <input
                                                id="student-name"
                                                type="text"
                                                value={studentName}
                                                onChange={(e) => setStudentName(e.target.value)}
                                                placeholder="e.g., John Doe"
                                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-base"
                                                aria-required="true"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="student-id" className="block text-sm font-medium text-gray-700 mb-1">Student ID / Roll No.:</label>
                                            <input
                                                id="student-id"
                                                type="text"
                                                value={studentIdNumber}
                                                onChange={(e) => setStudentIdNumber(e.target.value)}
                                                placeholder="e.g., S101, 007"
                                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-base"
                                                aria-required="true"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddStudentToClass}
                                            disabled={addingStudent}
                                            className="mt-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-300 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md self-start"
                                            aria-label="Add student to class"
                                        >
                                            {addingStudent ? (
                                                <span className="flex items-center">
                                                    <Spinner />
                                                    Adding...
                                                </span>
                                            ) : 'Add Student'}
                                        </button>
                                    </div>
                                )}

                                {loadingStudents ? (
                                    <p className="text-center text-gray-500 py-8 flex flex-col items-center justify-center">
                                        <Spinner className="h-7 w-7 mb-3" color="text-green-500" />
                                        Loading students...
                                    </p>
                                ) : studentsInClass.length === 0 ? (
                                    <div className="text-center text-gray-500 py-10 border border-dashed border-gray-300 rounded-xl mt-6 bg-white shadow-inner">
                                        <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM12 15v3m0 0v3m0-3h3m-3 0h-3M6 16.5v.5m.5-.5H6m1.5-.5H7m.5-.5H7m.5-.5H7m.5-.5H7M3 20h18a2 2 0 002-2V6a2 2 0 00-2-2H3a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        <h3 className="mt-4 text-xl font-semibold text-gray-900">No students found</h3>
                                        <p className="mt-2 text-base text-gray-600">
                                            Get started by adding your first student to this class using the button above.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 mt-6">
                                        {studentsInClass.map((student) => (
                                            <div
                                                key={student.id}
                                                className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-100 transition-all duration-200 transform hover:-translate-y-1"
                                            >
                                                <div onClick={() => handleStudentClick(student)} className="flex-1 cursor-pointer pr-4 py-1" role="button" tabIndex="0" aria-label={`View details for student ${student.studentName}`}>
                                                    <p className="font-semibold text-lg text-gray-800">{student.studentName}</p>
                                                    <p className="text-sm text-gray-500">ID: {student.studentIdNumber}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteStudent(student.id)}
                                                    className="mt-3 sm:mt-0 px-4 py-2 text-red-600 rounded-md hover:bg-red-50 hover:text-red-700 text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 border border-transparent hover:border-red-200"
                                                    aria-label={`Delete student ${student.studentName}`}
                                                >
                                                    <IoTrash className="text-base" /> Delete
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'attendance' && (
                            <div id="panel-attendance" role="tabpanel" aria-labelledby="tab-attendance" tabIndex="0">
                                <h3 className="text-2xl font-semibold text-green-700 mb-5">Daily Attendance</h3>
                                <div className="p-5 mb-6 bg-white rounded-lg shadow-md border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <label htmlFor="attendance-date" className="font-medium text-lg text-gray-700 min-w-max">Select Date:</label>
                                    <input
                                        id="attendance-date"
                                        type="date"
                                        value={attendanceDate}
                                        onChange={(e) => setAttendanceDate(e.target.value)}
                                        className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-base"
                                        aria-label="Attendance date selector"
                                    />
                                </div>

                                {loadingStudents || loadingAttendance ? (
                                    <p className="text-center text-gray-500 py-8 flex flex-col items-center justify-center">
                                        <Spinner className="h-7 w-7 mb-3" color="text-green-500" />
                                        Loading attendance data...
                                    </p>
                                ) : studentsInClass.length === 0 ? (
                                    <div className="text-center text-gray-500 py-10 border border-dashed border-gray-300 rounded-xl mt-6 bg-white shadow-inner">
                                        <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h.01M7 16h.01M13 16h.01M17 16h.01M7 20h.01M17 20h.01M9 11h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6a2 2 0 012-2z"></path>
                                        </svg>
                                        <h3 className="mt-4 text-xl font-semibold text-gray-900">No students to mark attendance</h3>
                                        <p className="mt-2 text-base text-gray-600">
                                            Add students to this class in the "Students" tab to begin marking attendance.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 mt-6">
                                        {studentsInClass.map((student) => (
                                            <div
                                                key={student.id}
                                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white rounded-lg shadow-md border border-gray-200"
                                            >
                                                <span className="font-semibold text-lg text-gray-800 mb-3 sm:mb-0 w-full sm:w-1/2">{student.studentName}</span>
                                                <div className="flex gap-6 w-full sm:w-1/2 justify-start sm:justify-end" role="radiogroup" aria-label={`Attendance for ${student.studentName}`}>
                                                    <label className="inline-flex items-center text-gray-700 cursor-pointer text-base">
                                                        <input
                                                            type="radio"
                                                            name={`attendance-${student.id}`}
                                                            value="Present"
                                                            checked={dailyAttendance[student.id] === 'Present'}
                                                            onChange={() => handleAttendanceChange(student.id, 'Present')}
                                                            className="form-radio h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 transition-colors duration-200"
                                                            aria-label={`Mark ${student.studentName} as Present`}
                                                        />
                                                        <span className="ml-2 font-medium">Present</span>
                                                    </label>
                                                    <label className="inline-flex items-center text-gray-700 cursor-pointer text-base">
                                                        <input
                                                            type="radio"
                                                            name={`attendance-${student.id}`}
                                                            value="Absent"
                                                            checked={dailyAttendance[student.id] === 'Absent'}
                                                            onChange={() => handleAttendanceChange(student.id, 'Absent')}
                                                            className="form-radio h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 transition-colors duration-200"
                                                            aria-label={`Mark ${student.studentName} as Absent`}
                                                        />
                                                        <span className="ml-2 font-medium">Absent</span>
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={handleSaveAttendance}
                                            disabled={savingAttendance || studentsInClass.length === 0}
                                            className="mt-6 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-300 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center"
                                            aria-label="Save daily attendance"
                                        >
                                            {savingAttendance ? (
                                                <span className="flex items-center">
                                                    <Spinner />
                                                    Saving...
                                                </span>
                                            ) : <><IoSaveOutline className="text-xl mr-2" /> Save Attendance</>}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* {activeTab === 'homework' && (
                            <div id="panel-homework" role="tabpanel" aria-labelledby="tab-homework" tabIndex="0">
                                <h3 className="text-2xl font-semibold text-green-700 mb-5">Homework Management</h3>
                                <div className="mb-8 p-6 bg-white rounded-lg shadow-md border border-purple-100">
                                    <AddHomework classId={selectedClass.id} className={selectedClass.className} />
                                </div>
                                <ListOfHomework classId={selectedClass.id} />
                            </div>
                        )} */}

                        {activeTab === 'notice' && (
                            <div id="panel-class-notice" role="tabpanel" aria-labelledby="tab-class-notice" tabIndex="0">
                                <h3 className="text-2xl font-semibold text-green-700 mb-5">Class Notices</h3>
                               {
                                selectedClass && (
                                    <div className="mb-1 p-0 bg-white rounded-lg shadow-md border border-purple-100">
                                        <AddClassNotice classId={selectedClass.id} className={selectedClass.className} />
                                    </div>
                                )
                               }
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper component for tab buttons
const TabButton = ({ icon, label, isActive, onClick, id, ariaControls }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg transition-all duration-300 font-semibold text-base sm:text-lg
                ${isActive
                    ? 'bg-green-600 text-white shadow-lg relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-green-400 after:rounded-t'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-b-2 border-gray-200 hover:border-green-300'
                }`}
            role="tab"
            aria-selected={isActive}
            id={id}
            aria-controls={ariaControls}
            tabIndex={isActive ? 0 : -1} // Improves keyboard navigation for tabs
        >
            {icon} {label}
        </button>
    );
};

export default ClassDetail;