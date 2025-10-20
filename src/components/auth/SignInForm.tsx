import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetEmailError, setResetEmailError] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  // Timer for resend button
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Add reset email validation
  const validateEmail = (value: string, context: "login" | "reset" = "login") => {
    const isValidEmail =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
    if (context === "login") {
      setEmailError(!isValidEmail);
    } else {
      setResetEmailError(!isValidEmail);
    }
    return isValidEmail;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const handleResetEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setResetEmail(value);
    validateEmail(value, "reset");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const userEmail = userCred.user.email;

      const docRef = doc(db, "teachers", userEmail!);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const role = docSnap.data().Role;

        if (role === "Admin") {
          navigate("/Dashboard");
        } else {
          setError("Unauthorized User [01]");
        }
      } else {
        setError("Login failed. Unauthorized User.");
      }
    } catch (err) {
      console.error(err);
      setError("Login failed. Check your email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setResetMessage("");
    setResetLoading(true);

    if (!validateEmail(resetEmail, "reset")) {
      setResetMessage("Please enter a valid email address.");
      setResetLoading(false);
      return;
    }

    try {
      const docRef = doc(db, "teachers", resetEmail);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setResetMessage("This email is not registered. Please use a registered email.");
        setResetLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage("Check your email for the password reset link.");
      setTimer(30);
    } catch (err) {
      if (err instanceof Error) {
        console.error(err);
        setResetMessage("Failed to send password reset email. Please try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto"></div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Log In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to Log in!
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    error={emailError}
                    onChange={handleEmailChange}
                    placeholder="Enter your email"
                    hint={
                      emailError ? "This is an invalid email address." : ""
                    }
                  />
                </div>
                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => setShowResetPopup(true)}
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Forgot password?
                  </button>
                </div>
                {error && (
                  <div className="text-sm text-error-500 dark:text-red-400">
                    {error}
                  </div>
                )}
                <div>
                  <Button
                    className="w-full"
                    size="sm"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Logging in..." : "Log in"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      {showResetPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Reset Password
            </h2>
            <div className="space-y-4">
              <div>
                <Label>
                  Email <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={resetEmail}
                  error={resetEmailError}
                  onChange={handleResetEmailChange}
                  placeholder="Enter your email"
                  hint={resetEmailError ? "This is an invalid email address." : ""}
                />
              </div>
              {resetMessage && (
                <div className={`text-sm ${resetMessage.includes("Check") ? "text-green-500 dark:text-green-400" : "text-error-500 dark:text-red-400"}`}>
                  {resetMessage}
                </div>
              )}
              <div className="flex justify-between">
                <button
                  onClick={() => setShowResetPopup(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordReset}
                  disabled={timer > 0 || resetLoading}
                  className={`px-4 py-2 text-white rounded-lg ${
                    timer > 0 || resetLoading
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-brand-500 hover:bg-brand-600"
                  }`}
                >
                  {resetLoading ? "Sending..." : timer > 0 ? `Resend in ${timer}s` : "Send Reset Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
