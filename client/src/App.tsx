import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./stores/useAuthStore";
import { useChatStore } from "./stores/useChatStore";
import Register from "./pages/Register";
import Login from "./pages/Login";
import HomePage from "./pages/Home";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Navbar from "./pages/Navbar";
import ProfilePage from "./pages/UserProfile";
import VerifyOtp from "./pages/VerifyOtp";

function App() {
  const { checkAuth, isCheckingAuth, authUser } = useAuthStore();
  const { connectSocket, disconnectSocket } = useChatStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Connect/disconnect socket based on auth state
  useEffect(() => {
    if (authUser) {
      connectSocket(authUser.id);
    } else {
      disconnectSocket();
    }

    // Cleanup on unmount
    return () => {
      disconnectSocket();
    };
  }, [authUser, connectSocket, disconnectSocket]);

  // Show loading state while checking initial auth
  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Show Navbar only for authenticated routes */}
      {authUser && <Navbar />}

      <Routes>
        {/* Public Routes */}
        <Route
          path="/register"
          element={!authUser ? <Register /> : <Navigate to="/" replace />}
        />
        <Route
          path="/verify-otp"
          element={!authUser ? <VerifyOtp /> : <Navigate to="/" replace />}
        />
        <Route
          path="/login"
          element={!authUser ? <Login /> : <Navigate to="/" replace />}
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Routes>

      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: "#333",
            color: "#fff",
          },
        }}
      />
    </>
  );
}

export default App;