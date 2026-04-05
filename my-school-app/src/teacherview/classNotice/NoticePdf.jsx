import React, { useState, useRef } from "react";
import ImageKit from "imagekit-javascript";
import axios from 'axios';

// Ensure these environment variables are correctly loaded in your Vite project
const imagekit = new ImageKit({
  publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY,
  urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT,
  // If you decide to go back to automatic authentication, uncomment the line below
  // authenticationEndpoint: "http://localhost:5001/auth",
});

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export default function NoticePdf({ onPdfUploadSuccess, onPdfUploadError }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState(""); // State to display the selected file name
  const [isDragOver, setIsDragOver] = useState(false); // State for drag-over visual feedback
  const fileRef = useRef(null);

  const handleFileChange = async (e) => {
    // Determine if the file comes from a drag-drop event or a traditional input change
    const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    const file = files?.[0];

    console.log("Selected file:", file);
    if (!file) {
      console.log("No file selected.");
      setSelectedFileName(""); // Clear file name if no file is selected
      return;
    }

    // Basic file type validation for safety, though 'accept' helps
    if (file.type !== "application/pdf") {
      setError("Please select a PDF file.");
      setSelectedFileName(""); // Clear selected file name on type error
      return;
    }

    setSelectedFileName(file.name); // Display the name of the selected file
    setUploading(true);
    setError(null); // Clear previous errors

    try {
      // Manually fetch authentication parameters from your backend
      console.log("Attempting to FETCH authentication parameters from backend for PDF...");
      const authResponse = await axios.get("http://localhost:5001/auth");
      const { token, signature, expire } = authResponse.data;

      if (!token || !signature || !expire) {
        throw new Error("Backend did not return complete authentication parameters (token, signature, or expire are missing).");
      }
      console.log("Authentication parameters FETCHED successfully for PDF:", { token, signature, expire });

      const res = await imagekit.upload({
        file,
        fileName: file.name,
        tags: ["notice-pdf"], // You can use a different tag for PDFs
        token: token,
        signature: signature,
        expire: expire,
      });

      console.log("PDF Upload success:", res);
      onPdfUploadSuccess?.(res.url || res.filePath || res);
      setSelectedFileName(""); // Clear file name on successful upload
    } catch (err) {
      console.error("Error during PDF upload:", err);
      // Provide a more user-friendly error
      if (err.response) {
        setError(`Failed to fetch auth: ${err.response.status} ${err.response.statusText}`);
      } else if (err.request) {
        setError("Network Error: Could not reach auth server or ImageKit.");
      } else {
        setError(err.message || "PDF upload failed.");
      }
      onPdfUploadError?.(err);
    } finally {
      setUploading(false);
      // Important: Reset the input value so the same file can be selected again if needed
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault(); // Prevent default to allow drop
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleFileChange(e); // Pass the event to the file handler
  };

  return (
    <div
      // Conditional styling based on upload state, error state, and drag-over state
      className={`
        relative
        flex flex-col items-center justify-center
        p-6 sm:p-8 md:p-10          // Responsive padding
        border-2 border-dashed
        rounded-lg                   // Rounded corners
        text-center
        transition-all duration-300 ease-in-out // Smooth transitions for hover/drag
        min-h-[180px]                // Ensures a minimum height for the drop zone
        w-full max-w-md mx-auto      // Centers the component and limits its width
        mb-6                         // Added some margin-bottom for spacing

        ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} // Error state styles
        ${isDragOver && !uploading ? 'border-purple-500 bg-purple-50' : ''}    // Drag-over specific styles (purple for PDF)
        ${!isDragOver && !error ? 'hover:border-purple-400 hover:bg-purple-50' : ''} // Hover styles
        ${uploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} // Cursor feedback
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      // Clicking anywhere on the container triggers the file input, unless uploading
      onClick={() => !uploading && fileRef.current.click()}
    >
      <input
        type="file"
        ref={fileRef}
        onChange={handleFileChange}
        accept="application/pdf" // ONLY accept PDF files here
        className="hidden" // Visually hides the default file input
      />

      {uploading ? (
        // Uploading State: Shows a spinner and text
        <div className="flex flex-col items-center text-purple-600">
          {/* SVG Spinner Icon */}
          <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-lg font-medium">Uploading PDF...</p>
          <p className="text-sm text-gray-500">Please wait while your PDF is being uploaded.</p>
        </div>
      ) : (
        // Default State: Shows upload icon, drag/drop text, and a "Select File" button
        <>
          {/* SVG PDF Icon (simplified, you can find a more detailed one if preferred) */}
          <svg className="w-12 h-12 text-gray-400 mb-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zm-2 16H8v-2h4zm0-4H8v-2h4zm3-4H9V8h6z" />
          </svg>
          <p className="mb-2 text-sm text-gray-600">
            <span className="font-semibold">Drag and drop</span> your PDF here, or
          </p>
          <button
            type="button"
            className="
              inline-flex items-center px-4 py-2
              border border-transparent rounded-md shadow-sm
              text-sm font-medium text-white
              bg-purple-600 hover:bg-purple-700 // Changed to purple for PDF
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
              transition-colors duration-200
            "
            // Stop propagation to prevent the parent div's onClick from firing twice
            onClick={(e) => { e.stopPropagation(); fileRef.current.click(); }}
            disabled={uploading}
          >
            Select PDF File
          </button>
          {selectedFileName && (
            // Display selected file name before upload
            <p className="mt-2 text-sm text-gray-500">Selected: <span className="font-medium text-gray-700">{selectedFileName}</span></p>
          )}
        </>
      )}

      {error && (
        // Error Message: Displays a clear error message with an icon
        <p className="mt-4 text-sm font-medium text-red-600 flex items-center">
          {/* Error Icon */}
          <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}