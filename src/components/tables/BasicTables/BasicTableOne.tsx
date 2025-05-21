import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { useState, useEffect } from "react";
import Badge from "../../ui/badge/Badge";
import Button from "../../ui/button/Button";
import { Modal } from "../../ui/modal";
import { useModal } from "../../../hooks/useModal";
import Input from "../../form/input/InputField";
import Label from "../../form/Label";
import Select from "../../form/Select";
import { signInWithEmailAndPassword, getAuth } from "firebase/auth";

// Import Firebase dependencies
import { db } from "../../../firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

interface Order {
  id: string;
  email: string;
  ParentsName: string;
  ChildsName: string;
  Glevel: string;
  ChildUID: string;
  isVerified: boolean;
  isMasked?: boolean; // Added for masking state
}

// Type for sorting options
type SortOption = "alphabetical" | "alphabeticalParent";

export default function BasicTableOne() {
  // State for storing Firebase data
  const [tableData, setTableData] = useState<Order[]>([]);
  const [filteredData, setFilteredData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]); // For bulk deletion
  const [isAllMasked, setIsAllMasked] = useState(true); // Default all data masked

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGradeLevel, setFilterGradeLevel] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");

  // Modal states
  const { isOpen: isEditModalOpen, openModal: openEditModal, closeModal: closeEditModal } = useModal();
  const { isOpen: isAuthModalOpen, openModal: openAuthModal, closeModal: closeAuthModal } = useModal();

  // Form state for editing
  const [editEmail, setEditEmail] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editChildName, setEditChildName] = useState("");
  const [editGradeLevel, setEditGradeLevel] = useState("");

  // Auth modal state
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false); // New state for edit loading
  const [authAction, setAuthAction] = useState<"unmask" | "mask" | "unmaskAll" | "maskAll" | "edit" | "delete" | "bulkDelete">("unmask");
  const [targetRowId, setTargetRowId] = useState<string | null>(null);

  const gradeOptions = [
    { value: "", label: "All Grades" },
    { value: "Nursery II", label: "Nursery II" },
    { value: "Kinder I", label: "Kinder I" },
  ];

  const sortOptions = [
    { value: "alphabetical", label: "A-Z (Child's Name)" },
    { value: "alphabeticalParent", label: "A-Z (Parent's Name)" },
  ];

  // Fetch data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const parentsCollection = collection(db, "parents");
        const parentsSnapshot = await getDocs(parentsCollection);
        
        const parentsData = parentsSnapshot.docs.map(doc => {
          const data = doc.data();
          const parentName = `${data.FirstName || ""} ${data.LastName || ""}`.trim();
          
          return {
            id: doc.id,
            email: data.Email || "",
            ParentsName: parentName,
            ChildsName: data.ChildName || "",
            Glevel: data.GradeLevel || "",
            ChildUID: data.ChildUID || "",
            isVerified: parentName !== "",
            isMasked: true, // Default to masked
          };
        });
        
        setTableData(parentsData);
        setFilteredData(parentsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters and search whenever dependencies change
  useEffect(() => {
    let result = [...tableData];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        item => 
          item.email.toLowerCase().includes(query) || 
          item.ChildsName.toLowerCase().includes(query) ||
          item.ParentsName.toLowerCase().includes(query)
      );
    }
    
    // Apply grade level filter
    if (filterGradeLevel) {
      result = result.filter(item => item.Glevel === filterGradeLevel);
    }
    
    // Apply sorting
    result = sortData(result, sortOption);
    
    setFilteredData(result);
  }, [searchQuery, filterGradeLevel, sortOption, tableData]);

  // Sort data based on selected option
  const sortData = (data: Order[], sortType: SortOption): Order[] => {
    const sortedData = [...data];
    
    switch (sortType) {
      case "alphabetical":
        return sortedData.sort((a, b) => 
          a.ChildsName.localeCompare(b.ChildsName)
        );
      case "alphabeticalParent":
        return sortedData.sort((a, b) => 
          a.ParentsName.localeCompare(b.ParentsName)
        );
      default:
        return sortedData;
    }
  };

  // Handle masking toggle for a single row
  const handleToggleMask = (id: string) => {
    const order = tableData.find(item => item.id === id);
    if (order) {
      setAuthAction(order.isMasked ? "unmask" : "mask"); // Use "mask" for individual masking
      setTargetRowId(id);
      openAuthModal();
    }
  };

  // Handle mask/unmask all
  const handleToggleAllMask = (mask: boolean) => {
    setAuthAction(mask ? "maskAll" : "unmaskAll");
    setTargetRowId(null);
    openAuthModal();
  };

  // Handle row selection for bulk deletion
  const handleRowSelect = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedRows.length === 0) {
      alert("Please select at least one account to delete.");
      return;
    }
    setAuthAction("bulkDelete");
    setTargetRowId(null);
    openAuthModal();
  };

  // Handle delete
  const handleDelete = (id: string) => {
    setAuthAction("delete");
    setTargetRowId(id);
    openAuthModal();
  };

  // Handle edit modal open
  const handleEditClick = (order: Order) => {
    setAuthAction("edit");
    setTargetRowId(order.id);
    setSelectedOrder(order);
    openAuthModal();
  };

  // Verify admin password
  const verifyAdminPassword = async () => {
    setAuthError("");
    setAuthLoading(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("No user is currently logged in.");
      }

      await signInWithEmailAndPassword(auth, user.email, authPassword);
      return true;
    } catch (error) {
      console.error("Authentication error:", error);
      setAuthError("Invalid password. Please try again.");
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  // Function to get the loading message based on the authAction
  const getLoadingMessage = () => {
    switch (authAction) {
      case "unmask":
        return "Unmasking in progress";
      case "mask":
        return "Masking in progress";
      case "unmaskAll":
        return "Unmasking all in progress";
      case "maskAll":
        return "Masking all in progress";
      case "delete":
        return "Deleting in progress";
      case "bulkDelete":
        return "Bulk deleting in progress";
      case "edit":
        return "Preparing edit in progress";
      default:
        return "Verifying...";
    }
  };

  // Handle auth modal submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await verifyAdminPassword();
    if (!isValid) return;

    setAuthLoading(true); // Keep loading active during the action

    try {
      if (authAction === "unmask" && targetRowId) {
        setTableData(prev =>
          prev.map(item =>
            item.id === targetRowId ? { ...item, isMasked: false } : item
          )
        );
        alert("Account unmasked successfully.");
      } else if (authAction === "mask" && targetRowId) {
        setTableData(prev =>
          prev.map(item =>
            item.id === targetRowId ? { ...item, isMasked: true } : item
          )
        );
        alert("Account masked successfully.");
      } else if (authAction === "unmaskAll") {
        setTableData(prev => prev.map(item => ({ ...item, isMasked: false })));
        setIsAllMasked(false);
        alert("All accounts unmasked successfully.");
      } else if (authAction === "maskAll") {
        setTableData(prev => prev.map(item => ({ ...item, isMasked: true })));
        setIsAllMasked(true);
        alert("All accounts masked successfully.");
      } else if (authAction === "delete" && targetRowId) {
        const docRef = doc(db, "parents", targetRowId);
        await deleteDoc(docRef);
        setTableData(prevData => prevData.filter(item => item.id !== targetRowId));
        alert("Account deleted successfully.");
      } else if (authAction === "bulkDelete") {
        for (const id of selectedRows) {
          const docRef = doc(db, "parents", id);
          await deleteDoc(docRef);
        }
        setTableData(prevData => prevData.filter(item => !selectedRows.includes(item.id)));
        setSelectedRows([]);
        alert("Selected accounts deleted successfully.");
      } else if (authAction === "edit" && selectedOrder) {
        setEditEmail(selectedOrder.email);
        setEditParentName(selectedOrder.ParentsName);
        setEditChildName(selectedOrder.ChildsName);
        setEditGradeLevel(selectedOrder.Glevel);
        openEditModal();
        alert("Proceeding to edit account.");
      }
    } catch (error) {
      console.error(`Error during ${authAction}:`, error);
      alert(`Failed to ${authAction.replace(/([A-Z])/g, ' $1').toLowerCase()} record. Please try again.`);
    } finally {
      setAuthLoading(false); // Reset loading only after alert
      closeAuthModal(); // Automatically close modal after action
      setAuthPassword("");
    }
  };

  // Handle save changes for edit
  const handleSave = async () => {
    if (!selectedOrder) return;
    
    setEditLoading(true); // Set loading state for edit
    try {
      const docRef = doc(db, "parents", selectedOrder.id);
      
      const nameParts = editParentName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      await updateDoc(docRef, {
        Email: editEmail,
        FirstName: firstName,
        LastName: lastName,
        ChildName: editChildName,
        GradeLevel: editGradeLevel
      });

      if (selectedOrder.ChildUID) {
        const studentDocRef = doc(db, "students", selectedOrder.ChildUID);
        const studentDoc = await getDoc(studentDocRef);
        
        if (studentDoc.exists()) {
          await updateDoc(studentDocRef, {
            GradeLevel: editGradeLevel
          });
        } else {
          console.warn("Student document not found for ChildUID:", selectedOrder.ChildUID);
        }
      }

      const updatedOrder = {
        ...selectedOrder,
        email: editEmail,
        ParentsName: editParentName,
        ChildsName: editChildName,
        Glevel: editGradeLevel,
        isVerified: editParentName !== ""
      };
      
      setTableData(prevData => 
        prevData.map(item => 
          item.id === selectedOrder.id ? updatedOrder : item
        )
      );
      
      alert("Account updated successfully.");
      closeEditModal();
    } catch (error) {
      console.error("Error updating document:", error);
      alert("Failed to update record. Please try again.");
    } finally {
      setEditLoading(false); // Reset loading state
    }
  };

  const handleSelectChange = (value: string) => {
    setEditGradeLevel(value);
  };

  const sortedByVerification = [...filteredData].sort((a, b) => {
    if (a.isVerified === b.isVerified) return 0;
    return a.isVerified ? -1 : 1;
  });

  const verifiedData = filteredData.filter(item => item.isVerified);
  const unverifiedData = filteredData.filter(item => !item.isVerified);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-5 border-b border-gray-100 dark:border-white/[0.05]">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="w-full md:w-1/3">
            <Input
              type="text"
              placeholder="Search by email, child, or parent name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Select
                options={gradeOptions}
                placeholder="Filter by Grade"
                onChange={(value) => setFilterGradeLevel(value)}
                className="dark:bg-dark-900"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={sortOptions}
                placeholder="Sort by"
                onChange={(value) => setSortOption(value as SortOption)}
                className="dark:bg-dark-900"
                defaultValue="alphabetical"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleAllMask(true)}
                disabled={isAllMasked}
              >
                Mask All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleAllMask(false)}
                disabled={!isAllMasked}
              >
                Unmask All
              </Button>
              <Button
                size="sm"
                variant="delete"
                onClick={handleBulkDelete}
                disabled={selectedRows.length === 0}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1200px]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
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
                  Parent's Name
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
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Actions
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      setSelectedRows(
                        e.target.checked ? filteredData.map(item => item.id) : []
                      )
                    }
                    checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                  />
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell className="col-span-7 px-5 py-4 text-center">
                    <div className="px-5 py-4 text-center dark:text-white/90">Loading data...</div>
                  </TableCell>
                </TableRow>
              ) : sortedByVerification.length === 0 ? (
                <TableRow>
                  <TableCell className="col-span-7 px-5 py-4 text-center">
                    <div className="px-5 py-4 text-center dark:text-white/90">No records found</div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {unverifiedData.length > 0 && verifiedData.length > 0 && (
                    <TableRow className="bg-gray-50 dark:bg-gray-800/30">
                      <TableCell className="col-span-7 px-5 py-2 text-sm font-medium text-gray-700 dark:text-white/90">
                        Verified Accounts ({verifiedData.length})
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {verifiedData.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {order.isMasked ? "••••••••" : order.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                        {order.isMasked ? "••••••••" : order.ParentsName}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                        <div className="flex -space-x-2">
                          {order.isMasked ? "••••••••" : order.ChildsName}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                        <Badge
                          size="sm"
                          color={
                            order.Glevel === "Nursery II"
                              ? "nurseryII"
                              : order.Glevel === "Kinder I"
                              ? "kinderI"
                              : "error"
                          }
                        >
                          {order.Glevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                        <Badge size="sm" color="success">
                          Verified
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex space-x-2">
                          <Button
                            size="md"
                            variant="outline"
                            onClick={() => handleToggleMask(order.id)}
                          >
                            {order.isMasked ? (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="size-4">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="size-4">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                              </svg>
                            )}
                          </Button>
                          <Button
                            size="md"
                            variant="edit"
                            onClick={() => handleEditClick(order)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                          </Button>
                          <Button
                            size="md"
                            variant="delete"
                            onClick={() => handleDelete(order.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 ">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(order.id)}
                          onChange={() => handleRowSelect(order.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {unverifiedData.length > 0 && (
                    <TableRow className="bg-gray-50 dark:bg-gray-800/30">
                      <TableCell className="col-span-7 px-5 py-2 text-sm font-medium text-gray-700 dark:text-white/90">
                        Unverified Accounts ({unverifiedData.length})
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {unverifiedData.map((order) => (
                    <TableRow key={order.id} className="bg-gray-50/30 dark:bg-gray-800/10">
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {order.isMasked ? "••••••••" : order.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 italic text-start text-theme-sm dark:text-gray-400">
                        {order.isMasked ? "••••••••" : "Not provided"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                        <div className="flex -space-x-2">
                          {order.isMasked ? "••••••••" : order.ChildsName}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                        <Badge
                          size="sm"
                          color={
                            order.Glevel === "Nursery II"
                              ? "nurseryII"
                              : order.Glevel === "Kinder I"
                              ? "kinderI"
                              : "error"
                          }
                        >
                          {order.Glevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                        <Badge size="sm" color="error">
                          Unverified
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[50px] px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex space-x-2">
                          <Button
                            size="md"
                            variant="outline"
                            onClick={() => handleToggleMask(order.id)}
                          >
                            {order.isMasked ? (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="size-4">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="size-4">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                              </svg>
                            )}
                          </Button>
                          <Button
                            size="md"
                            variant="edit"
                            onClick={() => handleEditClick(order)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                          </Button>
                          <Button
                            size="md"
                            variant="delete"
                            onClick={() => handleDelete(order.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 w-[50px]">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(order.id)}
                          onChange={() => handleRowSelect(order.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </div>
        {/* Edit Modal */}
        <Modal isOpen={isEditModalOpen} onClose={closeEditModal} className="max-w-[700px] m-4">
          <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
            <div className="px-2 pr-14">
              <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                Edit Personal Information
              </h4>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                Update parents account details to keep their profile up-to-date.
              </p>
            </div>
            <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="custom-scrollbar h-[270px] overflow-y-auto px-2 pb-3">
                <div className="mt-7">
                  <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                    Personal Information
                  </h5>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                    <div className="col-span-2 lg:col-span-1">
                      <Label>Email Address</Label>
                      <Input 
                        type="text" 
                        value={editEmail} 
                        onChange={(e) => setEditEmail(e.target.value)} 
                      />
                    </div>
                    <div className="col-span-2 lg:col-span-1">
                      <Label>Parents Name</Label>
                      <Input 
                        type="text" 
                        value={editParentName} 
                        onChange={(e) => setEditParentName(e.target.value)} 
                      />
                    </div>
                    <div className="col-span-2 lg:col-span-1">
                      <Label>Child Name</Label>
                      <Input 
                        type="text" 
                        value={editChildName} 
                        onChange={(e) => setEditChildName(e.target.value)} 
                      />
                    </div>
                    <div>
                      <Label>Grade Level</Label>
                      <Select
                        options={[
                          { value: "Nursery II", label: "Nursery II" },
                          { value: "Kinder I", label: "Kinder I" },
                        ]}
                        placeholder="Select Grade level"
                        onChange={handleSelectChange}
                        className="dark:bg-dark-900"
                        defaultValue={editGradeLevel} 
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                <Button size="sm" variant="outline" onClick={closeEditModal} type="button">
                  Close
                </Button>
                <Button size="sm" type="submit" disabled={editLoading}>
                  {editLoading ? "Editing in progress" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
        {/* Authentication Modal */}
        <Modal isOpen={isAuthModalOpen} onClose={closeAuthModal} className="max-w-[500px] m-4">
          <div className="relative w-full max-w-[500px] rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8">
            <h4 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
              Verify Admin Password
            </h4>
            <form onSubmit={handleAuthSubmit}>
              <div className="space-y-4">
                <div>
                  <Label>Admin Password <span className="text-error-500">*</span></Label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAuthSubmit(e);
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-md dark:bg-dark-900 dark:text-black/90"
                    />
                  </div>
                  {authError && (
                    <div className="text-sm text-error-500 dark:text-red-400">
                      {authError}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 justify-end">
                  <Button size="sm" variant="outline" onClick={closeAuthModal} type="button">
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" disabled={authLoading}>
                    {authLoading ? getLoadingMessage() : "Verify"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </div>
  );
}