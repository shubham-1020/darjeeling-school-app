import React, { useState, useEffect } from 'react';
import { auth, db } from '../setup'; // your existing setup file
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc as firestoreGetDoc, // Renamed to avoid conflict with React.getDoc if it existed
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaSave, FaTimes, FaUserGraduate, FaInfoCircle, FaExclamationCircle } from 'react-icons/fa'; // Added more icons

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // editing UI state
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '' });

  // auth & admin state (client-side)
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdminClaim, setIsAdminClaim] = useState(false); // custom claim
  const [isAdminDoc, setIsAdminDoc] = useState(false); // admins collection doc

  // safe date formatter (handles Timestamp, Date, string, or missing)
  const formatDate = (d) => {
    if (!d) return '—';
    if (typeof d.toDate === 'function') return d.toDate().toLocaleString();
    try {
      // Check if it's already a valid date string before attempting new Date()
      if (typeof d === 'string' && !isNaN(new Date(d))) {
        return new Date(d).toLocaleString();
      }
      return new Date(d).toLocaleString();
    } catch {
      return '—';
    }
  };

  useEffect(() => {
    let unsubAuth = () => {};
    unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user || null);
      setIsAdminClaim(false);
      setIsAdminDoc(false);

      if (user) {
        try {
          // refresh token once to get up-to-date claims
          const tokenRes = await user.getIdTokenResult(true);
          setIsAdminClaim(Boolean(tokenRes?.claims?.role === 'admin'));
        } catch (err) {
          console.warn('Could not read token claims:', err);
        }

        try {
          // check admins/{uid} doc for admin flag
          const adminDocRef = doc(db, 'admins', user.uid);
          const adminSnap = await firestoreGetDoc(adminDocRef); // Use renamed getDoc
          if (adminSnap.exists()) {
            setIsAdminDoc(true);
          }
        } catch (err) {
          console.warn('Could not read admins collection:', err);
        }
      }
    });

    fetchTeachers();

    return () => {
      unsubAuth();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const q = collection(db, 'teachers');
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTeachers(list);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      toast.error('Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (teacher) => {
    setEditingTeacherId(teacher.id);
    setEditFormData({ name: teacher.name || '', email: teacher.email || '' });
  };

  const handleEditChange = (e) => {
    setEditFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  // client-side "can modify" check (UX only)
  const canModify = (targetTeacherId) => {
    if (!currentUser) return false;
    // Removed specific owner check: typically admin manages all teachers.
    // If a teacher can edit *only* their own profile, that's a separate feature.
    // For a general "Manage Teachers" page, only admin permission matters for edit/delete actions on *any* teacher.
    if (isAdminClaim || isAdminDoc) return true; // admin by claim or admins collection
    return false;
  };

  // Save (update) handler
  const saveEdit = async (teacherId) => {
    if (!editFormData.name.trim() || !editFormData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    if (!currentUser) {
      toast.error('You must be signed in to edit');
      setEditingTeacherId(null); // Exit editing mode
      return;
    }

    // Re-check permissions just before the write operation
    try {
      const tokenRes = await auth.currentUser.getIdTokenResult(true);
      setIsAdminClaim(Boolean(tokenRes?.claims?.role === 'admin'));
      const adminSnap = await firestoreGetDoc(doc(db, 'admins', auth.currentUser.uid));
      setIsAdminDoc(adminSnap.exists());
    } catch (err) {
      console.warn('Error refreshing token or checking admin doc:', err);
    }

    if (!canModify(teacherId)) {
      toast.error('You do not have permission to edit this teacher.');
      setEditingTeacherId(null); // Exit editing mode
      return;
    }

    try {
      const ref = doc(db, 'teachers', teacherId);
      await updateDoc(ref, {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        updatedAt: serverTimestamp(),
      });

      // Optimistic UI update
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherId
            ? { ...t, name: editFormData.name.trim(), email: editFormData.email.trim(), updatedAt: new Date().toISOString() }
            : t
        )
      );

      setEditingTeacherId(null);
      toast.success('Teacher updated successfully!');
    } catch (err) {
      console.error('Error saving teacher edit:', err);
      if (err.code === 'permission-denied') {
        toast.error('Permission denied. Check your Firestore rules or admin status.');
      } else {
        toast.error(`Failed to update teacher: ${err.message || 'unknown error'}`);
      }
    }
  };

  // Delete handler
  const handleDeleteTeacher = async (teacherId) => {
    if (!window.confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) return;

    if (!currentUser) {
      toast.error('You must be signed in to delete');
      return;
    }

    // Re-check permissions just before the delete operation
    try {
      const tokenRes = await auth.currentUser.getIdTokenResult(true);
      setIsAdminClaim(Boolean(tokenRes?.claims?.role === 'admin'));
      const adminSnap = await firestoreGetDoc(doc(db, 'admins', auth.currentUser.uid));
      setIsAdminDoc(adminSnap.exists());
    } catch (err) {
      console.warn('Error refreshing token or checking admin doc:', err);
    }

    if (!canModify(teacherId)) {
      toast.error('You do not have permission to delete this teacher.');
      return;
    }

    try {
      const ref = doc(db, 'teachers', teacherId);
      await deleteDoc(ref);
      setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
      toast.success('Teacher deleted successfully!');
    } catch (err) {
      console.error('Error deleting teacher:', err);
      if (err.code === 'permission-denied') {
        toast.error('Permission denied. Check your Firestore rules or admin status.');
      } else {
        toast.error(`Failed to delete teacher: ${err.message || 'unknown error'}`);
      }
    }
  };

  // --- UI STATES ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] bg-gray-50">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-xl font-medium text-gray-700">Loading teachers...</p>
      </div>
    );
  }

  // Determine if the current user has modification rights for *any* teacher
  const hasGlobalModifyPermission = isAdminClaim || isAdminDoc;

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-12 text-center leading-tight">
          Manage School Teachers
        </h1>

        {!currentUser && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg relative mb-8 text-center" role="alert">
            <span className="block sm:inline">
              <FaInfoCircle className="inline mr-2 text-blue-500" />
              You are not signed in. Sign in to manage teachers.
            </span>
          </div>
        )}

        {currentUser && !hasGlobalModifyPermission && (
          <div className="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded-lg relative mb-8 text-center" role="alert">
            <span className="block sm:inline">
              <FaExclamationCircle className="inline mr-2 text-orange-500" />
              You do not have administrative privileges to manage teachers.
            </span>
          </div>
        )}

        {teachers.length === 0 ? (
          <div className="text-center p-8 bg-white border border-yellow-300 text-yellow-800 rounded-lg shadow-md mx-auto max-w-lg">
            <p className="font-bold text-2xl mb-2">No Teachers Found</p>
            <p className="text-lg">It looks like there are no teacher profiles to display yet.</p>
            <p className="text-sm mt-4 text-yellow-700">
              Consider adding documents to your 'teachers' collection in Firestore.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between transition-all duration-300 hover:shadow-xl"
              >
                <div className="flex flex-col gap-2 flex-grow">
                  {editingTeacherId === teacher.id ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        name="name"
                        value={editFormData.name}
                        onChange={handleEditChange}
                        className="form-input block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
                        placeholder="Teacher Name"
                        aria-label="Edit Teacher Name"
                      />
                      <input
                        type="email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditChange}
                        className="form-input block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
                        placeholder="Teacher Email"
                        aria-label="Edit Teacher Email"
                      />
                    </div>
                  ) : (
                    <>
                      <h2 className="font-bold text-3xl text-gray-900 flex items-center">
                        <FaUserGraduate className="mr-3 text-indigo-600 text-4xl" />
                        {teacher.name || 'Unnamed Teacher'}
                      </h2>
                      <p className="text-gray-600 text-lg ml-9">
                        <span className="font-medium">Email:</span> {teacher.email || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-400 ml-9">
                        <span className="font-medium">Created:</span> {formatDate(teacher.createdAt)}
                      </p>
                      {teacher.updatedAt && (
                        <p className="text-sm text-gray-400 ml-9">
                          <span className="font-medium">Last Updated:</span> {formatDate(teacher.updatedAt)}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-3 mt-4 md:mt-0 md:ml-6 flex-shrink-0">
                  {editingTeacherId === teacher.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(teacher.id)}
                        className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
                        aria-label="Save Teacher"
                      >
                        <FaSave className="mr-2" /> Save
                      </button>
                      <button
                        onClick={() => setEditingTeacherId(null)}
                        className="flex items-center bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
                        aria-label="Cancel Editing"
                      >
                        <FaTimes className="mr-2" /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {hasGlobalModifyPermission && (
                        <button
                          onClick={() => startEditing(teacher)}
                          className="flex items-center text-blue-600 hover:text-blue-800 font-semibold py-2 px-3 rounded-lg transition-colors duration-200"
                          aria-label="Edit Teacher"
                        >
                          <FaEdit className="mr-2" /> Edit
                        </button>
                      )}
                    </>
                  )}
                  {hasGlobalModifyPermission && (
                    <button
                      onClick={() => handleDeleteTeacher(teacher.id)}
                      className="flex items-center text-red-600 hover:text-red-800 font-semibold py-2 px-3 rounded-lg transition-colors duration-200"
                      aria-label="Delete Teacher"
                    >
                      <FaTrash className="mr-2" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}