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
  socket: null;
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
  socket: null,

  // ✅ Check Authentication
  checkAuth: async () => {
    console.log("[AUTH] Checking auth...");
    set({ isCheckingAuth: true });
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
    } catch (err) {
      console.log("[AUTH] checkAuth failed:", err);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // ✅ Signup
  signUp: async (data) => {
    set({ isSigningUp: true });
    try {
      await axiosInstance.post("/auth/register", data);
      toast.success("Account created");
      return true;
    } catch (err) {
      console.log("[AUTH] SignUp error:", err);
      toast.error("Sign up failed");
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  // ✅ Verify OTP
  verifyOtp: async (email: string, otp: string) => {
    try {
      const response = await axiosInstance.post("/auth/verifyOtp", { email, otp });
      await get().checkAuth();
      toast.success(response.data.message || "Email verified successfully!");
      return true;
    } catch (err) {
      console.error("[AUTH] Verify OTP error:", err);
      toast.error("OTP verification failed");
      return false;
    }
  },

  // ✅ Login
  login: async (data) => {
    console.log("[AUTH] Login attempt:", data);
    set({ isLoggingIn: true });
    try {
      await axiosInstance.post("/auth/login", data);
      await get().checkAuth();
      toast.success("Logged in");
    } catch (err) {
      console.log("[AUTH] Login error:", err);
      toast.error("Login failed");
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
      get().disConnectSocket();
      toast.success("Logged out");
    } catch (err) {
      console.log("[AUTH] Logout error:", err);
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
