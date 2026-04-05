import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../setup';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

function AllClasses({studentId}) {
  // const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      if(!studentId){
        return
      }
      try {
        setLoading(true);

        // 1. Fetch the student doc
        const studentDocRef = doc(db, 'students', studentId);
        const studentSnap = await getDoc(studentDocRef);

        if (!studentSnap.exists()) {
          setError("Student not found");
          setLoading(false);
          return;
        }

        const studentData = studentSnap.data();
        setStudent(studentData);

        // 2. Find classes where studentRefs contains THIS student
        const classesQuery = query(
          collection(db, "classes"),
          where("studentRefs", "array-contains", studentDocRef) 
        );

        const classSnaps = await getDocs(classesQuery);

        const classList = await Promise.all(
          classSnaps.docs.map(async (cls) => {
            const classData = cls.data();

            // 3. Fetch teacher details from teacherRef
            let teacherData = {};
            if (classData.teacherRef) {
              const teacherSnap = await getDoc(classData.teacherRef);
              if (teacherSnap.exists()) {
                teacherData = teacherSnap.data();
              }
            }

            return {
              id: cls.id,
              ...classData,
              teacher: teacherData
            };
          })
        );

        setClasses(classList);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId]);

  if (loading) return <p>Loading student profile...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {student && (
        <div className="mb-6 border rounded-lg p-4 bg-gray-50">
          <h2 className="text-2xl font-bold">{student.studentName}</h2>
          <p><b>Roll No:</b> {student.studentIdNumber}</p>
          <p><b>Class:</b> {student.className}</p>
          <p><b>Section:</b> {student.section}</p>
        </div>
      )}

      <h3 className="text-xl font-semibold mb-3">Enrolled Classes</h3>
      {classes.length === 0 ? (
        <p>No classes enrolled yet.</p>
      ) : (
        <ul className="space-y-4">
          {classes.map((cls) => (
            <li key={cls.id} className="p-4 border rounded-md bg-white shadow">
              <p><b>Class Name:</b> {cls.className}</p>
              <p><b>Section:</b> {cls.section}</p>
              <p><b>Subject:</b> {cls.subject}</p>
              {cls.teacher && (
                <p><b>Teacher:</b> {cls.teacher.teacherName} ({cls.teacher.email})</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}



export default AllClasses