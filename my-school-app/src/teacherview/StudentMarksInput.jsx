import React, { useState, useEffect } from 'react';
import { db } from '../setup';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Icons provide great visual feedback for users.
import { FaCheckCircle, FaExclamationTriangle, FaSpinner, FaPlus } from 'react-icons/fa';

/**
 * A reusable Alert component for displaying feedback messages.
 * @param {Object} props - Component props.
 * @param {'success' | 'error'} props.type - The type of alert.
 * @param {string} props.message - The message to display.
 */
const Alert = ({ type, message }) => {
  const isSuccess = type === 'success';
  const baseClasses = 'p-3 rounded-lg flex items-center gap-3 text-sm font-semibold';
  const typeClasses = isSuccess
    ? 'bg-green-100 text-green-800 border border-green-200'
    : 'bg-red-100 text-red-800 border border-red-200';

  return (
    <div className={`${baseClasses} ${typeClasses}`} role="alert">
      {isSuccess ? <FaCheckCircle /> : <FaExclamationTriangle />}
      <span>{message}</span>
    </div>
  );
};

/**
 * A modern, responsive component for adding student marks.
 */
const StudentMarksInput = ({ student, teacherUid, onMarksAdded, onCancel }) => {
    const [subject, setSubject] = useState('');
    const [marks, setMarks] = useState('');
    const [marksDate, setMarksDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    // Best Practice: Clear the success message timeout if the component unmounts.
    useEffect(() => {
        let timer;
        if (successMessage) {
            timer = setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
        }
        // Cleanup function to clear the timer if the component is unmounted
        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [successMessage]); // This effect only runs when successMessage changes.

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Best Practice: Reset all messages on a new submission attempt.
        setError('');
        setSuccessMessage('');
        setLoading(true);

        // --- Validation ---
        if (!subject.trim() || marks === '' || !marksDate) {
            setError('Please fill out all fields.');
            setLoading(false);
            return;
        }
        
        const numericMarks = parseFloat(marks);
        if (isNaN(numericMarks) || numericMarks < 0) {
            setError('Marks must be a positive number (e.g., 85 or 72.5).');
            setLoading(false);
            return;
        }

        // --- Firestore Operation ---
        try {
            await addDoc(collection(db, 'student_marks'), {
                studentId: student.id,
                classId: student.classId,
                teacherUid: teacherUid,
                subjectName: subject.trim(),
                marks: numericMarks,
                marksDate: marksDate,
                createdAt: serverTimestamp(),
            });

            // Reset form and show success message
            setSubject('');
            setMarks('');
            setMarksDate(new Date().toISOString().split('T')[0]);
            setSuccessMessage('Mark added successfully!');
            
            // Trigger the callback to notify the parent component
            if (onMarksAdded) {
                onMarksAdded();
            }

        } catch (err) {
            console.error("Error adding document: ", err);
            setError('Failed to save the mark. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Common Tailwind classes for form inputs for consistency
    const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";

    return (
        // The main container. No major changes needed here.
        <div>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* --- Form Fields --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject Name</label>
                        <input
                            type="text"
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g., Mathematics, Science"
                            className={inputClasses}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="marks" className="block text-sm font-medium text-gray-700">Marks / Grade</label>
                        <input
                            type="number"
                            id="marks"
                            value={marks}
                            onChange={(e) => setMarks(e.target.value)}
                            placeholder="e.g., 85"
                            className={inputClasses}
                            min="0"
                            step="0.1" // Allow decimal marks
                            required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="marksDate" className="block text-sm font-medium text-gray-700">Date of Exam/Test</label>
                    <input
                        type="date"
                        id="marksDate"
                        value={marksDate}
                        onChange={(e) => setMarksDate(e.target.value)}
                        className={inputClasses}
                        required
                    />
                </div>
                
                {/* --- Feedback Section --- */}
                <div className="pt-2">
                    {/* Only render one message at a time, giving priority to errors */}
                    {error ? (
                        <Alert type="error" message={error} />
                    ) : successMessage ? (
                        <Alert type="success" message={successMessage} />
                    ) : null}
                </div>

                {/* --- Action Buttons --- */}
                {/* This layout is responsive: stacked on mobile, side-by-side on larger screens. */}
                <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
                    <button
                        type="submit"
                        className="inline-flex justify-center items-center w-full sm:w-auto py-2 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? (
                            <FaSpinner className="animate-spin -ml-1 mr-3 h-5 w-5" />
                        ) : (
                            <FaPlus className="-ml-1 mr-2 h-5 w-5" />
                        )}
                        {loading ? 'Adding...' : 'Add Mark'}
                    </button>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="inline-flex justify-center w-full sm:w-auto py-2 px-6 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-60"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default StudentMarksInput;