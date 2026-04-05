import React, { useEffect, useState } from 'react';
import { auth, db } from '../setup'; // Assuming your firebase config is in '../setup'
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import AddClass from '../class_students/AddClass'; // Assuming AddClass component
import ClassDetail from '../teacherview/ClassDetail'; // Assuming ClassDetail component
import DisplayNotice from './DisplayNotice';

const TeacherDashboard = () => {
  const [teacherName, setTeacherName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [viewAdminNotice, setViewAdminNotice] = useState(false); // State to toggle admin notice view

  const navigate = useNavigate();

  const fetchClasses = async (currentTeacherUid) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'classes'), where('teacherUid', '==', currentTeacherUid));
      const querySnapshot = await getDocs(q);
      const classData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClasses(classData);
    } catch (err) {
      console.error("Error fetching classes:", err);
      setError("Failed to load classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const teacherDocRef = doc(db, 'teachers', user.uid);
          const teacherDocSnap = await getDoc(teacherDocRef);

          if (teacherDocSnap.exists()) {
            setTeacherName(teacherDocSnap.data().name);
            setTeacherId(user.uid);
            await fetchClasses(user.uid);
          } else {
            const parentDocRef = doc(db, 'parents', user.uid);
            const parentDocSnap = await getDoc(parentDocRef);
            if (parentDocSnap.exists()) {
              navigate('/parent-dashboard');
            } else {
              setError("Your profile could not be found. Please log in again.");
              await signOut(auth);
              navigate('/login');
            }
          }
        } catch (err) {
          console.error("Error setting up dashboard:", err);
          setError("An error occurred loading your dashboard.");
          await signOut(auth);
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = () => {
    signOut(auth).then(() => navigate('/'));
  };

  const filteredClasses = classes.filter(cls =>
    cls.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.section.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClassClick = (cls) => {
    setSelectedClass(cls);
  };

  const handleClassUpdated = () => {
    fetchClasses(teacherId);
  };

  const handleClassDeleted = () => {
    fetchClasses(teacherId);
    setSelectedClass(null);
  };

  const handleBackToList = () => {
    setSelectedClass(null);
  };

  // Loading and Error states with styling
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-lg font-semibold text-gray-700 animate-pulse">Loading teacher dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-md" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-sans antialiased">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm p-4 md:p-6 flex justify-between items-center border-b border-gray-100">
        <h1 className="text-xl md:text-3xl font-extrabold text-gray-900">
          Welcome, <span className="text-indigo-600 drop-shadow-sm">{teacherName}</span>
        </h1>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={() => setViewAdminNotice(!viewAdminNotice)}
            // Changed from "hidden sm:inline-flex" to "inline-flex"
            className="inline-flex bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-70 text-sm"
            aria-label={viewAdminNotice ? 'Hide Admin Notice' : 'View Admin Notice'}
          >
            {viewAdminNotice ? 'Hide' : 'Notice'}
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {
          viewAdminNotice && (
            <div className="mb-8">
              <DisplayNotice
                onClose={() => setViewAdminNotice(false)}
                className="bg-white shadow-lg rounded-2xl p-6 md:p-8 border border-gray-100"
              />
            </div>
          )
        }

        {/* Main Content Area */}
        <div className="mt-8">
          {selectedClass ? (
            <ClassDetail
              selectedClass={selectedClass}
              onClassUpdated={handleClassUpdated}
              onClassDeleted={handleClassDeleted}
              onBackToList={handleBackToList}
            />
          ) : (
            <div className="bg-white shadow-lg rounded-2xl p-6 md:p-8 border border-gray-100">

              {/* Search Bar and Add Class Button */}
              <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                <input
                  type="text"
                  placeholder="Search by class name, subject, or section..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:flex-grow px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-300 text-gray-800 text-base placeholder-gray-400 shadow-sm"
                  aria-label="Search classes"
                />

                {/* Assuming AddClass accepts a `className` prop for its button */}
                <AddClass
                  teacherId={teacherId}
                  onClassAdded={() => fetchClasses(teacherId)}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-70 flex-shrink-0"
                />
              </div>

              {/* Class List Header */}
              <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3 border-gray-200">
                Your Classes ({filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'})
              </h2>

              {/* Responsive Grid for Classes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => (
                    <div
                      key={cls.id}
                      onClick={() => handleClassClick(cls)}
                      className="relative bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-xl cursor-pointer transition duration-300 transform hover:-translate-y-2 group flex flex-col justify-between shadow-sm"
                      role="button"
                      tabIndex="0"
                      aria-label={`View details for ${cls.className}`}
                    >
                      <div>
                        <h3 className="text-xl font-extrabold text-gray-900 mb-2 truncate group-hover:text-indigo-700 transition duration-200">
                          {cls.className}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3">
                          <span className="font-medium text-gray-700">Subject:</span> {cls.subject} <br />
                          <span className="font-medium text-gray-700">Section:</span> {cls.section}
                        </p>
                      </div>
                      <div className="flex justify-end mt-4">
                        <span className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-100 py-1.5 px-4 rounded-full shadow-sm group-hover:bg-indigo-200 transition duration-200">
                          View Details
                          <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center text-gray-500 py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-semibold text-gray-900">No classes found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by adding your first class.
                    </p>
                    <div className="mt-6">
                      <AddClass
                        teacherId={teacherId}
                        onClassAdded={() => fetchClasses(teacherId)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-70"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;