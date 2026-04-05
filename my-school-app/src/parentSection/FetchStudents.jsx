import { getDoc, doc } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { auth, db } from '../setup';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function FetchStudents() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          setError(null);
          setLoading(true);

          const parentDocRef = doc(db, 'parents', user.uid);
          const parentDocSnap = await getDoc(parentDocRef);

          if (!parentDocSnap.exists()) {
            setError("Your profile could not be found. Please log in again.");
            await signOut(auth);
            navigate('/login');
            return;
          }

          const parentData = parentDocSnap.data() || {};
          const studentIds = parentData.studentIds || [];
          const studentList = [];

          // Use Promise.all for potentially faster fetching if many students
          const studentPromises = studentIds.map(async (studentId) => {
            const studentDocRef = doc(db, 'students', studentId);
            const studentDocSnap = await getDoc(studentDocRef);

            if (studentDocSnap.exists()) {
              const studentData = studentDocSnap.data();
              let teacherName = "Unknown";

              if (studentData.teacherUid) {
                const teacherDocRef = doc(db, 'teachers', studentData.teacherUid);
                const teacherDocSnap = await getDoc(teacherDocRef);

                if (teacherDocSnap.exists()) {
                  const teacherData = teacherDocSnap.data();
                  teacherName = teacherData.teacherName || teacherData.name || "Unnamed";
                }
              }

              return {
                id: studentId,
                ...studentData,
                teacherName,
              };
            }
            return null; // Return null for students that don't exist
          });

          const fetchedStudents = await Promise.all(studentPromises);
          // Filter out any nulls from students that didn't exist
          setStudents(fetchedStudents.filter(s => s !== null));
          setLoading(false);

        } catch (error) {
          console.error("Error fetching students:", error);
          setError("Error fetching students. Please try again later.");
          setLoading(false);
          setStudents([]);
        } finally {
          setLoading(false);
        }
      } else {
        setError("You are not logged in. Please log in to view your students.");
        setLoading(false);
        setStudents([]);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-white shadow-xl rounded-lg my-8">
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 text-center mb-6 pb-3 border-b-2 border-gray-200">
        Linked Students
      </h2>

      {loading && (
        <div className="flex items-center justify-center p-6 bg-blue-50 text-blue-700 rounded-lg shadow-md space-x-3">
          <div className="animate-spin h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-lg font-medium">Loading students...</p>
        </div>
      )}

      {error && (
        <div className="p-6 bg-red-50 text-red-700 rounded-lg shadow-md flex items-center justify-center space-x-2">
          <span className="text-xl">❌</span>
          <p className="text-lg font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && students.length === 0 && (
        <div className="p-6 bg-yellow-50 text-yellow-700 rounded-lg shadow-md text-center">
          <p className="text-lg font-medium mb-2">No students are linked to your account yet.</p>
          <p className="text-md">Please contact support if you believe this is an error.</p>
        </div>
      )}

      {!loading && !error && students.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer"
              onClick={() => navigate(`/my-child/${student.id}`, { state: student })}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                {student.studentName}
              </h3>
              <p className="text-gray-600">
                <span className="font-medium">Class:</span> {student.className}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Section:</span> {student.section}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Teacher:</span> {student.teacherName}
              </p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default FetchStudents;