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

import { db } from "../../../firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc 
} from "firebase/firestore";

interface Teacher {
  id: string;
  email: string;
  teacherName: string;
  subject: string;
  gradeLevel: string;
}

type SortOption = "alphabetical";

export default function BasicTableTeacher() {
  const [tableData, setTableData] = useState<Teacher[]>([]);
  const [filteredData, setFilteredData] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGradeLevel, setFilterGradeLevel] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");

  const { isOpen, openModal, closeModal } = useModal();

  const [editEmail, setEditEmail] = useState("");
  const [editTeacherName, setEditTeacherName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editGradeLevel, setEditGradeLevel] = useState("");

  const gradeOptions = [
    { value: "", label: "All Grades" },
    { value: "Nursery I", label: "Nursery I" },
    { value: "Nursery II", label: "Nursery II" },
  ];

  const subjectOptions = [
    { value: "", label: "All Subjects" },
    { value: "Math", label: "Math" },
    { value: "English", label: "English" },
    { value: "Filipino", label: "Filipino" },
    { value: "Phonics", label: "Phonics" },
    // Add more subjects as needed based on your data
  ];

  const sortOptions = [
    { value: "alphabetical", label: "A-Z (Teacher's Name)" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teachersCollection = collection(db, "teachers");
        const teachersSnapshot = await getDocs(teachersCollection);
        const excludedEmails = ["admin@gmail.com", "admin2@gmail.com"];
        const teachersData = teachersSnapshot.docs
          .map(doc => ({
            id: doc.id,
            email: doc.data().Email || "",
            teacherName: doc.data().Name || "",
            subject: doc.data().Subject || "",
            gradeLevel: doc.data().GradeLevel || "",
          }))
          .filter(teacher => !excludedEmails.includes(teacher.email));
        setTableData(teachersData);
        setFilteredData(teachersData);
      } catch (error) {
        console.error("Error fetching teachers:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  useEffect(() => {
    let result = [...tableData];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        item => 
          item.email.toLowerCase().includes(query) || 
          item.teacherName.toLowerCase().includes(query) ||
          item.subject.toLowerCase().includes(query)
      );
    }
    
    // Apply grade level filter
    if (filterGradeLevel) {
      result = result.filter(item => item.gradeLevel === filterGradeLevel);
    }
    
    // Apply subject filter
    if (filterSubject) {
      result = result.filter(item => item.subject === filterSubject);
    }
    
    // Apply sorting
    result = sortData(result, sortOption);
    
    setFilteredData(result);
  }, [searchQuery, filterGradeLevel, filterSubject, sortOption, tableData]);

  const sortData = (data: Teacher[], sortType: SortOption): Teacher[] => {
    const sortedData = [...data];
    
    switch (sortType) {
      case "alphabetical":
        return sortedData.sort((a, b) => 
          a.teacherName.localeCompare(b.teacherName)
        );
      default:
        return sortedData;
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this teacher?")) {
      try {
        const docRef = doc(db, "teachers", id);
        await deleteDoc(docRef);
        setTableData(prevData => prevData.filter(item => item.id !== id));
      } catch (error) {
        console.error("Error deleting teacher:", error);
        alert("Failed to delete teacher. Please try again.");
      }
    }
  };

  const handleEditClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setEditEmail(teacher.email);
    setEditTeacherName(teacher.teacherName);
    setEditSubject(teacher.subject);
    setEditGradeLevel(teacher.gradeLevel);
    openModal();
  };

  const handleSave = async () => {
    if (!selectedTeacher) return;

    try {
      const docRef = doc(db, "teachers", selectedTeacher.id);

      await updateDoc(docRef, {
        Email: editEmail,
        Name: editTeacherName,
        Subject: editSubject,
        GradeLevel: editGradeLevel
      });

      setTableData(prevData =>
        prevData.map(item =>
          item.id === selectedTeacher.id
            ? {
                ...item,
                email: editEmail,
                teacherName: editTeacherName,
                subject: editSubject,
                gradeLevel: editGradeLevel
              }
            : item
        )
      );

      closeModal();
    } catch (error) {
      console.error("Error updating teacher:", error);
      alert("Failed to update teacher. Please try again.");
    }
  };

  const handleSelectChange = (value: string) => {
    setEditGradeLevel(value);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-5 border-b border-gray-100 dark:border-white/[0.05]">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          {/* Search input */}
          <div className="w-full md:w-1/3">
            <Input
              type="text"
              placeholder="Search by email, teacher, or subject"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Filter and Sort */}
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
                options={subjectOptions}
                placeholder="Filter by Subject"
                onChange={(value) => setFilterSubject(value)}
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
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1102px]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Email Address
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Teacher's Name
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Subject
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Grade Level
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Edit/Delete
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell className="px-5 py-4 text-center dark:text-white/90">
                    Loading data...
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-4 text-center dark:text-white/90">
                    No teachers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {teacher.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                      {teacher.teacherName}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90">
                      <div className="flex -space-x-2">
                        {teacher.subject}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start">
                      <Badge
                        size="sm"
                        color={
                          teacher.gradeLevel === "Nursery I"
                            ? "success"
                            : teacher.gradeLevel === "Nursery II"
                            ? "warning"
                            : "error"
                        }
                      >
                        {teacher.gradeLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex space-x-2">
                        <Button
                          size="md"
                          variant="delete"
                          onClick={() => handleDelete(teacher.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </Button>
                        <Button
                          size="md"
                          variant="edit"
                          onClick={() => handleEditClick(teacher)}
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
                Edit Teacher Information
              </h4>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                Update teacher account details to keep their profile up-to-date.
              </p>
            </div>
            <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="custom-scrollbar h-[270px] overflow-y-auto px-2 pb-3">
                <div className="mt-7">
                  <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90">
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
                      <Label>Teacher's Name</Label>
                      <Input 
                        type="text" 
                        value={editTeacherName} 
                        onChange={(e) => setEditTeacherName(e.target.value)} 
                      />
                    </div>
                    <div className="col-span-2 lg:col-span-1">
                      <Label>Subject</Label>
                      <Input 
                        type="text" 
                        value={editSubject} 
                        onChange={(e) => setEditSubject(e.target.value)} 
                      />
                    </div>
                    <div>
                      <Label>Grade Level</Label>
                      <Select
                        options={gradeOptions}
                        placeholder="Select Grade Level"
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