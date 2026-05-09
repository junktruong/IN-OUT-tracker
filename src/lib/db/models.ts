import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { budgetPeriods } from "@/lib/domain/budgets";
import { categoryKinds, categoryTypes } from "@/lib/domain/categories";

const transactionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    clientId: {
      type: String,
      required: true,
      index: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    date: { type: Date, required: true, index: true },
    type: { type: String, enum: ["expense", "income"], required: true },
    amount: { type: Number, required: true },
    categoryId: { type: String, index: true },
    category: { type: String, required: true },
    desc: { type: String, required: true },
    source: { type: String },
    method: { type: String },
    account: { type: String },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

transactionSchema.index({ userId: 1, date: 1 });
transactionSchema.index(
  { userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $exists: true } } }
);

const billSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    clientId: { type: String, index: true },
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
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

billSchema.index({ userId: 1, cycleType: 1, cycleValue: 1 });
billSchema.index(
  { userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $exists: true } } }
);

const billPaymentSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    templateId: { type: String, index: true },
    templateClientId: { type: String, required: true, index: true },
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
    dueDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["unpaid", "paid"],
      required: true,
      default: "unpaid",
      index: true,
    },
    paidAt: { type: Date, index: true },
    paidAmount: { type: Number },
    paidNote: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

billPaymentSchema.index({ userId: 1, templateClientId: 1, dueDate: 1 }, { unique: true });

const settingsSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    paydayDay: { type: Number, default: 25 },
    salaryExpected: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const categorySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    clientId: { type: String, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    icon: { type: String, required: true, default: "✨" },
    categoryType: { type: String, enum: categoryTypes, required: true, index: true },
    kind: { type: String, enum: categoryKinds, required: true, default: "custom", index: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

categorySchema.index({ userId: 1, slug: 1, categoryType: 1 }, { unique: true });
categorySchema.index(
  { userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $exists: true } } }
);

const budgetSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    categoryId: { type: String, required: true, index: true },
    amountLimit: { type: Number, required: true },
    period: { type: String, enum: budgetPeriods, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

budgetSchema.index({ userId: 1, categoryId: 1, period: 1 }, { unique: true });

const syncOperationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    mutationType: { type: String, required: true, index: true },
    operationId: { type: String, required: true, index: true },
    clientId: { type: String },
    serverId: { type: String },
    status: { type: String, required: true, default: "applied" },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

syncOperationSchema.index({ userId: 1, operationId: 1 }, { unique: true });

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
type BillPayment = InferSchemaType<typeof billPaymentSchema>;
type Settings = InferSchemaType<typeof settingsSchema>;
type Category = InferSchemaType<typeof categorySchema>;
type Budget = InferSchemaType<typeof budgetSchema>;
type SyncOperation = InferSchemaType<typeof syncOperationSchema>;
type User = InferSchemaType<typeof userSchema>;

const TransactionModel: Model<Transaction> =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);

const BillModel: Model<Bill> =
  mongoose.models.Bill || mongoose.model("Bill", billSchema);

const BillPaymentModel: Model<BillPayment> =
  mongoose.models.BillPayment || mongoose.model("BillPayment", billPaymentSchema);

const SettingsModel: Model<Settings> =
  mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

const CategoryModel: Model<Category> =
  mongoose.models.Category || mongoose.model("Category", categorySchema);

const BudgetModel: Model<Budget> =
  mongoose.models.Budget || mongoose.model("Budget", budgetSchema);

const SyncOperationModel: Model<SyncOperation> =
  mongoose.models.SyncOperation || mongoose.model("SyncOperation", syncOperationSchema);

const UserModel: Model<User> =
  mongoose.models.User || mongoose.model("User", userSchema);

export {
  TransactionModel,
  BillModel,
  BillPaymentModel,
  SettingsModel,
  CategoryModel,
  BudgetModel,
  SyncOperationModel,
  UserModel,
};
export type { Transaction, Bill, BillPayment, Settings, Category, Budget, SyncOperation, User };
