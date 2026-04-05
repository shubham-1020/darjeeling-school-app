import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../setup';
import { toast } from 'react-toastify';
import { FaChevronLeft, FaChevronRight, FaExclamationTriangle, FaExternalLinkAlt, FaFilePdf } from 'react-icons/fa'; // Import more icons

function DisplayNotice() {
    const [notices, setNotices] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotices = useCallback(async () => {
        setLoading(true);
        try {
            const noticeRef = collection(db, 'notices');
            const q = query(noticeRef, orderBy("timestamp", "desc"), limit(20));

            const snapShot = await getDocs(q);
            const noticeList = snapShot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                attachedLink: doc.data().attachedLink || '',
                imageUrl: doc.data().imageUrl || '',
                pdfUrl: doc.data().pdfUrl || '',
            }));

            setNotices(noticeList);
            setCurrentIndex(0); // Reset index on new data fetch
        } catch (error) {
            console.error('Error fetching notices from Firestore:', error);
            toast.error('Failed to fetch notices.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    const goToPrevious = () => {
        setCurrentIndex((prevIndex) => 
            prevIndex === 0 ? notices.length - 1 : prevIndex - 1
        );
    };

    const goToNext = () => {
        setCurrentIndex((prevIndex) => 
            prevIndex === notices.length - 1 ? 0 : prevIndex + 1
        );
    };

    const currentNotice = notices[currentIndex];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48 bg-gray-50 rounded-lg shadow-md my-8">
                <p className="text-gray-600 text-lg animate-pulse">Loading important notices...</p>
            </div>
        );
    }

    return (
        <div className="relative w-full mx-auto my-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-2xl overflow-hidden">
            <h2 className="text-4xl font-extrabold text-center text-blue-800 mb-8 tracking-tight">
                Notices  &  Announcements
            </h2>
            
            {notices.length === 0 ? (
                <div className="text-center bg-white p-16 rounded-xl shadow-lg border border-gray-200">
                    <FaExclamationTriangle className="mx-auto text-6xl text-yellow-500 mb-6" />
                    <p className="text-gray-700 text-xl font-medium">There are no active announcements at the moment.</p>
                    <p className="text-gray-500 text-md mt-2">Please check back later for updates.</p>
                </div>
            ) : (
                <>
                    <div className="relative flex items-center justify-center bg-white p-8 md:p-10 rounded-xl shadow-xl min-h-[300px] transition-all duration-700 ease-in-out border border-gray-100">
                        {/* Previous Button */}
                        <button
                            onClick={goToPrevious}
                            className="absolute left-4 p-3 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full text-gray-700 hover:text-blue-600 shadow-md transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 z-10"
                            aria-label="Previous Notice"
                        >
                            <FaChevronLeft className="text-2xl" />
                        </button>

                        {/* Current Notice Display */}
                        {currentNotice && (
                            <div key={currentNotice.id} className="text-center max-w-3xl mx-auto px-4 animate-fade-in-up">
                                <h3 className="text-3xl font-bold mb-4 text-gray-900 leading-tight">
                                    {currentNotice.title}
                                </h3>
                                <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                                    {currentNotice.description}
                                </p>
                                {currentNotice.imageUrl && (
                                    <img 
                                        src={currentNotice.imageUrl} 
                                        alt="Notice visual" 
                                        className="max-h-72 max-w-full object-contain mx-auto mb-6 rounded-lg shadow-md border border-gray-200" 
                                    />
                                )}
                                <div className="flex flex-wrap justify-center gap-4 mt-4">
                                    {currentNotice.pdfUrl && (
                                        <a 
                                            href={currentNotice.pdfUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300 transform hover:scale-105"
                                        >
                                            <FaFilePdf className="mr-2 text-xl" /> Download PDF
                                        </a>
                                    )}
                                    {currentNotice.attachedLink && (
                                        <a 
                                            href={currentNotice.attachedLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-300 transition-colors duration-300 transform hover:scale-105"
                                        >
                                            <FaExternalLinkAlt className="mr-2 text-lg" /> View Link
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Next Button */}
                        <button
                            onClick={goToNext}
                            className="absolute right-4 p-3 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full text-gray-700 hover:text-blue-600 shadow-md transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 z-10"
                            aria-label="Next Notice"
                        >
                            <FaChevronRight className="text-2xl" />
                        </button>
                    </div>

                    {/* Slider Dots/Indicators */}
                    <div className="flex justify-center mt-8 space-x-3">
                        {notices.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`h-3 w-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                    currentIndex === index ? 'bg-blue-600 w-5' : 'bg-gray-400 hover:bg-gray-500'
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                            ></button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default DisplayNotice;