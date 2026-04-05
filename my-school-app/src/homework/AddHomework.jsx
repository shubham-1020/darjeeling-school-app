// import { collection, addDoc, serverTimestamp } from "firebase/firestore";
// import { useEffect, useState } from "react";
// import { db } from "../setup";
// import { useNavigate } from "react-router-dom";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { useParams } from "react-router-dom";
// // Ensure ListOfHomework is in the same directory or adjust path
// import ListOfHomework from "./ListOfHomework"; 

// const AddHomework = () => {
//   const { classId } = useParams();
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [dueDate, setDueDate] = useState("");
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!classId) {
//       toast.error("Class ID is required.");
//       return;
//     }
//     if (!title || !description || !dueDate) {
//       toast.error("All fields are required.");
//       return;
//     }
//     // More robust date validation
//     if (isNaN(new Date(dueDate).getTime())) {
//         toast.error("Invalid due date format. Please use a valid date.");
//         return;
//     }

//     try {
//       await addDoc(collection(db, "classes", classId, "homework"), {
//         title,
//         description,
//         dueDate,
//         createdAt: serverTimestamp(),
//       });
//       toast.success("Homework added successfully!");
//       setTitle("");
//       setDescription("");
//       setDueDate("");
//       // Removed the alert and navigate to same page as toast is sufficient.
//       // If ListOfHomework needs to refresh, you might need a state prop or context.
//       // For this example, assuming ListOfHomework has its own useEffect that re-fetches.
//     } catch (error) {
//       console.error("Error adding homework: ", error); // For debugging
//       toast.error("Error adding homework: " + (error.message || "Unknown error"));
//     }
//   };

//   // useEffect(() => {
//   //   if(!classId) return;
//   //   const q  = collection(db, "classes", classId, "homework");
//   //   const unsubscribe = onSnapshot(q, (snapshot) => {
//   //     if (snapshot.empty) {
//   //       toast.info("No homework found for this class.");
//   //     }
//   //   }, (error) => {
//   //     console.error("Error fetching homework: ", error);
//   //     toast.error("Failed to fetch homework. Please try again.");
//   //   });
//   //   return () => unsubscribe(); 

//   // }, [classId]); 
//   return (
//     // Outer container for centering and responsive padding/background
//     <div className="min-h-screen bg-gray-50 flex flex-col items-center  sm:px-6 lg:px-8">
//       {/* Main content area - Add Homework Form */}
//       <div className="bg-white shadow-xl rounded-xl p-6 sm:p-8 lg:p-10 w-full max-w-md md:max-w-lg lg:max-w-2xl mb-8">
//         <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-900">
//           Add New Homework
//         </h2>
//         <form onSubmit={handleSubmit} className="space-y-6">
//           {/* Title */}
//           <div>
//             <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
//               Homework Title
//             </label>
//             <input
//               type="text"
//               id="title"
//               value={title}
//               onChange={(e) => setTitle(e.target.value)}
//               required
//               placeholder="e.g., Math Assignment Chapter 3"
//               className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
//             />
//           </div>

//           {/* Description */}
//           <div>
//             <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
//               Description
//             </label>
//             <textarea
//               id="description"
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               required
//               rows={5}
//               placeholder="Provide a detailed description of the homework tasks."
//               className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm resize-y placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
//             ></textarea>
//           </div>

//           {/* Due Date */}
//           <div>
//             <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
//               Due Date
//             </label>
//             <input
//               type="date"
//               id="dueDate"
//               value={dueDate}
//               onChange={(e) => setDueDate(e.target.value)}
//               required
//               className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
//             />
//           </div>

//           {/* Submit Button */}
//           <button
//             type="submit"
//             className="w-full flex justify-center  py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
//           >
//             Add Homework
//           </button>
//         </form>
//       </div>
//       {/* List of Homework component, placed below the form */}
//       <ListOfHomework />
//     </div>
//   );
// };

// export default AddHomework;