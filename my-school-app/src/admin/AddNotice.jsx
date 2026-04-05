import React, { useEffect, useState } from 'react';
import { db } from '../setup'; // Assuming '../setup' correctly exports your Firestore db instance
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, orderBy, query, limit, updateDoc } from 'firebase/firestore';
import { FaExclamationTriangle, FaCalendarAlt, FaRegClock } from 'react-icons/fa';
import { VscTrash } from "react-icons/vsc";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import the image and PDF upload components
import NoticeImageUpload from './NoticeImage';
import NoticePdfUpload from './NoticePdfUpload';

function AddNotice() {
  const [notices, setNotices] = useState([]);
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  // Set default expiry date to TOMORROW, to avoid immediate filtering out for new notices
  const [expiredAt, setExpiredAt] = useState(
    new Date(new Date().setDate(new Date().getDate() + 1))
      .toISOString()
      .split('T')[0]
  );
  const [attachedLink, setAttachedLink] = useState('');

  // States to store uploaded URLs for image and PDF separately
  const [noticeImageUrl, setNoticeImageUrl] = useState('');
  const [noticePdfUrl, setNoticePdfUrl] = useState('');

  // Track editing state
  const [editingNoticeId, setEditingNoticeId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Callback for successful image upload
  const handleImageUploadSuccess = (imageUrl) => {
    setNoticeImageUrl(imageUrl);
    // REMOVED: setNoticePdfUrl(''); // Removed this line to allow both image and PDF
    toast.success('Image uploaded successfully!');
    console.log("Image successfully uploaded:", imageUrl);
  };

  // Callback for image upload errors
  const handleImageUploadError = (error) => {
    console.error("Error during image upload:", error);
    toast.error('Failed to upload image. Please try again.');
  };

  // Callback for successful PDF upload
  const handlePdfUploadSuccess = (pdfUrl) => {
    setNoticePdfUrl(pdfUrl);
    // REMOVED: setNoticeImageUrl(''); // Removed this line to allow both image and PDF
    toast.success('PDF uploaded successfully!');
    console.log("PDF successfully uploaded:", pdfUrl);
  };

  // Callback for PDF upload errors
  const handlePdfUploadError = (error) => {
    console.error("Error during PDF upload:", error);
    toast.error('Failed to upload PDF. Please try again.');
  };

  // Add Notice Function
  const addNotice = async () => {
    try {
      if (!title.trim() || !description.trim() || !expiredAt) {
        toast.error('Please fill all required fields.');
        return;
      }
      const noticeRef = collection(db, 'notices');
      console.log("Attempting to add notice to Firestore:", {
        title: title.trim(),
        description: description.trim(),
        expiredAt: new Date(expiredAt),
        timestamp: serverTimestamp(),
        attachedLink: attachedLink.trim() || '',
        imageUrl: noticeImageUrl, // Store image URL
        pdfUrl: noticePdfUrl,     // Store PDF URL
      });
      await addDoc(noticeRef, {
        title: title.trim(),
        description: description.trim(),
        expiredAt: new Date(expiredAt),
        timestamp: serverTimestamp(),
        attachedLink: attachedLink.trim() || '',
        imageUrl: noticeImageUrl,
        pdfUrl: noticePdfUrl,
      });
      toast.success('Notice added successfully!');
      console.log("Notice added successfully. Calling fetchNotices...");
      fetchNotices(); // Re-fetch all notices after adding one
      handleCancel(); // Reset form fields
    } catch (error) {
      console.error('Error adding notice to Firestore:', error);
      toast.error('Failed to add notice.');
    }
  };

  // Update Notice Function
  const updateNotice = async () => {
    try {
      if (!title.trim() || !description.trim() || !expiredAt) {
        toast.error('Please fill all required fields.');
        return;
      }
      const noticeRef = doc(db, 'notices', editingNoticeId);
      console.log("Attempting to update notice in Firestore:", editingNoticeId, {
        title: title.trim(),
        description: description.trim(),
        expiredAt: new Date(expiredAt),
        attachedLink: attachedLink.trim() || '',
        imageUrl: noticeImageUrl,
        pdfUrl: noticePdfUrl,
      });
      await updateDoc(noticeRef, {
        title: title.trim(),
        description: description.trim(),
        expiredAt: new Date(expiredAt),
        attachedLink: attachedLink.trim() || '',
        imageUrl: noticeImageUrl,
        pdfUrl: noticePdfUrl,
      });
      toast.success('Notice updated successfully!');
      console.log("Notice updated successfully. Calling fetchNotices...");
      fetchNotices(); // Re-fetch all notices after updating one
      handleCancel(); // Reset form fields
    } catch (error) {
      console.error('Error updating notice in Firestore:', error);
      toast.error('Failed to update notice.');
    }
  };

  const deleteNotice = async (noticeId) => {
    if (window.confirm("Are you sure you want to delete this notice?")) {
      try {
        console.log("Attempting to delete notice:", noticeId);
        await deleteDoc(doc(db, "notices", noticeId));
        toast.success("Notice deleted successfully!");
        console.log("Notice deleted. Calling fetchNotices...");
        fetchNotices(); // Re-fetch all notices after deleting one
      } catch (error) {
        console.error("Error deleting notice:", error);
        toast.error("Failed to delete notice.");
      }
    }
  };

  // Filter function with added console logs for debugging
  const filterOldNotices = (noticeList) => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Standardize to midnight UTC for comparison
    console.log("Filter: Current Date (midnight UTC) for comparison:", currentDate.toISOString());

    const filtered = noticeList.filter(notice => {
      // Handle cases where expiredAt might be a Firestore Timestamp or a Date string/object
      const expiredDate = notice.expiredAt?.toDate ? notice.expiredAt.toDate() : new Date(notice.expiredAt);
      expiredDate.setHours(0, 0, 0, 0); // Standardize to midnight UTC for notice expiry
      const isKept = expiredDate >= currentDate;
      console.log(`  - Notice: '${notice.title}' (ID: ${notice.id}) | ExpiredAt: ${expiredDate.toISOString()} | Keep: ${isKept}`);
      return isKept;
    });
    console.log("Filter results: Kept", filtered.length, "out of", noticeList.length, "total notices.");
    return filtered;
  };

  // Fetch notices function with added console logs for debugging
  const fetchNotices = async () => {
    try {
      const noticeRef = collection(db, 'notices');
      // Ordering by timestamp in descending order and limiting to 20 recent notices
      const q = query(noticeRef, orderBy("timestamp", "desc"), limit(20));
      console.log("Fetching notices from Firestore with query:", q);
      const snapShot = await getDocs(q);
      console.log("Raw snapshot documents retrieved:", snapShot.docs.length);

      const noticeList = snapShot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        attachedLink: doc.data().attachedLink || '',
        imageUrl: doc.data().imageUrl || '', 
        pdfUrl: doc.data().pdfUrl || '',    
      }));
      console.log("Fetched noticeList (before filter):", noticeList); // IMPORTANT: INSPECT THIS ARRAY IN CONSOLE

      const filteredNotices = filterOldNotices(noticeList);
      console.log("Fetched noticeList (after filter):", filteredNotices); // IMPORTANT: INSPECT THIS ARRAY IN CONSOLE

      setNotices(filteredNotices);
      console.log("Notices state updated. Current notices in state:", filteredNotices.length);

    } catch (error) {
      console.error('Error fetching notices from Firestore:', error);
      toast.error('Failed to fetch notices.');
    }
  };

  // Reset form fields and state
  const handleCancel = () => {
    setShowForm(false);
    setEditingNoticeId(null);
    setTitle('');
    setDescription('');
    // Reset to tomorrow's date for new notices
    setExpiredAt(
      new Date(new Date().setDate(new Date().getDate() + 1))
        .toISOString()
        .split('T')[0]
    );
    setAttachedLink('');
    setNoticeImageUrl(''); // Clear image URL on cancel
    setNoticePdfUrl('');  // Clear PDF URL on cancel
  };

  // Fetch notices on component mount
  useEffect(() => {
    console.log("Component mounted. Initial fetchNotices call.");
    fetchNotices();
  }, []);

  // Set form fields for editing
  const handleEditNotice = (notice) => {
    setEditingNoticeId(notice.id);
    setTitle(notice.title);
    setDescription(notice.description);
    setExpiredAt(
      notice.expiredAt?.toDate
        ? notice.expiredAt.toDate().toISOString().split('T')[0]
        : new Date(notice.expiredAt).toISOString().split('T')[0]
    );
    setAttachedLink(notice.attachedLink || '');
    setNoticeImageUrl(notice.imageUrl || ''); // Populate image URL for editing
    setNoticePdfUrl(notice.pdfUrl || '');     // Populate PDF URL for editing
    setShowForm(true);
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">Notice Board</h1>

        {/* Add/Edit Notice Section */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-10">
          {showForm ? (
            <>
              <h2 className="text-2xl font-semibold text-gray-700 mb-5">
                {editingNoticeId ? 'Edit Notice' : 'Create New Notice'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 ">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notice Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Scheduled Maintenance Downtime"
                    className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notice Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details here..."
                    rows="5"
                    className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={expiredAt}
                    onChange={(e) => setExpiredAt(e.target.value)}
                    className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attached Link (Optional)</label>
                  <input
                    type="url"
                    value={attachedLink}
                    onChange={(e) => setAttachedLink(e.target.value)}
                    placeholder="https://example.com/notice-details"
                    className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>

                {/* Image & PDF Upload Integration */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notice Image (Optional)</label>
                  <NoticeImageUpload
                    onImageUploadSuccess={handleImageUploadSuccess}
                    onImageUploadError={handleImageUploadError}
                  />

                  <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Notice PDF (Optional)</label>
                  <NoticePdfUpload
                    onPdfUploadSuccess={handlePdfUploadSuccess}
                    onPdfUploadError={handlePdfUploadError}
                  />

                  {/* Attachment Preview (handles both image and PDF) */}
                  {(noticeImageUrl || noticePdfUrl) && (
                    <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
                      <p className="text-sm text-gray-600 mb-2">Attached File Preview:</p>
                      {noticeImageUrl && (
                        <div className="mb-2">
                          <img
                            src={noticeImageUrl}
                            alt="Notice Preview"
                            className="max-w-full h-auto mx-auto rounded-md shadow-sm"
                            style={{ maxWidth: '300px', maxHeight: '200px', objectFit: 'contain' }}
                          />
                          <p className="text-xs text-gray-500 mt-1 break-all">
                            Image: {noticeImageUrl}
                          </p>
                        </div>
                      )}
                      {noticePdfUrl && (
                        <div>
                          <a
                            href={noticePdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline text-lg font-medium flex items-center justify-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V7.414L12.586 4H6zM10 9a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm-4 4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm-1 3a1 1 0 000 2h8a1 1 0 100-2H5z" clipRule="evenodd" />
                            </svg>
                            View PDF Document
                          </a>
                          <p className="text-xs text-gray-500 mt-1 break-all">
                            PDF: {noticePdfUrl}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingNoticeId ? updateNotice : addNotice}
                    className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                  >
                    {editingNoticeId ? 'Update Notice' : 'Publish Notice'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition text-lg"
            >
              Add New Notice
            </button>
          )}
        </div>

        {/* Current Notices Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Current Active Notices</h2>
          {notices.length === 0 ? (
            <div className="text-center bg-white p-12 rounded-xl shadow-md">
              <FaExclamationTriangle className="mx-auto text-5xl text-yellow-400 mb-4" />
              <p className="text-gray-600 text-lg">There are no active notices at the moment.</p>
              <p className="text-gray-500">Click "Add New Notice" above to post an update.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {notices.map((notice) => (
                <div key={notice.id} className="relative bg-white border border-gray-200 rounded-xl shadow-md p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600 rounded-t-xl"></div>
                  <div className="flex-grow">
                    <h3 className="font-bold text-2xl text-gray-900 mb-3 text-center">{notice.title}</h3>

                    {/* Display the image OR the PDF if either exists in the saved notice */}
                    {(notice.imageUrl || notice.pdfUrl) && (
                      <div className="mb-4">
                        {notice.imageUrl && ( // If there's an image URL, display the image
                          <img
                            src={notice.imageUrl}
                            alt={notice.title}
                            className="w-full h-48 object-cover rounded-lg shadow-sm"
                          />
                        )}
                        {notice.pdfUrl && ( // If there's a PDF URL, display a link to the PDF
                          <div className={notice.imageUrl ? "mt-2" : ""}> {/* Add margin if there's also an image */}
                            <a
                              href={notice.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline text-lg font-medium flex items-center justify-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V7.414L12.586 4H6zM10 9a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm-4 4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm-1 3a1 1 0 000 2h8a1 1 0 100-2H5z" clipRule="evenodd" />
                              </svg>
                              View PDF Document
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="flex items-center text-sm text-gray-500 mb-3">
                      <FaCalendarAlt className="mr-2 text-gray-400" />
                      Posted on: {notice.timestamp?.toDate().toLocaleDateString()}
                    </p>
                    <p className="text-gray-800 text-base leading-relaxed">{notice.description}</p> {/* Corrected: Use notice.description */}
                    {notice.attachedLink && (
                      <div className="mt-3">
                        <a href={notice.attachedLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                          View More Details
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="flex items-center text-red-600 text-sm font-medium">
                      <FaRegClock className="mr-2" />
                      Expires: {notice.expiredAt?.toDate().toLocaleDateString()}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditNotice(notice)}
                        className="px-3 py-1 text-blue-600 border border-blue-200 rounded hover:bg-blue-50 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteNotice(notice.id)}
                        className="px-3 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    </div>
  );
}

export default AddNotice;