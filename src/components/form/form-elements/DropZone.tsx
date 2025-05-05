import React, { useState } from "react";
import Papa, { ParseResult } from "papaparse";
import ComponentCard from "../../common/ComponentCard";
import { useDropzone } from "react-dropzone";
import { Modal } from "../../ui/modal";
import { useModal } from "../../../hooks/useModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import Button from "../../ui/button/Button";
import Alert from "../../ui/alert/Alert";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase"; // adjust path as needed

interface CsvRow {
  email: string;
  childName: string;
  gradeLevel: string;
  isEditing: boolean;
[key: string]: string | boolean;
}

interface AlertInfo {
  type: "success" | "error" | "warning" | "info";
  message: string;
  show: boolean;
}

const DropzoneComponent: React.FC = () => {
  const [, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const { isOpen, openModal, closeModal } = useModal();
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationResults, setRegistrationResults] = useState<{
    success: number;
    failures: number;
    total: number;
  }>({ success: 0, failures: 0, total: 0 });

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);

      Papa.parse<CsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<CsvRow>) => {
          // Initialize all rows as non-editing
          const initialData = results.data.map(row => ({
            ...row,
            isEditing: false
          }));
          setCsvData(initialData);
          openModal();
        },
      });
    }
  };

  const validateEmail = (value: string) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
  };

  const updateRow = (index: number, field: keyof CsvRow, value: string) => {
    const updated = [...csvData];
    // Use a proper type assertion to the specific field type
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setCsvData(updated);
  };

  const toggleEditMode = (index: number) => {
    const updated = [...csvData];
    
    // If currently editing, validate email before saving
    if (updated[index].isEditing) {
      if (!validateEmail(updated[index].email)) {
        setAlertInfo({
          type: "error",
          message: "Invalid email format for row " + (index + 1),
          show: true
        });
        return;
      }
    }
    
    updated[index].isEditing = !updated[index].isEditing;
    setCsvData(updated);
  };

  const confirmDelete = (index: number) => {
    setDeleteConfirmIndex(index);
  };

  const cancelDelete = () => {
    setDeleteConfirmIndex(null);
  };

  const deleteRow = (index: number) => {
    const updated = [...csvData];
    updated.splice(index, 1);
    setCsvData(updated);
    setDeleteConfirmIndex(null);
  };

  const registerSingleParent = async (parent: CsvRow) => {
    try {
      // Check if fields are valid
      if (!parent.email || !parent.childName || !parent.gradeLevel) {
        return { success: false, message: "Missing required fields" };
      }

      // Validate email format
      if (!validateEmail(parent.email)) {
        return { success: false, message: "Invalid email format" };
      }

      // Check if parent already exists
      const parentRef = doc(db, "parents", parent.email.toLowerCase());
      const snapshot = await getDoc(parentRef);

      if (snapshot.exists()) {
        return { success: false, message: "Email already registered" };
      }

      // Add new parent
      await setDoc(parentRef, {
        Role: "Parent",
        Email: parent.email,
        ChildName: parent.childName,
        GradeLevel: parent.gradeLevel,
        ChildUID: "",
      });
      
      return { success: true };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  };

  const handleBulkRegister = async () => {
    if (csvData.length === 0) {
      setAlertInfo({
        type: "warning",
        message: "No data to register",
        show: true
      });
      return;
    }

    // Basic validation before starting
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      if (!row.email || !row.childName || !row.gradeLevel) {
        setAlertInfo({
          type: "error",
          message: `Row ${i + 1} has missing required fields`,
          show: true
        });
        return;
      }
      
      if (!validateEmail(row.email)) {
        setAlertInfo({
          type: "error",
          message: `Row ${i + 1} has an invalid email format`,
          show: true
        });
        return;
      }
    }

    setIsProcessing(true);
    setAlertInfo({
      type: "info",
      message: "Processing registrations...",
      show: true
    });

    let successCount = 0;
    let failureCount = 0;

    // Process each row sequentially
    for (const row of csvData) {
      const result = await registerSingleParent(row);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    setRegistrationResults({
      success: successCount,
      failures: failureCount,
      total: csvData.length
    });

    setIsProcessing(false);
    setAlertInfo({
      type: successCount > 0 ? "success" : "error",
      message: `Registration complete: ${successCount} successful, ${failureCount} failed out of ${csvData.length} total`,
      show: true
    });

    // If all successful, close modal after a delay
    if (successCount === csvData.length) {
      setTimeout(() => {
        closeModal();
        setCsvData([]);
      }, 3000);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  // Hide alert after 5 seconds
  React.useEffect(() => {
    if (alertInfo?.show) {
      const timer = setTimeout(() => {
        setAlertInfo(prev => prev ? { ...prev, show: false } : null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [alertInfo]);

  return (
    <ComponentCard title="Bulk Registration">
      <div className="transition border border-gray-300 border-dashed cursor-pointer dark:hover:border-brand-500 dark:border-gray-700 rounded-xl hover:border-brand-500">
        <form
          {...getRootProps()}
          className={`dropzone rounded-xl border-dashed border-gray-300 p-7 lg:p-10
          ${
            isDragActive
              ? "border-brand-500 bg-gray-100 dark:bg-gray-800"
              : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
          }`}
        >
          <input {...getInputProps()} />

          <div className="dz-message flex flex-col items-center !m-0">
            <div className="mb-[22px] flex justify-center">
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <svg
                  className="fill-current"
                  width="29"
                  height="28"
                  viewBox="0 0 29 28"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.5733 10.5925C8.8661 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82463 20.4256 9.53184L15.0838 4.19378C14.9463 4.02488 14.7367 3.91699 14.5019 3.91699ZM5.91626 18.667C5.91626 18.2528 5.58047 17.917 5.16626 17.917C4.75205 17.917 4.41626 18.2528 4.41626 18.667V21.8337C4.41626 23.0763 5.42362 24.0837 6.66626 24.0837H22.3339C23.5766 24.0837 24.5839 23.0763 24.5839 21.8337V18.667C24.5839 18.2528 24.2482 17.917 23.8339 17.917C23.4197 17.917 23.0839 18.2528 23.0839 18.667V21.8337C23.0839 22.2479 22.7482 22.5837 22.3339 22.5837H6.66626C6.25205 22.5837 5.91626 22.2479 5.91626 21.8337V18.667Z"
                  />
                </svg>
              </div>
            </div>

            <h4 className="mb-3 font-semibold text-gray-800 text-theme-xl dark:text-white/90">
              {isDragActive ? "Drop CSV File Here" : "Drag & Drop CSV File Here"}
            </h4>

            <span className="text-center mb-5 block w-full max-w-[290px] text-sm text-gray-700 dark:text-gray-400">
              Only <strong>.csv</strong> files are accepted
            </span>

            <span className="font-medium underline text-theme-sm text-brand-500">
              Browse File
            </span>
          </div>
        </form>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="w-full max-w-[75vw] m-4">
        <div className="relative w-full max-h-[80vh] overflow-hidden rounded-3xl bg-white dark:bg-gray-900 flex flex-col">
          {/* Sticky Header - Fixed at the top */}
          <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 p-4 lg:p-6 border-b border-gray-200 dark:border-white/10 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
                  Review Parent's Bulk Registration Details
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Ensure the accuracy of all submitted details before processing.
                </p>
              </div>
            </div>

            {/* Alert Display */}
            {alertInfo?.show && (
              <div className="mt-4 transition-all duration-300 ease-in-out">
                <Alert
                  variant={alertInfo.type}
                  title={alertInfo.type.charAt(0).toUpperCase() + alertInfo.type.slice(1)}
                  message={alertInfo.message}
                  showLink={false}
                />
              </div>
            )}
          </div>

          {/* Scrollable Content Area */}
          <div className="overflow-y-auto flex-1 p-4 lg:p-8 no-scrollbar">
            <div className="overflow-x-auto">
              <Table>
                {/* Sticky Table Header */}
                <TableHeader className="sticky top-0 z-20 bg-white dark:bg-gray-900 shadow-sm">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Email Address
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Child's Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Grade Level
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                {/* Table Body */}
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {csvData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          <div className="w-full">
                            {row.isEditing ? (
                              <input
                                type="text"
                                value={row.email}
                                onChange={(e) => updateRow(index, "email", e.target.value)}
                                className="w-full p-1 border rounded outline-none border-gray-300 dark:text-white/90 dark:border-gray-700 bg-transparent"
                              />
                            ) : (
                              <span className="w-full p-1   border-gray-300 dark:text-white/90 dark:border-gray-700 bg-transparent">
                                {row.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                        {row.isEditing ? (
                          <input
                            type="text"
                            value={row.childName}
                            onChange={(e) => updateRow(index, "childName", e.target.value)}
                            className="w-full p-1 border rounded outline-none border-gray-300 dark:border-gray-700 bg-transparent"
                          />
                        ) : (
                          <span className="w-full p-1 outline-none border-gray-300 dark:border-gray-700 bg-transparent">{row.childName}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                        {row.isEditing ? (
                          <input
                            type="text"
                            value={row.gradeLevel}
                            onChange={(e) => updateRow(index, "gradeLevel", e.target.value)}
                            className="w-full p-1 border rounded outline-none border-gray-300 dark:border-gray-700 bg-transparent"
                          />
                        ) : (
                          <span  className="w-full p-1  outline-none border-gray-300 dark:border-gray-700 bg-transparent">{row.gradeLevel}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex space-x-2">
                          {deleteConfirmIndex === index ? (
                            <>
                              <Button
                                size="sm"
                                variant="delete"
                                onClick={() => deleteRow(index)}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={cancelDelete}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="md"
                                variant="delete"
                                onClick={() => confirmDelete(index)}
                                disabled={row.isEditing}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                              </Button>
                              <Button
                                size="md"
                                variant={row.isEditing ? "primary" : "primary"}
                                onClick={() => toggleEditMode(index)}
                              >
                                {row.isEditing ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                  </svg>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Sticky Footer for action buttons */}
          <div className="sticky bottom-0 z-30 bg-white dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-white/10 flex justify-between items-center">
            <div>
              {registrationResults.total > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Processed: {registrationResults.success} success, {registrationResults.failures} failed
                </span>
              )}
            </div>
            <div>
              <Button
                size="md"
                variant="primary"
                onClick={handleBulkRegister}
                disabled={isProcessing || csvData.length === 0}
              >
                {isProcessing ? "Processing..." : "Register All"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </ComponentCard>
  );
};

export default DropzoneComponent;