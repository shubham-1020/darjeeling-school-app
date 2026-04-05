import React, { useEffect, useState } from "react";
import { db } from "../setup";
import { collection, doc, onSnapshot, getDoc, updateDoc, deleteDoc } from "firebase/firestore"; 

const ManageClasses = () => {
  const [classes, setClasses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- State for Editing ---
  const [editingClassId, setEditingClassId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    className: "",
    section: "",
    subject: "",
    teacherName: "",
    teacherEmail: "",
    teacherDob: "",
  });

  useEffect(() => {
    console.log("Subscribing to classes in realtime...");

    const unsub = onSnapshot(
      collection(db, "classes"),
      async (classSnap) => {
        try {
          const classList = classSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          console.log("--- Classes updated:", classList);

          const mergedClasses = await Promise.all(
            classList.map(async (cls) => {
              let teacher = null;

              try {
                if (cls.teacherRef) {
                  const teacherSnap = await getDoc(cls.teacherRef);
                  if (teacherSnap.exists()) {
                    teacher = { id: teacherSnap.id, ...teacherSnap.data() };
                  }
                } else if (cls.teacherUid) {
                  const teacherRef = doc(db, "teachers", cls.teacherUid);
                  const teacherSnap = await getDoc(teacherRef);
                  if (teacherSnap.exists()) {
                    teacher = { id: teacherSnap.id, ...teacherSnap.data() };
                  }
                }
              } catch (err) {
                console.error(`Error fetching teacher for class ${cls.id}`, err);
              }

              return {
                ...cls,
                teacher: teacher
                  ? {
                      id: teacher.id,
                      name: teacher.name || "Unnamed Teacher",
                      email: teacher.email || "No email",
                      dob: teacher.dob || "N/A",
                    }
                  : null,
              };
            })
          );

          const grouped = mergedClasses.reduce((acc, cls) => {
            let groupKey = cls.className;
            if (groupKey) {
              const parts = groupKey.split(" ");
              groupKey =
                parts.length >= 2 ? `${parts[0]} ${parts[1]}` : groupKey;
            } else {
              groupKey = "Unknown Class";
            }

            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(cls);
            return acc;
          }, {});

          setClasses(grouped);
          setLoading(false);
        } catch (err) {
          console.error("Realtime fetch error:", err);
          setError("Failed to load classes in realtime.");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Realtime subscription error:", err);
        setError("Failed to Load the classes.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // --- Handlers for Edit Functionality ---
  const handleEditClick = (cls) => {
    setEditingClassId(cls.id);
    setEditFormData({
      className: cls.className || "",
      section: cls.section || "",
      subject: cls.subject || "",
      teacherName: cls.teacher ? cls.teacher.name : "",
      teacherEmail: cls.teacher ? cls.teacher.email : "",
      teacherDob: cls.teacher ? cls.teacher.dob : "",
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleUpdateClass = async (classId) => {
    try {
      const classDocRef = doc(db, "classes", classId);
      await updateDoc(classDocRef, editFormData);
      setEditingClassId(null); 
      setEditFormData(
        { className: "", 
          section: "", 
          subject: "",
         }); 

         const classSnap = await getDoc(classDocRef);
         if(classSnap.exists()) {
          const classData = classSnap.data();
          let teacherRef = null;

          if (classData.teacherRef) {
            teacherRef = classData.teacherRef;
          } else if (classData.teacherUid) {
            teacherRef = doc(db, "teachers", classData.teacherUid);
          }

         if(teacherRef) {
          await updateDoc(teacherRef, {
            name: editFormData.teacherName,
            email: editFormData.teacherEmail,
            dob: editFormData.teacherDob,
          });
        }
      }
      setEditingClassId(null);
      setEditFormData({
        className: "",
        section: "",
        subject: "",
        teacherName: "",
        teacherEmail: "",
        teacherDob: "",
      });

      alert("Class updated successfully!");
    } catch (err) {
      console.error("Error updating class:", err);
      setError("Failed to update class. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setEditingClassId(null);
    setEditFormData(
      { className: "",
        section: "", 
        subject: "" 
      });
  };

  // --- Handler for Delete Functionality ---
  const handleDeleteClass = async (classId, className) => {
    if (window.confirm(`Are you sure you want to delete "${className}"? This action cannot be undone.`)) {
      try {
        const classDocRef = doc(db, "classes", classId);
        await deleteDoc(classDocRef);
        alert(`Class "${className}" deleted successfully!`);
      } catch (err) {
        console.error("Error deleting class:", err);
        setError("Failed to delete class. Please try again.");
      }
    }
  };

  // --- UI STATES ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] bg-gray-50">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-xl font-medium text-gray-700">Loading classes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] bg-red-50 p-8">
        <div className="text-center p-8 bg-white border border-red-300 text-red-700 rounded-lg shadow-md mx-auto max-w-lg">
          <p className="font-bold text-2xl mb-2">Oops! An Error Occurred</p>
          <p className="text-lg">{error}</p>
          <p className="text-sm mt-4 text-red-600">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      </div>
    );
  }

  if (!classes || Object.keys(classes).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] bg-yellow-50 p-8">
        <div className="text-center p-8 bg-white border border-yellow-300 text-yellow-800 rounded-lg shadow-md mx-auto max-w-lg">
          <p className="font-bold text-2xl mb-2">No Classes Found</p>
          <p className="text-lg">It looks like there are no classes available to display yet.</p>
          <p className="text-sm mt-4 text-yellow-700">
            Consider adding documents to your 'classes' collection in Firestore.
          </p>
        </div>
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-12 text-center leading-tight">
          Manage School Classes
        </h1>

        <div className="space-y-12">
          {Object.keys(classes).map((grade) => (
            <section
              key={grade}
              className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200"
            >
              <h2 className="text-4xl font-extrabold text-gray-800 mb-8 pb-4 border-b-2 border-indigo-200">
                {grade}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {classes[grade].map((cls) => (
                  <div
                    key={cls.id}
                    className="bg-indigo-50 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
                  >
                    {editingClassId === cls.id ? (
                      // --- Edit Form ---
                      <div className="space-y-4">
                        <div>
                          <label htmlFor={`className-${cls.id}`} className="block text-sm font-medium text-indigo-800">Class Name</label>
                          <input
                            type="text"
                            id={`className-${cls.id}`}
                            name="className"
                            value={editFormData.className}
                            onChange={handleEditFormChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                          />
                        </div>
                        <div>
                          <label htmlFor={`section-${cls.id}`} className="block text-sm font-medium text-indigo-800">Section</label>
                          <input
                            type="text"
                            id={`section-${cls.id}`}
                            name="section"
                            value={editFormData.section}
                            onChange={handleEditFormChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                          />
                        </div>
                        <div>
                          <label htmlFor={`subject-${cls.id}`} className="block text-sm font-medium text-indigo-800">Subject</label>
                          <input
                            type="text"
                            id={`subject-${cls.id}`}
                            name="subject"
                            value={editFormData.subject}
                            onChange={handleEditFormChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                          />
                        </div>

                        {/* // --- Edit Teacher Information --- */}
                        
                        <div>
                          <label htmlFor={`teacherName-${cls.id}`} className="block text-sm font-medium text-indigo-800">Teacher Name</label>
                          <input
                            type="text"
                            id={`teacherName-${cls.id}`}
                            name="teacherName"
                            value={editFormData.teacherName}
                            onChange={handleEditFormChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                          />
                          <label htmlFor={`teacherEmail-${cls.id}`} className="block text-sm font-medium text-indigo-800 mt-2">Teacher Email</label>
                          <input
                            type="email"
                            id={`teacherEmail-${cls.id}`}
                            name="teacherEmail"
                            value={editFormData.teacherEmail}
                            onChange={handleEditFormChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                          />
                          <label htmlFor={`teacherDob-${cls.id}`} className="block text-sm font-medium text-indigo-800 mt-2">Teacher DOB</label>
                          <input
                            type="date"
                            id={`teacherDob-${cls.id}`}
                            name="teacherDob"
                            value={editFormData.teacherDob}
                            onChange={handleEditFormChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                          <button
                            onClick={() => handleUpdateClass(cls.id)}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // --- Display Mode ---
                      <>
                        <div>
                          <h3 className="text-2xl font-bold text-indigo-800 mb-2">
                            {cls.className || "Unnamed Class"}
                          </h3>
                          {cls.section && (
                            <p className="text-lg text-indigo-700 font-semibold mb-3">
                              Section: <span className="font-normal">{cls.section}</span>
                            </p>
                          )}
                          <p className="text-gray-700 mb-4">
                            <span className="font-medium text-gray-800">Subject:</span>{" "}
                            {cls.subject || "Not Specified"}
                          </p>
                        </div>

                        <div className="pt-4 mt-4 border-t border-indigo-200">
                          <h4 className="font-bold text-indigo-800 text-lg mb-2">
                            Teacher Information:
                          </h4>
                          {cls.teacher ? (
                            <div className="space-y-1 text-gray-700">
                              <p>
                                <span className="font-medium">Name:</span>{" "}
                                {cls.teacher.name}
                              </p>
                              <p>
                                <span className="font-medium">Email:</span>{" "}
                                {cls.teacher.email}
                              </p>
                              <p>
                                <span className="font-medium">DOB:</span>{" "}
                                {cls.teacher.dob}
                              </p>
                            </div>
                          ) : (
                            <p className="text-red-600 italic text-md font-medium">
                              No teacher assigned to this class.
                            </p>
                          )}
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                          <button
                            onClick={() => handleEditClick(cls)}
                            className="py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls.id, cls.className)}
                            className="py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-200"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageClasses;