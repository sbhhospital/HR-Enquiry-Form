import React, { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

const EnquiryForm = ({ indentItem = null, onClose, onSuccess }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    candidateName: '',
    candidateDOB: '',
    candidatePhone: '',
    candidateEmail: '',
    previousCompany: '',
    jobExperience: '',
    department: '',
    previousPosition: '',
    maritalStatus: '',
    candidatePhoto: null,
    candidateResume: null,
    presentAddress: '',
    aadharNo: '',
    status: 'NeedMore'
  });
  const [generatedCandidateNo, setGeneratedCandidateNo] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [enquiryData, setEnquiryData] = useState([]);
  const [indentData, setIndentData] = useState([]);

  // Google Drive folder ID for file uploads
  const GOOGLE_DRIVE_FOLDER_ID = '1UNUeS2GN0rLh3BB06DvGYXYbVmzkXCdZ';

  // Fetch existing data for number generation
  const fetchExistingData = async () => {
    try {
      // Fetch ENQUIRY data
      const enquiryResponse = await fetch(
        'https://script.google.com/macros/s/AKfycbxmXLxCqjFY9yRDLoYEjqU9LTcpfV7r9ueBuOsDsREkdGknbdE_CZBW7ZHTdP3n0NzOfQ/exec?sheet=ENQUIRY&action=fetch'
      );
      
      if (enquiryResponse.ok) {
        const enquiryResult = await enquiryResponse.json();
        if (enquiryResult.success && enquiryResult.data && enquiryResult.data.length > 0) {
          const headers = enquiryResult.data[5].map(h => h ? h.trim() : '');
          const enquiryRows = enquiryResult.data.slice(6);
          
          const getEnquiryIndex = (headerName) => headers.findIndex(h => h === headerName);
          
          const processedEnquiryData = enquiryRows
            .filter(row => row[getEnquiryIndex('Timestamp')])
            .map(row => ({
              candidateEnquiryNo: row[getEnquiryIndex('Candidate Enquiry Number')],
              indentNo: row[getEnquiryIndex('Indent Number')],
            }));
          
          setEnquiryData(processedEnquiryData);
        }
      }

      // Fetch INDENT data for AAP number generation and autofill
      const indentResponse = await fetch(
        'https://script.google.com/macros/s/AKfycbxmXLxCqjFY9yRDLoYEjqU9LTcpfV7r9ueBuOsDsREkdGknbdE_CZBW7ZHTdP3n0NzOfQ/exec?sheet=INDENT&action=fetch'
      );
      
      if (indentResponse.ok) {
        const indentResult = await indentResponse.json();
        if (indentResult.success && indentResult.data && indentResult.data.length >= 7) {
          const headers = indentResult.data[5].map(h => h.trim());
          const dataFromRow7 = indentResult.data.slice(6);
          
          const getIndex = (headerName) => headers.findIndex(h => h === headerName);
          
          const processedData = dataFromRow7
            .filter(row => row[getIndex('Timestamp')])
            .map(row => ({
              indentNo: row[getIndex('Indent Number')],
              post: row[getIndex('Post')] || '', // Column C
              department: row[getIndex('Department')] || '', // Column R
            }));
          
          setIndentData(processedData);
        }
      }
    } catch (error) {
      console.error('Error fetching existing data:', error);
    }
  };

  // Function to get indent details by indent number
  const getIndentDetails = (indentNo) => {
    return indentData.find(item => item.indentNo === indentNo);
  };

  const generateNextAAPIndentNumber = () => {
    const allIndentNumbers = [
      ...indentData.map(item => item.indentNo),
      ...enquiryData.map(item => item.indentNo)
    ].filter(Boolean);

    let maxAAPNumber = 0;
    
    allIndentNumbers.forEach(indentNo => {
      const match = indentNo.match(/^AAP-(\d+)$/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxAAPNumber) {
          maxAAPNumber = num;
        }
      }
    });

    const nextNumber = maxAAPNumber + 1;
    return `AAP-${String(nextNumber).padStart(2, '0')}`;
  };

  const generateCandidateNumber = () => {
    if (enquiryData.length === 0) {
      return 'ENQ-01';
    }
    
    const lastNumber = enquiryData.reduce((max, enquiry) => {
      if (!enquiry.candidateEnquiryNo) return max;
      
      const match = enquiry.candidateEnquiryNo.match(/ENQ-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    
    const nextNumber = lastNumber + 1;
    return `ENQ-${String(nextNumber).padStart(2, '0')}`;
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const uploadFileToGoogleDrive = async (file, type) => {
    try {
      const base64Data = await fileToBase64(file);
      
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbxmXLxCqjFY9yRDLoYEjqU9LTcpfV7r9ueBuOsDsREkdGknbdE_CZBW7ZHTdP3n0NzOfQ/exec',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            action: 'uploadFile',
            base64Data: base64Data,
            fileName: `${generatedCandidateNo}_${type}_${file.name}`,
            mimeType: file.type,
            folderId: GOOGLE_DRIVE_FOLDER_ID
          }),
        }
      );

      const result = await response.json();
      
      if (result.success) {
        return result.fileUrl;
      } else {
        throw new Error(result.error || 'File upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchExistingData();
  }, []);

  useEffect(() => {
    if (indentItem) {
      setSelectedItem(indentItem);
      
      // Get indent details from fetched data
      const indentDetails = getIndentDetails(indentItem.indentNo);
      
      setFormData(prev => ({
        ...prev,
        department: indentDetails?.department || indentItem.department || ''
      }));

      // Update selectedItem with post and department from fetched data
      if (indentDetails) {
        setSelectedItem(prev => ({
          ...prev,
          post: indentDetails.post || '',
          department: indentDetails.department || ''
        }));
      }
    } else {
      // Generate new AAP number for new enquiry
      const newAAPNumber = generateNextAAPIndentNumber();
      setSelectedItem({
        indentNo: newAAPNumber,
        post: '',
        gender: '',
        prefer: '',
        numberOfPost: '',
        competitionDate: '',
        socialSite: '',
        status: 'NeedMore',
        plannedDate: '',
        actual: '',
        experience: '',
        department: ''
      });
    }
    
    const candidateNo = generateCandidateNumber();
    setGeneratedCandidateNo(candidateNo);
  }, [indentItem, indentData, enquiryData]);

  const formatDOB = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear().toString().slice(-2);
    
    return `${day}-${month}-${year}`;
  };

  // Rest of the code remains the same...
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let photoUrl = '';
      let resumeUrl = '';

      // Upload photo if exists
      if (formData.candidatePhoto) {
        setUploadingPhoto(true);
        photoUrl = await uploadFileToGoogleDrive(formData.candidatePhoto, 'photo');
        setUploadingPhoto(false);
        toast.success('Photo uploaded successfully!');
      }

      // Upload resume if exists
      if (formData.candidateResume) {
        setUploadingResume(true);
        resumeUrl = await uploadFileToGoogleDrive(formData.candidateResume, 'resume');
        setUploadingResume(false);
        toast.success('Resume uploaded successfully!');
      }

      // Create timestamp in dd/mm/yyyy hh:mm:ss format
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      const formattedTimestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      const rowData = [
        formattedTimestamp,                           // Column A: Timestamp
        selectedItem.indentNo,                        // Column B: Indent Number
        generatedCandidateNo,                         // Column C: Candidate Enquiry Number
        selectedItem.post,                            // Column D: Applying For the Post
        formData.candidateName,                       // Column E: Candidate Name
        formatDOB(formData.candidateDOB),            // Column F: DCB (DOB)
        formData.candidatePhone,                      // Column G: Candidate Phone Number
        formData.candidateEmail,                      // Column H: Candidate Email
        formData.previousCompany || '',               // Column I: Previous Company Name
        formData.jobExperience || '',                 // Column J: Job Experience
        formData.department || '',                    // Column K: Department (FIXED)
        formData.previousPosition || '',              // Column L: Previous Position
        '',              // Column M: Reason For Leaving
        formData.maritalStatus || '',                 // Column N: Marital Status
        '',            // Column O: Last Employer Mobile
        photoUrl,                                     // Column P: Candidate Photo (URL)
        '',                   // Column Q: Reference By
        formData.presentAddress || '',                // Column R: Present Address
        formData.aadharNo || '',                      // Column S: Aadhar No
        resumeUrl,                                    // Column T: Candidate Resume (URL)
      ];

      console.log('Submitting to ENQUIRY sheet:', rowData);

      // Submit to ENQUIRY sheet
      const enquiryResponse = await fetch(
        'https://script.google.com/macros/s/AKfycbxmXLxCqjFY9yRDLoYEjqU9LTcpfV7r9ueBuOsDsREkdGknbdE_CZBW7ZHTdP3n0NzOfQ/exec',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            sheetName: 'ENQUIRY',
            action: 'insert',
            rowData: JSON.stringify(rowData)
          }),
        }
      );

      const enquiryResult = await enquiryResponse.json();
      console.log('ENQUIRY response:', enquiryResult);

      if (!enquiryResult.success) {
        throw new Error(enquiryResult.error || 'ENQUIRY submission failed');
      }

      // Only update INDENT sheet if status is Complete
      if (formData.status === 'Complete') {
        console.log('Updating INDENT sheet for status Complete');
        
        // Fetch INDENT data
        const indentFetchResponse = await fetch(
          'https://script.google.com/macros/s/AKfycbxmXLxCqjFY9yRDLoYEjqU9LTcpfV7r9ueBuOsDsREkdGknbdE_CZBW7ZHTdP3n0NzOfQ/exec?sheet=INDENT&action=fetch'
        );
        
        const indentData = await indentFetchResponse.json();
        console.log('INDENT data fetched:', indentData);

        if (!indentData.success) {
          throw new Error('Failed to fetch INDENT data: ' + (indentData.error || 'Unknown error'));
        }

        // Find the row index
        let rowIndex = -1;
        for (let i = 1; i < indentData.data.length; i++) {
          if (indentData.data[i][1] === selectedItem.indentNo) {
            rowIndex = i + 1;
            break;
          }
        }

        if (rowIndex === -1) {
          throw new Error(`Could not find indentNo: ${selectedItem.indentNo} in INDENT sheet`);
        }

        console.log('Found row index:', rowIndex);

        // Get headers
        const headers = indentData.data[5];
        console.log('Headers:', headers);

        // Find column indices
        const getColumnIndex = (columnName) => {
          return headers.findIndex(h => h && h.toString().trim() === columnName);
        };

        const statusIndex = getColumnIndex('Status');
        const actual2Index = getColumnIndex('Actual 2');

        console.log('Status column index:', statusIndex);
        console.log('Actual 2 column index:', actual2Index);

        // Update Status column
        if (statusIndex !== -1) {
          console.log('Updating Status column...');
          const statusResponse = await fetch(
            'https://script.google.com/macros/s/AKfycbxmXLxCqjFY9yRDLoYEjqU9LTcpfV7r9ueBuOsDsREkdGknbdE_CZBW7ZHTdP3n0NzOfQ/exec',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                sheetName: 'INDENT',
                action: 'updateCell',
                rowIndex: rowIndex.toString(),
                columnIndex: (statusIndex + 1).toString(),
                value: 'Complete'
              }),
            }
          );

          const statusResult = await statusResponse.json();
          console.log('Status update result:', statusResult);

          if (!statusResult.success) {
            console.error('Status update failed:', statusResult.error);
          }
        }

        // Update Actual 2 column
        if (actual2Index !== -1) {
          console.log('Updating Actual 2 column...');
          const actual2Response = await fetch(
            'https://script.google.com/macros/s/AKfycbxmXLxCqjFY9yRDLoYEjqU9LTcpfV7r9ueBuOsDsREkdGknbdE_CZBW7ZHTdP3n0NzOfQ/exec',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                sheetName: 'INDENT',
                action: 'updateCell',
                rowIndex: rowIndex.toString(),
                columnIndex: (actual2Index + 1).toString(),
                value: new Date().toISOString()
              }),
            }
          );

          const actual2Result = await actual2Response.json();
          console.log('Actual 2 update result:', actual2Result);

          if (!actual2Result.success) {
            console.error('Actual 2 update failed:', actual2Result.error);
          }
        }
        
        toast.success('Enquiry submitted and INDENT marked as Complete!');
      } else {
        toast.success('Enquiry submitted successfully!');
      }

      // Reset form data and refresh page
      setFormData({
        candidateName: '',
        candidateDOB: '',
        candidatePhone: '',
        candidateEmail: '',
        previousCompany: '',
        jobExperience: '',
        department: '',
        previousPosition: '',
        maritalStatus: '',
        candidatePhoto: null,
        candidateResume: null,
        presentAddress: '',
        aadharNo: '',
        status: 'NeedMore'
      });

      // Refresh the page after successful submission
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Submission error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
      setUploadingPhoto(false);
      setUploadingResume(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        [field]: file
      }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {indentItem ? 'Create Enquiry' : 'New Enquiry'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Indent No.
            </label>
            <input
              type="text"
              value={selectedItem?.indentNo || ''}
              disabled
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Candidate Enquiry No.
            </label>
            <input
              type="text"
              value={generatedCandidateNo}
              disabled
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Applying For Post
            </label>
            <input
              type="text"
              value={selectedItem?.post || ''}
              onChange={(e) => {
                setSelectedItem((prev) => ({
                  ...prev,
                  post: e.target.value,
                }));
              }}
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Department
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
            />
          </div>
          {/* Rest of the form fields remain the same */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Candidate Name*
            </label>
            <input
              type="text"
              name="candidateName"
              value={formData.candidateName}
              onChange={handleInputChange}
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Candidate DOB
            </label>
            <input
              type="date"
              name="candidateDOB"
              value={formData.candidateDOB}
              onChange={handleInputChange}
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Candidate Phone*
            </label>
            <input
              type="tel"
              name="candidatePhone"
              value={formData.candidatePhone}
              onChange={handleInputChange}
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Candidate Email
            </label>
            <input
              type="email"
              name="candidateEmail"
              value={formData.candidateEmail}
              onChange={handleInputChange}
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Previous Company
            </label>
            <input
              type="text"
              name="previousCompany"
              value={formData.previousCompany}
              onChange={handleInputChange}
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Job Experience
            </label>
            <input
              type="text"
              name="jobExperience"
              value={formData.jobExperience}
              onChange={handleInputChange}
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Previous Position
            </label>
            <input
              type="text"
              name="previousPosition"
              value={formData.previousPosition}
              onChange={handleInputChange}
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Marital Status
            </label>
            <select
              name="maritalStatus"
              value={formData.maritalStatus}
              onChange={handleInputChange}
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
            >
              <option value="">Select Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Aadhar No.*
            </label>
            <input
              type="text"
              name="aadharNo"
              value={formData.aadharNo}
              onChange={handleInputChange}
              className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">
            Current Address
          </label>
          <textarea
            name="presentAddress"
            value={formData.presentAddress}
            onChange={handleInputChange}
            rows={3}
            className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Candidate Photo
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => handleFileChange(e, "candidatePhoto")}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="flex items-center px-4 py-2 border border-gray-300 border-opacity-30 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700"
              >
                <Upload size={16} className="mr-2" />
                {uploadingPhoto ? "Uploading..." : "Upload File"}
              </label>
              {formData.candidatePhoto && !uploadingPhoto && (
                <span className="text-sm text-gray-600">
                  {formData.candidatePhoto.name}
                </span>
              )}
              {uploadingPhoto && (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-dashed rounded-full animate-spin mr-2"></div>
                  <span className="text-sm text-gray-600">
                    Uploading photo...
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Max 10MB. Supports: JPG, JPEG, PNG, PDF, DOC, DOCX
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Candidate Resume
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, "candidateResume")}
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className="flex items-center px-4 py-2 border border-gray-300 border-opacity-30 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700"
              >
                <Upload size={16} className="mr-2" />
                {uploadingResume ? "Uploading..." : "Upload File"}
              </label>
              {formData.candidateResume && !uploadingResume && (
                <span className="text-sm text-gray-600">
                  {formData.candidateResume.name}
                </span>
              )}
              {uploadingResume && (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-dashed rounded-full animate-spin mr-2"></div>
                  <span className="text-sm text-gray-600">
                    Uploading resume...
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Max 10MB. Supports: PDF, DOC, DOCX, JPG, JPEG, PNG
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 border-opacity-30 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={submitting || uploadingPhoto || uploadingResume}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-white bg-indigo-700 rounded-md hover:bg-indigo-800 flex items-center justify-center"
            disabled={submitting || uploadingPhoto || uploadingResume}
          >
            {submitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EnquiryForm;
