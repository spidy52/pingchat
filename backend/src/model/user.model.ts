import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  username: string;
  displayName: string;
  avatar: string;
  passwordHash: string;
  email: string;
  bio: string;
  createdAt: Date;
  updatedAt: Date;
  toJson(): IAuthenticate;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IAuthenticate {
  username: string;
  id: string;
  displayName: string;
  avatar: string;
  email: string;
  bio: string;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "" },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toJson = function (): IAuthenticate {
  return {
    username: this.username,
    id: this._id.toString(),
    displayName: this.displayName,
    avatar: this.avatar,
    email: this.email,
    bio: this.bio,
  };
};

export const User = model<IUser>("User", userSchema);
