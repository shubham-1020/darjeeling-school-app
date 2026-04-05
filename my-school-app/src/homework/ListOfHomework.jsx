// import { useState, useEffect, useCallback } from 'react';
// import React from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { db } from '../setup';
// import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
// import { toast } from 'react-toastify';
// // Import react-icons (you need to install them: npm install react-icons)
// import { FaTrashAlt, FaPlusCircle, FaRegCalendarAlt, FaRegStickyNote } from 'react-icons/fa';

// const ListOfHomework = () => {
//     const { classId } = useParams();
//     const [homeworkList, setHomeworkList] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const navigate = useNavigate();

//     // Use useCallback to memoize the fetch function to prevent unnecessary re-renders
//     const fetchHomework = useCallback(async () => {
//         setLoading(true);
//         setError(null); // Clear previous errors
//         try {
//             if (!classId) {
//                 setError("Class ID is missing. Cannot fetch homework.");
//                 setLoading(false);
//                 return;
//             }
//             // Order homework by due date ascending for better organization
//             const homeworkCollectionRef = collection(db, 'classes', classId, 'homework');
//             const q = query(homeworkCollectionRef, orderBy('dueDate', 'asc')); 
//             const homeworkSnapshot = await getDocs(q);
//             const homeworkData = homeworkSnapshot.docs.map(doc => ({
//                 id: doc.id,
//                 ...doc.data()
//             }));
//             setHomeworkList(homeworkData);
//         } catch (err) {
//             console.error("Error fetching homework:", err);
//             setError("Failed to fetch homework. Please try again.");
//             toast.error("Failed to load homework.");
//         } finally {
//             setLoading(false);
//         }
//     }, [classId]);

//     useEffect(() => {
//         fetchHomework();
//     }, [fetchHomework]); 

//     const handleDelete = async (homeworkId) => {
//         if (window.confirm("Are you sure you want to delete this homework? This action cannot be undone.")) {
//             try {
//                 await deleteDoc(doc(db, 'classes', classId, 'homework', homeworkId));
//                 setHomeworkList(homeworkList.filter(hw => hw.id !== homeworkId));
//                 toast.success("Homework deleted successfully!");
//             } catch (err) {
//                 console.error("Error deleting homework:", err);
//                 toast.error("Failed to delete homework. Please try again.");
//             }
//         }
//     };

//     if (loading) {
//         return (
//             <div className="flex justify-center items-center py-8">
//                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
//                 <p className="ml-4 text-lg text-gray-600">Loading homework...</p>
//             </div>
//         );
//     }
//     if (error) {
//         return (
//             <div className="text-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mx-auto max-w-xl">
//                 <strong className="font-bold">Error!</strong>
//                 <span className="block sm:inline ml-2">{error}</span>
//             </div>
//         );
//     }
//     if (!classId) {
//         return (
//             <div className="text-center bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mx-auto max-w-xl">
//                 <strong className="font-bold">Warning!</strong>
//                 <span className="block sm:inline ml-2">Class ID is required to display homework.</span>
//             </div>
//         );
//     }

//     return (
//         <div className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
//             <div className="flex justify-between items-center mb-6">
//                 <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
//                     Assigned Homework
//                 </h2>
//                 {/* Optional: "Add New" button if this component is used independently */}
//                 {/* <button
//                     onClick={handleAddHomeworkClick}
//                     className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
//                 >
//                     <FaPlusCircle className="mr-2" /> Add New
//                 </button> */}
//             </div>

//             {homeworkList.length === 0 ? (
//                 <div className="bg-white p-6 rounded-lg shadow-md text-center">
//                     <p className="text-gray-600 text-lg">
//                         <FaRegStickyNote className="inline-block text-4xl text-gray-400 mb-2" />
//                         <br />
//                         No homework assigned yet for this class.
//                     </p>
//                     <p className="text-gray-500 mt-2">Use the form above to add the first assignment!</p>
//                 </div>
//             ) : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                     {homeworkList.map(hw => (
//                         <div key={hw.id} className="bg-white border border-gray-200 rounded-lg shadow-md p-6 flex flex-col justify-between transform transition duration-300 hover:scale-[1.02] hover:shadow-lg">
//                             <div>
//                                 <h3 className="text-xl font-semibold text-gray-800 mb-2 truncate">
//                                     {hw.title}
//                                 </h3>
//                                 <p className="text-gray-600 text-sm mb-4 line-clamp-3">
//                                     {hw.description}
//                                 </p>
//                                 <p className="text-sm text-gray-500 flex items-center mb-4">
//                                     <FaRegCalendarAlt className="mr-2 text-blue-500" />
//                                     Due Date: <span className="font-medium text-gray-700 ml-1">
//                                         {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
//                                     </span>
//                                 </p>
//                             </div>
//                             <div className="flex justify-end">
//                                 <button
//                                     onClick={() => handleDelete(hw.id)}
//                                     className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out text-sm"
//                                 >
//                                     <FaTrashAlt className="mr-2" /> Delete
//                                 </button>
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             )}
//         </div>
//     );
// }

// export default ListOfHomework;