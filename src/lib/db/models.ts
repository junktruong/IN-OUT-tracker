import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const transactionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    type: { type: String, enum: ["expense", "income"], required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    desc: { type: String, required: true },
    source: { type: String },
    method: { type: String },
    account: { type: String },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

transactionSchema.index({ userId: 1, date: 1 });

const billSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    cycleType: {
      type: String,
      enum: ["monthly", "weekly", "custom_days"],
      required: true,
      default: "monthly",
      index: true,
    },
    cycleValue: { type: Number, required: true, default: 1, index: true },
    group: { type: String },
    start: { type: Date },
    end: { type: Date },
    note: { type: String },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date },
    paidAmount: { type: Number },
    paidNote: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

billSchema.index({ userId: 1, cycleType: 1, cycleValue: 1 });

const settingsSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    paydayDay: { type: Number, default: 25 },
    salaryExpected: { type: Number, default: 0 },
  },
  { versionKey: false }
);

const userSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, index: true },
    name: { type: String },
    picture: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

type Transaction = InferSchemaType<typeof transactionSchema>;
type Bill = InferSchemaType<typeof billSchema>;
type Settings = InferSchemaType<typeof settingsSchema>;
type User = InferSchemaType<typeof userSchema>;

const TransactionModel: Model<Transaction> =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);

const BillModel: Model<Bill> =
  mongoose.models.Bill || mongoose.model("Bill", billSchema);

const SettingsModel: Model<Settings> =
  mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

const UserModel: Model<User> =
  mongoose.models.User || mongoose.model("User", userSchema);

export { TransactionModel, BillModel, SettingsModel, UserModel };
export type { Transaction, Bill, Settings, User };
