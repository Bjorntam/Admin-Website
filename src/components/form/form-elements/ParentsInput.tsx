import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase"; // adjust path as needed
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Input from "../input/InputField";
import Select from "../Select";
import { PlusIcon } from "../../../icons";
import Button from "./../../ui/button/Button";
import Alert from "./../../ui/alert/Alert";

export default function DefaultInputs() {
  const options = [
    { value: "Nursery I", label: "Nursery I" },
    { value: "Nursery II", label: "Nursery II" },
  ];

  const [email, setEmail] = useState("");
  const [childName, setChildName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [error, setError] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "warning" | "info" | undefined>(undefined);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Effect to handle auto-dismissing success alert
  useEffect(() => {
    let timeoutId: number | undefined;
    
    // If status type is success, set the success alert to show
    if (statusType === "success") {
      setShowSuccessAlert(true);
      
      // Set a timeout to hide the success alert after 5 seconds
      timeoutId = window.setTimeout(() => {
        setShowSuccessAlert(false);
      }, 5000);
    }
    
    // Clean up the timeout if component unmounts or status changes
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [statusType, status]);

  const validateEmail = (value: string) => {
    const isValidEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
    setError(!isValidEmail);
    return isValidEmail;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const handleChildNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChildName(e.target.value);
  };

  const handleSelectChange = (value: string) => {
    setGradeLevel(value);
  };

  const handleSubmit = async () => {
    // Check if any field is empty
    if (!email || !childName || !gradeLevel) {
      setStatus("Please fill out all fields.");
      setStatusType("error");
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      setStatus("Invalid email address.");
      setStatusType("error");
      return;
    }

    try {
      // Check if parent already exists
      const parentRef = doc(db, "parents", email.toLowerCase());
      const snapshot = await getDoc(parentRef);

      if (snapshot.exists()) {
        // Parent exists - show warning instead of success
        setStatus("This email is already registered in our system.");
        setStatusType("warning");
        return;
      }

      // Add new parent
      await setDoc(parentRef, {
        Role: "Parent",
        ChildName: childName,
        GradeLevel: gradeLevel,
        ChildUID: "",
      });
      
      // Success message
      setStatus("Parent & Child added successfully!");
      setStatusType("success");
      
      // Reset form fields after successful submission
      setEmail("");
      setChildName("");
      setGradeLevel("");
    } catch (err) {
      // Error handling
      setStatus("Error adding parent: " + (err as Error).message);
      setStatusType("error");
    }
  };

  // Function to get appropriate title based on statusType
  const getAlertTitle = () => {
    switch (statusType) {
      case "success":
        return "Success";
      case "error":
        return "Error";
      case "warning":
        return "Warning";
      case "info":
        return "Information";
      default:
        return "Notification";
    }
  };

  // Helper function to render alert based on type
  const renderAlert = () => {
    if (!status || !statusType) return null;
    
    return (
      <Alert
        variant={statusType}
        title={getAlertTitle()}
        message={status}
        showLink={false}
      />
    );
  };

  return (
    <ComponentCard title="Parent Information | Individual">
      <div className="space-y-6">
        {/* Show error/warning alerts at the top */}
        {status && statusType && (statusType === "error" || statusType === "warning") && (
          <div className="mb-4">
            {renderAlert()}
          </div>
        )}
        
        <div>
          <Label>Parent's Email</Label>
          <Input
            type="email"
            value={email}
            error={error}
            onChange={handleEmailChange}
            placeholder="Parent@gmail.com"
            hint={error ? "This is an invalid email address." : ""}
          />
        </div>
        <div>
          <Label htmlFor="input">Child's Name</Label>
          <Input
            type="text"
            id="input"
            value={childName}
            onChange={handleChildNameChange}
            placeholder="e.g. Henrick Patenio"
          />
        </div>
        <div>
          <Label>Grade Level</Label>
          <Select
            options={options}
            placeholder="Select Grade level"
            onChange={handleSelectChange}
            className="dark:bg-dark-900"
          />
        </div>
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="primary"
            startIcon={<PlusIcon />}
            onClick={handleSubmit}
          >
            Register Account
          </Button>
        </div>
        
        {/* Show success alerts at the bottom with auto-dismiss */}
        {status && statusType === "success" && showSuccessAlert && (
          <div className="mt-4 transition-opacity duration-300 ease-in-out">
            {renderAlert()}
          </div>
        )}
      </div>
    </ComponentCard>
  );
}