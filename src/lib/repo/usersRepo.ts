import { connectToDatabase } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import type { AuthUser } from "@/lib/auth/types";

export const upsertGoogleUser = async (user: AuthUser) => {
  await connectToDatabase();

  return UserModel.findOneAndUpdate(
    { googleId: user.id },
    {
      $set: {
        email: user.email,
        name: user.name,
        picture: user.picture,
        lastLoginAt: new Date(),
      },
      $setOnInsert: {
        googleId: user.id,
        createdAt: new Date(),
      },
    },
    { new: true, upsert: true }
  ).lean();
};
