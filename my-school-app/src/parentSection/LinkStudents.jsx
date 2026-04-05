import React, { useState } from 'react';
import { auth, db } from '../setup';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import FetchStudents from './FetchStudents';

function LinkStudents() {
  const [student, setStudent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleLinkStudent = async () => {
    if (!student.trim()) {
      setError("Please enter a student ID.");
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setLoading(true);

      const parentUid = auth.currentUser?.uid;
      if (!parentUid) {
        setError("Not logged in as parent.");
        return;
      }

      const parentDocRef = doc(db, 'parents', parentUid);
      const parentDocSnap = await getDoc(parentDocRef);

      if (!parentDocSnap.exists()) {
        setError("Parent profile not found.");
        return;
      }

      await updateDoc(parentDocRef, {
        studentIds: arrayUnion(student) 
      });

      setSuccessMessage("Student linked successfully!");
      setStudent('');
    } catch (error) {
      console.error("Error linking student: ", error);
      setError("Failed to link student. Please try again.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <>
      <h2>Student Overview</h2>
      <div>
        <h3>Link a Student</h3>
        <input
          type="text"
          placeholder="Enter student ID"
          value={student}
          onChange={(e) => setStudent(e.target.value)}
        />
        <button onClick={handleLinkStudent} disabled={loading}>
          {loading ? "Linking..." : "Link Student"}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
        <FetchStudents/>
      </div>
    </>
  );
}

export default LinkStudents;
