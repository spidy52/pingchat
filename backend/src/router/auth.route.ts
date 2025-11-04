import express from "express";
import { register, verifyOtp, handleLogin, handleLogout, checkAuth,updateProfile } from "../controller/auth.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/verifyOtp", verifyOtp);
authRouter.post("/login", handleLogin);
authRouter.post("/logout", handleLogout);
authRouter.get("/check",authenticateToken,checkAuth);
authRouter.put("/updateProfile",authenticateToken,updateProfile);
export default authRouter;