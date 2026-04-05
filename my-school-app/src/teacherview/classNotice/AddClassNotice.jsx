import React, { useEffect, useState } from 'react';
import { db } from '../../setup';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  limit,
  updateDoc
} from 'firebase/firestore';
import { FaExclamationTriangle, FaRegClock, FaPlusCircle } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import NoticeImage from './NoticeImage';
import NoticePdf from './NoticePdf';

function AddClassNotice({ classId }) {
  const [notices, setNotices] = useState([]);
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [expiredAt, setExpiredAt] = useState(
    new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]
  );
  const [attachedLink, setAttachedLink] = useState('');
  const [noticeImageUrl, setNoticeImageUrl] = useState('');
  const [noticePdfUrl, setNoticePdfUrl] = useState('');
  const [editingNoticeId, setEditingNoticeId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const handleImageUploadSuccess = (url) => { setNoticeImageUrl(url); toast.success('Image uploaded!'); };
  const handlePdfUploadSuccess = (url) => { setNoticePdfUrl(url); toast.success('PDF uploaded!'); };
  const handleImageUploadError = () => toast.error('Image upload failed!');
  const handlePdfUploadError = () => toast.error('PDF upload failed!');

  const addNotice = async () => {
    if (!title.trim() || !description.trim() || !expiredAt) return toast.error('Fill all required fields!');
    try {
      await addDoc(collection(db, 'classes', classId, 'classNotices'), {
        title: title.trim(),
        description: description.trim(),
        expiredAt: new Date(expiredAt),
        timestamp: serverTimestamp(),
        attachedLink: attachedLink.trim() || '',
        imageUrl: noticeImageUrl,
        pdfUrl: noticePdfUrl,
      });
      toast.success('Notice added!');
      fetchNotices();
      handleCancel();
    } catch {
      toast.error('Failed to add notice!');
    }
  };

  const updateNotice = async () => {
    if (!title.trim() || !description.trim() || !expiredAt) {
      return toast.error('Fill all required fields!');
    }
    try {
      const ref = doc(db, 'classes', classId, 'classNotices', editingNoticeId);
      console.log("Updating notice with ID:", editingNoticeId);

      await updateDoc(ref, {
        title: title.trim(),
        description: description.trim(),
        expiredAt: new Date(expiredAt),
        attachedLink: attachedLink.trim() || '',
        imageUrl: noticeImageUrl,
        pdfUrl: noticePdfUrl,
      });
      toast.success('Notice updated!');
      fetchNotices();
      handleCancel();
    } catch (err) {
      console.error("Update failed:", err);
      toast.error('Failed to update notice!');
    }
  };

  const deleteNotice = async (id) => {
    if (!window.confirm("Delete this notice?")) return;
    try {
      await deleteDoc(doc(db, 'classes', classId, 'classNotices', id));
      toast.success("Notice deleted!");
      fetchNotices();
    } catch {
      toast.error("Failed to delete notice!");
    }
  };

  const fetchNotices = async () => {
    try {
      const q = query(
        collection(db, 'classes', classId, 'classNotices'),
        orderBy("timestamp", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const now = new Date();
      const filtered = list.filter(n => {
        try {
          const exp = n.expiredAt?.toDate ? n.expiredAt.toDate() : new Date(n.expiredAt);
          return exp >= new Date(now.setHours(0, 0, 0, 0));
        } catch { return true; }
      });
      setNotices(filtered);
    } catch {
      toast.error("Failed to fetch notices!");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingNoticeId(null);
    setTitle('');
    setDescription('');
    setExpiredAt(new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]);
    setAttachedLink('');
    setNoticeImageUrl('');
    setNoticePdfUrl('');
  };

  const handleEditNotice = (n) => {
    setEditingNoticeId(n.id);
    setTitle(n.title || '');
    setDescription(n.description || '');
    setExpiredAt(
      n.expiredAt?.toDate
        ? n.expiredAt.toDate().toISOString().split('T')[0]
        : (n.expiredAt ? new Date(n.expiredAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    );
    setAttachedLink(n.attachedLink || '');
    setNoticeImageUrl(n.imageUrl || '');
    setNoticePdfUrl(n.pdfUrl || '');
    setShowForm(true);
  };

  useEffect(() => { fetchNotices(); }, []);

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center">Class Notice Board</h1>

        {/* Add/Edit Section */}
        <div className="bg-white p-2 sm:p-8 rounded-lg shadow-md mb-8">
          {showForm ? (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{editingNoticeId ? 'Edit Notice' : 'Create New Notice'}</h2>

              <div className="space-y-4">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Notice Title"
                  className="w-full px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />

                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Notice Description"
                  rows={4}
                  className="w-full px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={expiredAt}
                    onChange={e => setExpiredAt(e.target.value)}
                    className="px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <input
                    type="url"
                    value={attachedLink}
                    onChange={e => setAttachedLink(e.target.value)}
                    placeholder="Attached Link (Optional)"
                    className="px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <NoticeImage onImageUploadSuccess={handleImageUploadSuccess} onImageUploadError={handleImageUploadError} />
                <NoticePdf onPdfUploadSuccess={handlePdfUploadSuccess} onPdfUploadError={handlePdfUploadError} />

                {(noticeImageUrl || noticePdfUrl) && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm font-medium mb-2">Attachment Preview</p>
                    {noticeImageUrl && <img src={noticeImageUrl} alt="preview" className="w-full max-h-40 object-cover rounded-md mb-2" />}
                    {noticePdfUrl && <a href={noticePdfUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Open PDF</a>}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button onClick={handleCancel} className="w-full sm:w-auto px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
                  <button onClick={editingNoticeId ? updateNotice : addNotice} className="w-full sm:w-auto px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
                    {editingNoticeId ? 'Update Notice' : 'Publish Notice'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700">
              <FaPlusCircle /> Add New Class Notice
            </button>
          )}
        </div>

        {/* Notices */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Active Notices</h2>

        {notices.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <FaExclamationTriangle className="mx-auto text-3xl text-yellow-500 mb-3" />
            <p className="text-gray-600">No active notices yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {notices.map(n => (
              <div
                key={n.id}
                className={`p-4 rounded-lg shadow-sm flex flex-col transition border-2 
                  ${editingNoticeId === n.id
                    ? "border-blue-500 bg-blue-50 scale-[1.02]"
                    : "border-transparent bg-white"}`}
              >
                <h3 className="font-semibold text-gray-900 mb-2">{n.title}</h3>
                {n.imageUrl && <img src={n.imageUrl} alt={n.title} className="w-full max-h-36 object-cover rounded-md mb-2" />}
                {n.pdfUrl && <a href={n.pdfUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline mb-2">View PDF</a>}
                <p className="text-sm text-gray-600 mb-2">Posted on: {n.timestamp?.toDate?.().toLocaleDateString?.() || '—'}</p>
                <p className="text-gray-700 flex-grow mb-3">{n.description}</p>

                <div className="flex items-center justify-between gap-3 mt-2">
                  <span className="text-sm text-red-600 flex items-center">
                    <FaRegClock className="mr-1" /> Expires: {n.expiredAt?.toDate?.().toLocaleDateString?.() || '—'}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditNotice(n)} className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm">Edit</button>
                    <button onClick={() => deleteNotice(n.id)} className="px-3 py-1 rounded-md text-white bg-red-600 hover:bg-red-700 text-sm">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    </div>
  );
}

export default AddClassNotice;
