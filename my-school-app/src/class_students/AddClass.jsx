import React, { useState, useEffect } from 'react';
import { db, auth } from '../setup';
import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

const AddClass = ({ teacherId, onClassAdded }) => {
    const [user] = useAuthState(auth);
    const [className, setClassName] = useState('');
    const [section, setSection] = useState('');
    const [subject, setSubject] = useState('');
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState([]);
    const [editId, setEditId] = useState(null);

    useEffect(() => {
        if (user) {
            fetchClasses();
        }
    }, [user]);

    const fetchClasses = async () => {
        const q = query(collection(db, 'classes'), where('teacherUid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const classList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setClasses(classList);
    };

    const handleAddOrUpdateClass = async () => {
        if (!className.trim() || !section.trim() || !subject.trim()) {
            alert('Please fill all fields');
            return;
        }

        if (!user || !teacherId) {
            alert('Teacher not authenticated or ID missing ');
            return;
        }

        setLoading(true);

        try {
            if (editId) {
                // Update existing class
                const classRef = doc(db, 'classes', editId);
                await updateDoc(classRef, {
                    className: className.trim(),
                    section: section.trim(),
                    subject: subject.trim()
                });
                alert('✏️ Class updated!');
                setEditId(null);
            } else {
                // Add new class
                await addDoc(collection(db, 'classes'), {
                    className: className.trim(),
                    section: section.trim(),
                    subject: subject.trim(),
                    teacherUid: user.uid,
                    studentRefs: [],
                    messages: [],
                    createdAt: serverTimestamp()
                });
                alert('Class added!');
            }

            setClassName('');
            setSection('');
            setSubject('');
            fetchClasses();
            onClassAdded?.();
        } catch (error) {
            console.error('Error adding/updating class:', error);
            alert('Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (classItem) => {
        setEditId(classItem.id);
        setClassName(classItem.className);
        setSection(classItem.section);
        setSubject(classItem.subject);
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, 'classes', id));
            fetchClasses();
            alert('Class deleted!');
        } catch (error) {
            console.error('Error deleting class:', error);
            alert(' Failed to delete class.');
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-md max-w-md mx-auto mb-6">
            <h2 className="text-xl font-bold mb-4 text-center">
                {editId ? 'Edit Class' : 'Add New Class'}
            </h2>
            <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Class Name (e.g., Class 10)"
                className="w-full px-4 py-2 mb-2 border rounded-md"
            />
            <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="Section (e.g., A)"
                className="w-full px-4 py-2 mb-2 border rounded-md"
            />
            <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (e.g., Science)"
                className="w-full px-4 py-2 mb-4 border rounded-md"
            />
            <button
                onClick={handleAddOrUpdateClass}
                disabled={loading}
                className={`w-full ${editId ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-semibold py-2 px-4 rounded`}
            >
                {loading ? (editId ? 'Updating...' : 'Adding...') : editId ? 'Update Class' : 'Add Class'}
            </button>
        </div>
    );
};

export default AddClass;
