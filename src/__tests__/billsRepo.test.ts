import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { toYmd } from "@/lib/domain/date";
import { BillPaymentModel } from "@/lib/db/models";

let mongo: MongoMemoryServer;
let repo: typeof import("@/lib/repo/billsRepo");
const USER_ID = "google-user-a";
const OTHER_USER_ID = "google-user-b";

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  repo = await import("@/lib/repo/billsRepo");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("billsRepo", () => {
  it("creates a bill", async () => {
    const bill = await repo.upsertBill(USER_ID, {
      name: "Tiền nhà",
      amount: 5000000,
      cycleType: "monthly",
      cycleValue: 5,
    });
    expect(bill?.name).toBe("Tiền nhà");
  });

  it("updates a bill", async () => {
    const created = await repo.upsertBill(USER_ID, {
      name: "Internet",
      amount: 300000,
      cycleType: "monthly",
      cycleValue: 10,
    });
    const updated = await repo.upsertBill(USER_ID, {
      id: String(created?._id),
      name: "Internet Fiber",
      amount: 350000,
      cycleType: "weekly",
      cycleValue: 2,
    });
    expect(updated?.name).toBe("Internet Fiber");
    expect(updated?.cycleType).toBe("weekly");
  });

  it("clears optional fields when updating a bill", async () => {
    const created = await repo.upsertBill(USER_ID, {
      name: "Gói tập",
      amount: 500000,
      cycleType: "custom_days",
      cycleValue: 15,
      group: "Sức khoẻ",
      start: new Date("2024-05-01"),
      end: new Date("2024-12-31"),
      note: "Theo quý",
    });
    const updated = await repo.upsertBill(USER_ID, {
      id: String(created?._id),
      name: "Gói tập",
      amount: 500000,
      cycleType: "custom_days",
      cycleValue: 15,
    });

    expect(updated?.group).toBeUndefined();
    expect(updated?.start).toBeUndefined();
    expect(updated?.end).toBeUndefined();
    expect(updated?.note).toBeUndefined();
  });

  it("toggles paid status onto the nearest scheduled due date", async () => {
    const created = await repo.upsertBill(USER_ID, {
      name: "Gửi xe",
      amount: 150000,
      cycleType: "monthly",
      cycleValue: 8,
    });
    const updated = await repo.toggleBillPaid(
      USER_ID,
      String(created?._id),
      true,
      new Date("2024-05-01")
    );
    expect(updated?.templateId).toBe(String(created?._id));
    expect(updated?.dueDate ? toYmd(updated.dueDate) : undefined).toBe("2024-05-08");
  });

  it("creates payment history and can undo a specific period", async () => {
    const created = await repo.upsertBill(USER_ID, {
      name: "Điện",
      amount: 450000,
      cycleType: "monthly",
      cycleValue: 12,
      start: new Date("2024-01-01"),
    });
    const paid = await repo.payBill(
      USER_ID,
      String(created?._id),
      {
        dueDate: new Date("2024-05-12"),
        paidAt: new Date("2024-05-10"),
        paidAmount: 430000,
        paidNote: "Đóng sớm",
      }
    );
    expect(paid?.templateId).toBe(String(created?._id));
    expect(paid?.paidAmount).toBe(430000);
    expect(paid?.paidNote).toBe("Đóng sớm");
    const history = await repo.listBillPayments(USER_ID);
    expect(history.some((item) => item.templateId === String(created?._id))).toBe(true);
    const reverted = await repo.unpayBill(USER_ID, String(created?._id), new Date("2024-05-12"));
    expect(reverted?.paidAmount).toBeUndefined();
    expect(reverted?.paidAt).toBeUndefined();
    const afterUndo = await repo.listBillPayments(USER_ID);
    expect(
      afterUndo.some(
        (item) =>
          item.templateId === String(created?._id) &&
          toYmd(item.dueDate) === "2024-05-12" &&
          !item.paidAt
      )
    ).toBe(true);
  });

  it("materializes unpaid occurrences for recurring bills", async () => {
    const created = await repo.upsertBill(USER_ID, {
      name: "Trả góp máy",
      amount: 1000000,
      cycleType: "monthly",
      cycleValue: 15,
      start: new Date("2026-01-01"),
    });

    const occurrences = await repo.listBillPayments(USER_ID);
    const target = occurrences.filter(
      (item) => item.templateId === String(created?._id) && !item.paidAt
    );

    expect(target.some((item) => toYmd(item.dueDate) === "2026-01-15")).toBe(true);
    expect(target.some((item) => toYmd(item.dueDate) === "2026-05-15")).toBe(true);
  });

  it("reuses a legacy occurrence keyed by template id when marking paid", async () => {
    const created = await repo.upsertBill(USER_ID, {
      clientId: "bill-client-legacy-1",
      name: "Trả góp cũ",
      amount: 1200000,
      cycleType: "monthly",
      cycleValue: 9,
      start: new Date("2026-01-01"),
    });

    await BillPaymentModel.create({
      userId: USER_ID,
      templateId: String(created?._id),
      templateClientId: String(created?._id),
      name: "Trả góp cũ",
      amount: 1200000,
      cycleType: "monthly",
      cycleValue: 9,
      dueDate: new Date("2026-05-09"),
      createdAt: new Date("2026-05-01"),
      updatedAt: new Date("2026-05-01"),
    });

    const paid = await repo.payBill(USER_ID, String(created?._id), {
      dueDate: new Date("2026-05-09"),
      paidAt: new Date("2026-05-09"),
      paidAmount: 1200000,
    });

    const occurrences = await repo.listBillPayments(USER_ID);
    const mayOccurrences = occurrences.filter(
      (item) =>
        item.templateId === String(created?._id) && toYmd(item.dueDate) === "2026-05-09"
    );

    expect(paid?.paidAt ? toYmd(paid.paidAt) : undefined).toBe("2026-05-09");
    expect(mayOccurrences).toHaveLength(1);
    expect(mayOccurrences[0]?.templateClientId).toBe("bill-client-legacy-1");
    expect(mayOccurrences[0]?.status).toBe("paid");
    expect(mayOccurrences[0]?.paidAt ? toYmd(mayOccurrences[0].paidAt) : undefined).toBe(
      "2026-05-09"
    );
  });

  it("normalizes duplicate paid and unpaid occurrences into one paid period", async () => {
    const created = await repo.upsertBill(USER_ID, {
      clientId: "bill-client-normalize-1",
      name: "Khoản chuẩn hoá",
      amount: 880000,
      cycleType: "monthly",
      cycleValue: 11,
      start: new Date("2026-01-01"),
    });

    await BillPaymentModel.create([
      {
        userId: USER_ID,
        templateId: String(created?._id),
        templateClientId: String(created?._id),
        name: "Khoản chuẩn hoá",
        amount: 880000,
        cycleType: "monthly",
        cycleValue: 11,
        dueDate: new Date("2026-05-11"),
        status: "paid",
        paidAt: new Date("2026-05-10"),
        paidAmount: 880000,
        createdAt: new Date("2026-05-01"),
        updatedAt: new Date("2026-05-10"),
      },
      {
        userId: USER_ID,
        templateId: String(created?._id),
        templateClientId: "bill-client-normalize-1",
        name: "Khoản chuẩn hoá",
        amount: 880000,
        cycleType: "monthly",
        cycleValue: 11,
        dueDate: new Date("2026-05-11"),
        status: "unpaid",
        createdAt: new Date("2026-05-01"),
        updatedAt: new Date("2026-05-09"),
      },
    ]);

    const occurrences = await repo.listBillPayments(USER_ID);
    const target = occurrences.filter(
      (item) =>
        item.templateId === String(created?._id) && toYmd(item.dueDate) === "2026-05-11"
    );

    expect(target).toHaveLength(1);
    expect(target[0]?.templateClientId).toBe("bill-client-normalize-1");
    expect(target[0]?.status).toBe("paid");
    expect(target[0]?.paidAt ? toYmd(target[0].paidAt) : undefined).toBe("2026-05-10");
  });

  it("heals timezone-shifted paid occurrences back to the scheduled due date", async () => {
    const created = await repo.upsertBill(USER_ID, {
      clientId: "bill-client-timezone-1",
      name: "Khoản lệch múi giờ",
      amount: 2100000,
      cycleType: "monthly",
      cycleValue: 25,
      start: new Date("2026-01-01"),
    });

    await BillPaymentModel.create([
      {
        userId: USER_ID,
        templateId: String(created?._id),
        templateClientId: "bill-client-timezone-1",
        name: "Khoản lệch múi giờ",
        amount: 2100000,
        cycleType: "monthly",
        cycleValue: 25,
        dueDate: new Date("2026-01-24"),
        status: "paid",
        paidAt: new Date("2026-05-08"),
        paidAmount: 2100000,
        createdAt: new Date("2026-05-08"),
        updatedAt: new Date("2026-05-08"),
      },
      {
        userId: USER_ID,
        templateId: String(created?._id),
        templateClientId: "bill-client-timezone-1",
        name: "Khoản lệch múi giờ",
        amount: 2100000,
        cycleType: "monthly",
        cycleValue: 25,
        dueDate: new Date("2026-01-25"),
        status: "unpaid",
        createdAt: new Date("2026-05-09"),
        updatedAt: new Date("2026-05-09"),
      },
    ]);

    const occurrences = await repo.listBillPayments(USER_ID);
    const januaryOccurrences = occurrences.filter(
      (item) =>
        item.templateId === String(created?._id) && item.dueDate.getUTCMonth() === 0
    );

    expect(januaryOccurrences).toHaveLength(1);
    expect(toYmd(januaryOccurrences[0].dueDate)).toBe("2026-01-25");
    expect(januaryOccurrences[0].status).toBe("paid");
  });

  it("lists bills", async () => {
    const list = await repo.listBills(USER_ID);
    expect(list.length).toBeGreaterThan(0);
  });

  it("deletes a bill", async () => {
    const created = await repo.upsertBill(USER_ID, {
      name: "Netflix",
      amount: 260000,
      cycleType: "monthly",
      cycleValue: 15,
    });
    const removed = await repo.deleteBillById(USER_ID, String(created?._id));
    expect(removed?.name).toBe("Netflix");
  });

  it("scopes bill reads and writes by user id", async () => {
    const otherBill = await repo.upsertBill(OTHER_USER_ID, {
      name: "Khoản riêng",
      amount: 100000,
      cycleType: "monthly",
      cycleValue: 9,
    });

    const userBills = await repo.listBills(USER_ID);
    const blockedUpdate = await repo.upsertBill(USER_ID, {
      id: String(otherBill?._id),
      name: "Không được sửa",
      amount: 200000,
      cycleType: "monthly",
      cycleValue: 10,
    });
    const blockedDelete = await repo.deleteBillById(USER_ID, String(otherBill?._id));

    expect(userBills.some((bill) => bill.name === "Khoản riêng")).toBe(false);
    expect(blockedUpdate).toBeNull();
    expect(blockedDelete).toBeNull();
  });
});
