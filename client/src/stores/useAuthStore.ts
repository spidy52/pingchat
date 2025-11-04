import { create } from "zustand";
import axiosInstance from "../lib/axios.config";
import { toast } from "react-hot-toast";
import axios from "axios"; // ✅ Needed for axios error type checking
import type { TRegisterForm, TLoginForm } from "../lib/auth.validation";

type TAuth = {
  username: string;
  displayName: string;
  id: string;
  avatar: string;
  email: string;
  bio: string;
};

type TAuthStore = {
  authUser: null | TAuth;
  isSigningUp: boolean;
  isLoggingIn: boolean;
  isCheckingAuth: boolean;
  checkAuth: () => Promise<void>;
  signUp: (data: TRegisterForm) => Promise<boolean>;
  logout: () => Promise<void>;
  login: (data: TLoginForm) => Promise<void>;
  connectSocket: () => void;
  disConnectSocket: () => void;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;

  // ✅ New: Update Profile
  updateProfile: (data: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    oldPassword?: string;
    password?: string;
  }) => Promise<void>;
};

export const useAuthStore = create<TAuthStore>()((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isCheckingAuth: true,

  // ✅ Check Authentication
  checkAuth: async () => {
    console.log("[AUTH] Checking auth...");
    set({ isCheckingAuth: true });
    try {
      const res = await axiosInstance.get("/auth/check");
      console.log("[AUTH] Auth check response:", res.data);
      set({ authUser: res.data });
    } catch (err: any) {
      console.log("[AUTH] checkAuth failed:", err.response?.data || err.message);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // ✅ Signup
  signUp: async (data) => {
    set({ isSigningUp: true });
    try {
      const response = await axiosInstance.post("/auth/register", data);
      console.log("[AUTH] SignUp response:", response.data);
      toast.success(response.data.message || "OTP sent to your email");
      return true;
    } catch (err: any) {
      console.log("[AUTH] SignUp error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Sign up failed");
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  // ✅ Verify OTP
  verifyOtp: async (email: string, otp: string) => {
    try {
      const response = await axiosInstance.post("/auth/verifyOtp", {
        email,
        otp
      });
      console.log("[AUTH] Verify OTP response:", response.data);
      
      // Check auth after successful verification
      await get().checkAuth();
      toast.success(response.data.message || "Email verified successfully!");
      return true;
    } catch (err: any) {
      console.error("[AUTH] Verify OTP error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "OTP verification failed");
      return false;
    }
  },

  // ✅ Login
  login: async (data) => {
    console.log("[AUTH] Login attempt:", data);
    set({ isLoggingIn: true });
    try {
      const response = await axiosInstance.post("/auth/login", data);
      console.log("[AUTH] Login response:", response.data);
      
      // Check auth to get user data
      await get().checkAuth();
      
      toast.success(response.data.message || "Logged in successfully");
    } catch (err: any) {
      console.log("[AUTH] Login error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // ✅ Logout
  logout: async () => {
    console.log("[AUTH] Logout attempt...");
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
    } catch (err: any) {
      console.log("[AUTH] Logout error:", err.response?.data || err.message);
      toast.error("Logout failed");
    }
  },

  // ✅ Update Profile (clean, type-safe, no ESLint warnings)
  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/updateProfile", data);

      set((state) => ({
        authUser: {
          ...state.authUser!,
          ...res.data.user,
        },
      }));

      toast.success("Profile updated successfully!");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error("[AUTH] Update profile error:", err);
        toast.error(err.response?.data?.message || "Profile update failed");
      } else if (err instanceof Error) {
        console.error("[AUTH] Update profile error:", err.message);
        toast.error(err.message);
      } else {
        console.error("[AUTH] Unknown update profile error:", err);
        toast.error("Unexpected error occurred");
      }
    }
  },

  // ✅ Socket Placeholder
  connectSocket: () => {
    console.log("[SOCKET] connectSocket called (no implementation yet)");
  },

  disConnectSocket: () => {
    console.log("[SOCKET] disConnectSocket called (no implementation yet)");
  },
}));
