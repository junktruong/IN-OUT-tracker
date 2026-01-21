import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const transactionSchema = new Schema(
  {
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

const billSchema = new Schema(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDay: { type: Number, required: true, index: true },
    group: { type: String },
    start: { type: Date },
    end: { type: Date },
    note: { type: String },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date },
    paidAmount: { type: Number },
    paidNote: { type: String },
  },
  { versionKey: false }
);

const settingsSchema = new Schema(
  {
    paydayDay: { type: Number, default: 25 },
    salaryExpected: { type: Number, default: 0 },
  },
  { versionKey: false }
);

type Transaction = InferSchemaType<typeof transactionSchema>;
type Bill = InferSchemaType<typeof billSchema>;
type Settings = InferSchemaType<typeof settingsSchema>;

const TransactionModel: Model<Transaction> =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);

const BillModel: Model<Bill> =
  mongoose.models.Bill || mongoose.model("Bill", billSchema);

const SettingsModel: Model<Settings> =
  mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

export { TransactionModel, BillModel, SettingsModel };
export type { Transaction, Bill, Settings };
