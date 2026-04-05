import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import { db } from '../setup';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Import default calendar styles

// React Icons
import { IoClose, IoAdd, IoClipboardOutline, IoPeopleOutline, IoCalendarClearOutline, IoInformationCircleOutline } from 'react-icons/io5';
import { FaSpinner } from 'react-icons/fa'; // For a better spinner icon

// Assuming this component is also styled with Tailwind or is self-contained
import StudentMarksInput from './StudentMarksInput';

// Helper function to safely convert Firestore Timestamp or Date to string
const safeToDateString = (val) => {
    try {
        if (!val) return 'N/A';
        const d = typeof val.toDate === 'function' ? val.toDate() : new Date(val);
        // Format as "Jan 01, 2023" for better readability
        return d instanceof Date && !isNaN(d) ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    } catch {
        return 'N/A';
    }
};

const StudentDetailView = ({ student, onClose, teacherUid }) => {
    // Attendance
    const [attendanceHistoryList, setAttendanceHistoryList] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState(new Map());
    const [loadingAttendance, setLoadingAttendance] = useState(true);
    const [attendanceError, setAttendanceError] = useState(null);
    const [calendarDate, setCalendarDate] = useState(new Date());

    // Marks
    const [studentMarks, setStudentMarks] = useState([]);
    const [loadingMarks, setLoadingMarks] = useState(true);
    const [marksError, setMarksError] = useState(null);
    const [subjectSummary, setSubjectSummary] = useState([]);
    const [showMarksInput, setShowMarksInput] = useState(false);

    // Alert/Snackbar state
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState(''); // 'success', 'error', 'warning', 'info'
    const [showAlert, setShowAlert] = useState(false);

    // Wrap showMessage in useCallback to prevent it from changing on every render
    const showMessage = useCallback((message, type) => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 5000); // Hide after 5 seconds
    }, [setAlertMessage, setAlertType, setShowAlert]); // Dependencies are the stable setState functions

    // fetch attendance history (one-time snapshot)
    useEffect(() => {
        const fetchStudentAttendance = async () => {
            if (!student?.id || !student?.classId || !teacherUid) {
                setLoadingAttendance(false);
                setAttendanceHistoryList([]);
                setAttendanceMap(new Map());
                return;
            }
            setLoadingAttendance(true);
            setAttendanceError(null);
            try {
                const q = query(
                    collection(db, 'attendance'),
                    where('classId', '==', student.classId),
                    where('teacherUid', '==', teacherUid),
                    orderBy('date', 'desc')
                );

                const querySnapshot = await getDocs(q);
                const list = [];
                const map = new Map();

                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const attendanceDate = data.date; // expected format: 'YYYY-MM-DD'
                    const records = data.records || [];
                    const studentRecord = records.find((rec) => rec.studentId === student.id);
                    if (studentRecord) {
                        list.push({
                            date: attendanceDate,
                            status: studentRecord.status,
                        });
                        map.set(attendanceDate, studentRecord.status);
                    }
                });

                setAttendanceHistoryList(list);
                setAttendanceMap(map);
            } catch (err) {
                console.error('Error fetching student attendance history:', err);
                showMessage('Failed to load attendance history.', 'error'); // This call is now stable
                setAttendanceError('Failed to load attendance history.');
                setAttendanceHistoryList([]);
                setAttendanceMap(new Map());
            } finally {
                setLoadingAttendance(false);
            }
        };

        fetchStudentAttendance();
    }, [student, teacherUid, showMessage]); // showMessage is now stable

    // fetch marks in real-time and compute subject summary
    useEffect(() => {
        if (!student?.id || !teacherUid) {
            setLoadingMarks(false);
            setStudentMarks([]);
            setSubjectSummary([]);
            return;
        }

        setLoadingMarks(true);
        setMarksError(null);
        setSubjectSummary([]);

        const q = query(
            collection(db, 'student_marks'),
            where('studentId', '==', student.id),
            where('teacherUid', '==', teacherUid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const marksList = [];
                const subjectCounts = new Map();
                querySnapshot.forEach((docSnap) => {
                    const markData = docSnap.data() || {};
                    marksList.push({ id: docSnap.id, ...markData });

                    const subjectName = markData.subjectName;
                    if (subjectName) {
                        subjectCounts.set(subjectName, (subjectCounts.get(subjectName) || 0) + 1);
                    }
                });

                setStudentMarks(marksList);
                setLoadingMarks(false);

                const summary = Array.from(subjectCounts.entries()).map(([subjectName, count]) => ({
                    subjectName,
                    count,
                }));
                setSubjectSummary(summary.sort((a, b) => a.subjectName.localeCompare(b.subjectName)));
            },
            (error) => {
                console.error('Error fetching student marks:', error);
                showMessage('Failed to load student marks.', 'error'); // This call is now stable
                setMarksError('Failed to load student marks.');
                setLoadingMarks(false);
                setSubjectSummary([]);
                setStudentMarks([]);
            }
        );

        return () => unsubscribe();
    }, [student, teacherUid, showMessage]); // showMessage is now stable

    // calendar tile styling
    const tileClassName = ({ date, view }) => {
        if (view === 'month') {
            const formatted = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
            const status = attendanceMap.get(formatted);
            if (status === 'Present') return 'present-day-calendar'; // Custom class for Tailwind
            if (status === 'Absent') return 'absent-day-calendar';   // Custom class for Tailwind
        }
        return null;
    };

    const alertClasses = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700',
    };

    if (!student) {
        return (
            <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-lg shadow-md text-center text-gray-500">
                <p>No student selected.</p>
            </div>
        );
    }

    return (
        <div className="relative max-w-6xl mx-auto my-4 p-4 sm:p-6 bg-white rounded-xl shadow-lg flex flex-col gap-6">
            {showAlert && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-3 rounded-lg border ${alertClasses[alertType]} shadow-lg transition-opacity duration-300 ${showAlert ? 'opacity-100' : 'opacity-0'}`}>
                    {alertMessage}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-200">
                <div className="mb-4 sm:mb-0">
                    <h2 className="text-2xl font-semibold text-blue-700">
                        {student.studentName || 'Unnamed Student'}
                    </h2>
                    <p className="text-gray-600 text-sm">
                        Roll Number: <span className="font-medium">{student.studentIdNumber || student.id || '—'}</span>
                    </p>
                    <p className="text-gray-600 text-sm">
                        Class: <span className="font-medium">{student.className || '—'}</span>
                        {student.section ? ` • Section: ${student.section}` : ''}
                    </p>
                    {student.createdAt && (
                        <p className="text-gray-500 text-xs mt-1">Added: {safeToDateString(student.createdAt)}</p>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1 px-4 py-2 bg-red-500 text-gray-700 rounded-lg hover:bg-red-600 transition-colors duration-200 text-sm font-medium"
                    >
                        <IoClose className="text-lg " /> Close
                    </button>
                    <button
                        onClick={() => setShowMarksInput(prev => !prev)}
                        className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium
                            ${showMarksInput ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        <IoAdd className="text-lg" /> {showMarksInput ? 'Cancel Entry' : 'Add Marks'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LEFT: Attendance Calendar */}
                <div className="p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-xl font-medium text-blue-600 mb-4 flex items-center gap-2">
                        <IoCalendarClearOutline /> Attendance Calendar
                    </h3>

                    {loadingAttendance ? (
                        <div className="text-center text-gray-500 py-6 flex items-center justify-center">
                            <FaSpinner className="animate-spin h-5 w-5 mr-3 text-blue-500" />
                            <span>Loading attendance data for calendar...</span>
                        </div>
                    ) : attendanceError ? (
                        <div className="text-red-500 text-center py-6 border border-dashed border-red-300 rounded-md">
                            <p>{attendanceError}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-full max-w-sm"> {/* Limit calendar width */}
                                <Calendar
                                    onChange={setCalendarDate}
                                    value={calendarDate}
                                    tileClassName={tileClassName}
                                    view="month"
                                    calendarType="gregory"
                                    className="react-calendar-tailwind" // Apply custom styling class
                                />
                            </div>

                            <button
                                onClick={() => setCalendarDate(new Date())}
                                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200 text-sm font-medium"
                            >
                                Today
                            </button>
                            <div className="text-sm text-gray-600 text-center space-y-1">
                                <p className="font-semibold flex items-center justify-center">
                                    <IoInformationCircleOutline className="inline mr-1 text-base text-blue-500" /> Click a date to view.
                                </p>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="inline-block w-4 h-4 bg-green-200 rounded-full border border-green-300"></span>
                                    <span>Present</span>
                                    <span className="inline-block w-4 h-4 bg-red-200 rounded-full border border-red-300"></span>
                                    <span>Absent</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Marks / Subjects */}
                <div className="flex flex-col gap-6">
                    {/* Marks input panel */}
                    {showMarksInput && (
                        <div className="p-5 bg-blue-50 rounded-lg shadow-sm border border-blue-100">
                            <StudentMarksInput
                                student={student}
                                teacherUid={teacherUid}
                                onMarksAdded={() => {
                                    setShowMarksInput(false);
                                    showMessage('Marks added successfully!', 'success');
                                }}
                                onCancel={() => setShowMarksInput(false)}
                            />
                        </div>
                    )}

                    {/* Subject Summary */}
                    <div className="p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-dashed border-gray-200">
                            <h3 className="text-xl font-medium text-blue-600 flex items-center gap-2">
                                <IoClipboardOutline /> Subjects with Recorded Marks
                            </h3>
                            <span className="text-gray-500 text-sm px-3 py-1 bg-gray-100 rounded-full font-medium">
                                {subjectSummary.length} subjects
                            </span>
                        </div>

                        {loadingMarks ? (
                            <div className="text-center text-gray-500 py-6 flex items-center justify-center">
                                <FaSpinner className="animate-spin h-5 w-5 mr-3 text-blue-500" />
                                <span>Loading subjects...</span>
                            </div>
                        ) : marksError ? (
                            <div className="text-red-500 text-center py-6 border border-dashed border-red-300 rounded-md">
                                <p>{marksError}</p>
                            </div>
                        ) : subjectSummary.length === 0 ? (
                            <p className="text-center text-gray-500 py-6 border border-dashed border-gray-300 rounded-md">No subjects recorded yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {subjectSummary.map((s) => (
                                    <div key={s.subjectName} className="p-3 bg-white rounded-md shadow-sm border border-gray-200 flex justify-between items-center text-gray-700">
                                        <div className="font-medium text-gray-800">{s.subjectName}</div>
                                        <div className="text-sm text-gray-600">{s.count} record(s)</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* All Marks: table on md+, cards on mobile */}
                    <div className="p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-xl font-medium text-blue-600 mb-4">All Recorded Marks</h3>

                        {loadingMarks ? (
                            <div className="text-center text-gray-500 py-6 flex items-center justify-center">
                                <FaSpinner className="animate-spin h-5 w-5 mr-3 text-blue-500" />
                                <span>Loading marks...</span>
                            </div>
                        ) : marksError ? (
                            <div className="text-red-500 text-center py-6 border border-dashed border-red-300 rounded-md">
                                <p>{marksError}</p>
                            </div>
                        ) : studentMarks.length === 0 ? (
                            <p className="text-center text-gray-500 py-6 border border-dashed border-gray-300 rounded-md">No marks have been added for this student.</p>
                        ) : (
                            <>
                                {/* mobile card list */}
                                <div className="md:hidden space-y-3">
                                    {studentMarks.map((mark) => (
                                        <div key={mark.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <div>
                                                    <p className="font-semibold text-gray-800 text-lg">{mark.subjectName || '—'}</p>
                                                    <p className="text-sm text-gray-600">Marks: <span className="font-bold text-blue-700">{mark.marks ?? '—'}</span></p>
                                                </div>
                                                <p className="text-xs text-gray-500">{safeToDateString(mark.createdAt)}</p>
                                            </div>
                                            <p className="text-xs text-gray-500">Exam Date: {mark.marksDate ? new Date(mark.marksDate).toLocaleDateString() : '—'}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* desktop table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="py-3 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Subject</th>
                                                <th className="py-3 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Marks</th>
                                                <th className="py-3 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Exam Date</th>
                                                <th className="py-3 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Added On</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentMarks.map((mark) => (
                                                <tr key={mark.id} className="hover:bg-gray-50">
                                                    <td className="py-3 px-4 border-b border-gray-200 text-sm text-gray-800">{mark.subjectName}</td>
                                                    <td className="py-3 px-4 border-b border-gray-200 text-sm text-gray-700 font-medium">{mark.marks ?? '—'}</td>
                                                    <td className="py-3 px-4 border-b border-gray-200 text-sm text-gray-600">{mark.marksDate ? new Date(mark.marksDate).toLocaleDateString() : '—'}</td>
                                                    <td className="py-3 px-4 border-b border-gray-200 text-sm text-gray-500">{safeToDateString(mark.createdAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Attendance History List — cards on mobile, table on md+ */}
            <div className="p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-xl font-medium text-blue-600 mb-4 flex items-center gap-2">
                    <IoPeopleOutline /> Attendance History
                </h3>

                {loadingAttendance ? (
                    <div className="text-center text-gray-500 py-6 flex items-center justify-center">
                        <FaSpinner className="animate-spin h-5 w-5 mr-3 text-blue-500" />
                        <span>Loading attendance history...</span>
                    </div>
                ) : attendanceError ? (
                    <div className="text-red-500 text-center py-6 border border-dashed border-red-300 rounded-md">
                        <p>{attendanceError}</p>
                    </div>
                ) : attendanceHistoryList.length === 0 ? (
                    <p className="text-center text-gray-500 py-6 border border-dashed border-gray-300 rounded-md">No attendance records found for this student in this class.</p>
                ) : (
                    <>
                        {/* mobile card list */}
                        <div className="md:hidden space-y-3">
                            {attendanceHistoryList.map((rec) => (
                                <div key={rec.date} className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-800">{new Date(rec.date).toLocaleDateString()}</p>
                                        <p className="text-xs text-gray-500">Date</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-sm font-medium
                                        ${rec.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                    >
                                        {rec.status}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="py-3 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                                        <th className="py-3 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceHistoryList.map((record) => (
                                        <tr key={record.date} className="hover:bg-gray-50">
                                            <td className="py-3 px-4 border-b border-gray-200 text-sm text-gray-800">{new Date(record.date).toLocaleDateString()}</td>
                                            <td className="py-3 px-4 border-b border-gray-200 text-sm">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium
                                                    ${record.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {record.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            
        </div>
    );
};

export default StudentDetailView;