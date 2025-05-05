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

// Import Firebase dependencies
import { db } from "../../../firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc
} from "firebase/firestore";

interface Order {
  id: string;
  email: string;
  ParentsName: string;
  ChildsName: string;
  Glevel: string;
}

export default function BasicTableOne() {
  // State for storing Firebase data
  const [tableData, setTableData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Modal state
  const { isOpen, openModal, closeModal } = useModal();
  
  // Form state for editing
  const [editEmail, setEditEmail] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editChildName, setEditChildName] = useState("");
  const [editGradeLevel, setEditGradeLevel] = useState("");

  const options = [
    { value: "Nursery I", label: "Nursery I" },
    { value: "Nursery II", label: "Nursery II" },
  ];

  // Fetch data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const parentsCollection = collection(db, "parents");
        const parentsSnapshot = await getDocs(parentsCollection);
        
        const parentsData = parentsSnapshot.docs.map(doc => ({
          id: doc.id,
          email: doc.data().Email || "",
          ParentsName: `${doc.data().FirstName || ""} ${doc.data().LastName || ""}`.trim(),
          ChildsName: doc.data().ChildName || "",
          Glevel: doc.data().GradeLevel || "",
        }));
        
        setTableData(parentsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle delete
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this record?")) {
      try {
        const docRef = doc(db, "parents", id);
        await deleteDoc(docRef);
        
        // Update UI after successful delete
        setTableData(prevData => prevData.filter(item => item.id !== id));
      } catch (error) {
        console.error("Error deleting document:", error);
        alert("Failed to delete record. Please try again.");
      }
    }
  };

  // Handle edit modal open
  const handleEditClick = (order: Order) => {
    setSelectedOrder(order);
    setEditEmail(order.email);
    setEditParentName(order.ParentsName);
    setEditChildName(order.ChildsName);
    setEditGradeLevel(order.Glevel);
    openModal();
  };

  // Handle save changes
  const handleSave = async () => {
    if (!selectedOrder) return;
    
    try {
      const docRef = doc(db, "parents", selectedOrder.id);
      
      // Split parent name into first and last name
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

      // Update UI after successful update
      setTableData(prevData => 
        prevData.map(item => 
          item.id === selectedOrder.id 
            ? {
                ...item, 
                email: editEmail,
                ParentsName: editParentName,
                ChildsName: editChildName,
                Glevel: editGradeLevel
              } 
            : item
        )
      );
      
      closeModal();
    } catch (error) {
      console.error("Error updating document:", error);
      alert("Failed to update record. Please try again.");
    }
  };

  const handleSelectChange = (value: string) => {
    setEditGradeLevel(value);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1102px]">
          <Table>
            {/* Table Header */}
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
                  Edit/Delete
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {loading ? (
              <TableRow>
                <TableCell className="px-5 py-4 text-center">
                    <div className="col-span-5 px-5 py-4 text-center">Loading data...</div>
                  </TableCell>
                </TableRow>
                ) : tableData.length === 0 ? (
                  <TableRow>
                    <TableCell className="px-5 py-4 text-center">
                      <div className="col-span-5 px-5 py-4 text-center">No records found</div>
                    </TableCell>
                  </TableRow>
                ) : (
                tableData.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {order.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                      {order.ParentsName}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                      <div className="flex -space-x-2">
                        {order.ChildsName}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                      <Badge
                        size="sm"
                        color={
                          order.Glevel === "Nursery I"
                            ? "success"
                            : order.Glevel === "Nursery II"
                            ? "warning"
                            : "error"
                        }
                      >
                        {order.Glevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex space-x-2">
                        <Button
                          size="md"
                          variant="delete"
                          onClick={() => handleDelete(order.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
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
                        options={options}
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
                <Button size="sm" variant="outline" onClick={closeModal} type="button">
                  Close
                </Button>
                <Button size="sm" type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </div>
  );
}