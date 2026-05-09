# IN-OUT Tracker API Docs

## Quy uoc bao tri

Bat buoc cap nhat file nay trong cung lan thay doi khi:

- Them endpoint moi
- Sua request/response schema
- Sua auth requirement
- Them, doi, hoac bo ma loi / message loi

Muc tieu la de frontend, QA va backend nhin vao 1 file de biet API dang hoat dong the nao.

## Base Info

- Base path: `/api`
- Runtime: Next.js App Router route handlers
- Auth hien tai: Google login + signed cookie session
- Hinh thuc response:
  - JSON cho phan lon endpoint
  - Redirect cho Google OAuth flow

## Loi chung

| HTTP | Body / Hanh vi | Khi nao xay ra |
| --- | --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` | Thieu / sai session cookie o cac API can auth |
| `400` | `{ "error": "Du lieu khong hop le." }` | Body/query khong qua validate Zod |
| `404` | `{ "error": "..." }` | Ban ghi khong ton tai o mot so endpoint update/delete |
| `500` | Khong co body custom on dinh | Loi khong duoc bat, vi du env thieu, DB loi, OAuth service loi |

## Auth APIs

### GET `/api/auth/google`

Bat dau flow dang nhap Google.

#### Query

| Param | Bat buoc | Mo ta |
| --- | --- | --- |
| `returnTo` | Khong | Duong dan noi bo sau khi dang nhap xong. Mac dinh `/` |

#### Success

- `302 Redirect` sang Google OAuth consent screen
- Set tam cookies:
  - `inout_oauth_state`
  - `inout_oauth_return`

#### Loi

| HTTP | Hanh vi | Ghi chu |
| --- | --- | --- |
| `500` | Next.js error response | Co the xay ra neu `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` bi thieu |

---

### GET `/api/auth/google/callback`

Google redirect ve endpoint nay sau khi user xac nhan.

#### Query

| Param | Bat buoc | Mo ta |
| --- | --- | --- |
| `code` | Co | Authorization code tu Google |
| `state` | Co | Gia tri anti-CSRF da set luc bat dau flow |

#### Success

- `302 Redirect` ve `returnTo`
- Set cookie session `inout_session`
- Xoa OAuth tam cookie

#### Loi

| HTTP | Hanh vi | Khi nao xay ra |
| --- | --- | --- |
| `302 Redirect -> /?auth=error` | Khong tra JSON | Thieu `code`, sai `state`, thieu cookie state, Google verify fail, DB update fail |

---

### GET `/api/auth/me`

Lay thong tin user hien tai tu session cookie.

#### Success

```json
{
  "user": {
    "id": "google-sub",
    "email": "user@example.com",
    "name": "Nguyen Van A",
    "picture": "https://..."
  }
}
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "user": null }` |

---

### POST `/api/auth/logout`

Dang xuat user hien tai.

#### Success

```json
{ "ok": true }
```

Cookie session se bi xoa.

## Transactions APIs

### GET `/api/transactions`

Lay danh sach giao dich theo thang hoac theo nam.

#### Auth

- Bat buoc dang nhap

#### Query

Can mot trong hai:

| Param | Dinh dang | Mo ta |
| --- | --- | --- |
| `month` | `YYYY-MM` | Lay giao dich trong 1 thang |
| `year` | `YYYY` | Lay giao dich trong 1 nam |

#### Success

```json
{
  "items": [
    {
      "id": "client_tx_id",
      "clientId": "client_tx_id",
      "serverId": "txn_id",
      "date": "2026-04-24",
      "type": "expense",
      "amount": 45000,
      "categoryId": "category_id",
      "category": "An uong",
      "desc": "Pho",
      "source": "Tien mat",
      "method": "Tien mat",
      "account": "Vi",
      "note": "Bua trua",
      "createdAt": "2026-04-24T04:00:00.000Z",
      "updatedAt": "2026-04-24T04:00:00.000Z",
      "syncStatus": "synced"
    }
  ]
}
```

#### Loi

| HTTP | Body | Khi nao xay ra |
| --- | --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` | Chua dang nhap |
| `400` | `{ "error": "Thieu month hoac year hop le." }` | Khong truyen query hop le |

---

### POST `/api/transactions`

Them 1 giao dich theo form nhap chi tiet.

#### Auth

- Bat buoc dang nhap

#### Body

```json
{
  "clientId": "client_tx_id_optional",
  "date": "2026-04-24",
  "type": "expense",
  "amount": 45000,
  "categoryId": "category_id_optional",
  "category": "An uong",
  "desc": "Pho",
  "source": "Tien mat",
  "method": "Tien mat",
  "account": "Vi",
  "note": "Bua trua"
}
```

#### Success

```json
{
  "id": "client_tx_id",
  "clientId": "client_tx_id",
  "serverId": "txn_id"
}
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |
| `400` | `{ "error": "Du lieu khong hop le." }` |

---

### POST `/api/transactions/quick`

Them nhieu giao dich tu chuoi quick input.

#### Auth

- Bat buoc dang nhap

#### Body

```json
{
  "date": "2026-04-24",
  "raw": "pho 45k; cafe 25k"
}
```

#### Success

```json
{
  "added": 2,
  "skipped": []
}
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |
| `400` | `{ "error": "Du lieu khong hop le." }` |

---

### PATCH `/api/transactions/:id`

Cap nhat 1 giao dich.

#### Auth

- Bat buoc dang nhap

#### Body

Giong `POST /api/transactions`

#### Success

```json
{ "id": "txn_id" }
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |
| `400` | `{ "error": "Du lieu khong hop le." }` |
| `404` | `{ "error": "Khong tim thay giao dich." }` |

---

### DELETE `/api/transactions/:id`

Xoa 1 giao dich.

#### Auth

- Bat buoc dang nhap

#### Success

```json
{ "id": "txn_id" }
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |
| `404` | `{ "error": "Khong tim thay giao dich." }` |

---

### POST `/api/sync/transactions`

Dong bo batch giao dich tu local queue len server. Endpoint nay duoc thiet ke cho local-first / offline-first va co idempotency bang `operationId` hoac `clientMutationId`.

#### Auth

- Bat buoc dang nhap

#### Body

```json
{
  "operations": [
    {
      "operationId": "op-001",
      "type": "create",
      "clientId": "client_tx_id",
      "payload": {
        "date": "2026-05-03",
        "type": "expense",
        "amount": 45000,
        "category": "An uong",
        "desc": "Bun bo"
      }
    },
    {
      "operationId": "op-002",
      "type": "update",
      "clientId": "client_tx_id",
      "payload": {
        "date": "2026-05-03",
        "type": "expense",
        "amount": 50000,
        "category": "An uong",
        "desc": "Bun bo them"
      }
    },
    {
      "operationId": "op-003",
      "type": "delete",
      "clientId": "client_tx_id"
    }
  ]
}
```

#### Rule

- `create` va `update` bat buoc co `payload`
- `operationId` hoac `clientMutationId` bat buoc co it nhat 1 field
- `clientId` la dinh danh on dinh do client sinh ra, duoc dung de hop nhat local record va server record

#### Success

```json
{
  "results": [
    {
      "operationId": "op-001",
      "clientId": "client_tx_id",
      "serverId": "txn_id",
      "status": "applied"
    }
  ]
}
```

#### `status` meaning

- `applied`: Server vua xu ly thay doi
- `duplicate`: `operationId` da duoc xu ly truoc do hoac `clientId` create da ton tai
- `deleted`: Server da xoa giao dich hoac giao dich da khong con ton tai

#### Loi

| HTTP | Body | Khi nao xay ra |
| --- | --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` | Chua dang nhap |
| `400` | `{ "error": "Du lieu sync khong hop le." }` | Batch khong qua validate |
| `500` | `{ "error": "Khong the dong bo giao dich." }` | Loi xu ly batch o server |

## Bills APIs

### GET `/api/bills`

Lay danh sach khoan dong cua user hien tai.

#### Auth

- Bat buoc dang nhap

#### Success

```json
{
  "items": [
    {
      "id": "bill_id",
      "clientId": "bill_client_id",
      "serverId": "bill_server_id",
      "name": "Tien nha",
      "amount": 5000000,
      "cycleType": "monthly",
      "cycleValue": 5,
      "group": "Nha cua",
      "start": "2026-01-01",
      "end": "2026-12-31",
      "note": "Dong dau thang",
      "paid": false,
      "createdAt": "2026-04-01T02:00:00.000Z"
    }
  ],
  "occurrences": [
    {
      "id": "bill_occurrence_id",
      "templateId": "bill_server_id",
      "templateClientId": "bill_client_id",
      "name": "Tien nha",
      "amount": 5000000,
      "cycleType": "monthly",
      "cycleValue": 5,
      "dueDate": "2026-04-05",
      "status": "paid",
      "paidAt": "2026-04-03",
      "paidAmount": 5000000,
      "paidNote": "Da dong"
    },
    {
      "id": "bill_occurrence_id_2",
      "templateId": "bill_server_id",
      "templateClientId": "bill_client_id",
      "name": "Tien nha",
      "amount": 5000000,
      "cycleType": "monthly",
      "cycleValue": 5,
      "dueDate": "2026-05-05",
      "status": "unpaid"
    }
  ],
  "payments": [
    {
      "id": "bill_payment_id",
      "templateId": "bill_server_id",
      "templateClientId": "bill_client_id",
      "name": "Tien nha",
      "amount": 5000000,
      "cycleType": "monthly",
      "cycleValue": 5,
      "dueDate": "2026-04-05",
      "status": "paid",
      "paidAt": "2026-04-03",
      "paidAmount": 5000000,
      "paidNote": "Da dong"
    }
  ]
}
```

#### Ghi chu migration

- Neu document cu chi co `dueDay`, API se tu map thanh:
  - `cycleType = "monthly"`
  - `cycleValue = dueDay`
- `items` la template khoan dong lap lai.
- `occurrences` la tung ky dong cu the, moi ky co `status = "unpaid" | "paid"`.
- `payments` chi la subset da dong cua `occurrences`, giu lai de tuong thich voi dashboard va code cu.

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |

---

### POST `/api/bills`

Tao moi hoac update khoan dong.

#### Auth

- Bat buoc dang nhap

#### Body

```json
{
  "id": "bill_id_optional",
  "name": "Tien nha",
  "amount": 5000000,
  "cycleType": "monthly",
  "cycleValue": 5,
  "group": "Nha cua",
  "start": "2026-01-01",
  "end": "2026-12-31",
  "note": "Dong dau thang"
}
```

#### `cycleType` rules

| cycleType | cycleValue hop le |
| --- | --- |
| `monthly` | `1..31` |
| `weekly` | `1..7` (Thu 2 -> Chu nhat) |
| `custom_days` | `1..3650` |

#### Success

```json
{ "id": "bill_id" }
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |
| `400` | `{ "error": "Du lieu khong hop le." }` |

> Luu y: Neu gui `id` khong ton tai / khong thuoc user hien tai, route hien tai van tra `200` voi body `{ "id": "undefined" }` thay vi `404`.

---

### DELETE `/api/bills/:id`

Xoa khoan dong.

#### Success

```json
{ "id": "bill_id" }
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |
| `404` | `{ "error": "Khong tim thay khoan dong." }` |

---

### PATCH `/api/bills/:id/paid`

Toggle nhanh trang thai da dong / chua dong.

#### Body

```json
{ "paid": true }
```

#### Success

```json
{ "id": "bill_id_or_undefined" }
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |
| `400` | `{ "error": "Du lieu khong hop le." }` |

> Luu y: Route nay hien tai khong tra `404` neu bill khong ton tai. Neu repo khong tim thay du lieu, body co the thanh `{ "id": "undefined" }`.

---

### PATCH `/api/bills/:id/pay`

Xac nhan da dong cho 1 ky cu the. Route nay se tao record lich su da dong, khong mutate template recurring goc.

#### Body

```json
{
  "dueDate": "2026-04-05",
  "paidAt": "2026-04-05",
  "paidAmount": 5000000,
  "paidNote": "Da dong"
}
```

#### Success

```json
{ "id": "bill_payment_id", "dueDate": "2026-04-05" }
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |
| `400` | `{ "error": "Du lieu khong hop le." }` |
| `404` | `{ "error": "Khong tim thay khoan dong." }` |

---

### PATCH `/api/bills/:id/unpay`

Bo 1 record da dong theo `dueDate`.

#### Body

```json
{
  "dueDate": "2026-04-05"
}
```

#### Success

```json
{ "id": "bill_payment_id", "dueDate": "2026-04-05" }
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |
| `400` | `{ "error": "Du lieu khong hop le." }` |
| `404` | `{ "error": "Khong tim thay khoan dong." }` |

---

## Categories APIs

### GET `/api/categories`

Lay danh sach category cua user hien tai, gom category he thong va category custom.

#### Auth

- Bat buoc dang nhap

#### Success

```json
{
  "items": [
    {
      "id": "category_id",
      "clientId": "category_id_or_local_id",
      "serverId": "category_id",
      "name": "An uong",
      "slug": "an-uong",
      "icon": "🍜",
      "categoryType": "expense",
      "kind": "system",
      "createdAt": "2026-05-05T04:00:00.000Z",
      "updatedAt": "2026-05-05T04:00:00.000Z",
      "syncStatus": "synced"
    }
  ]
}
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |

---

### POST `/api/categories`

Them category custom moi.

#### Auth

- Bat buoc dang nhap

#### Body

```json
{
  "name": "Cafe specialty",
  "icon": "☕",
  "categoryType": "expense"
}
```

#### Success

```json
{
  "id": "category_id",
  "clientId": "client_category_id_optional",
  "serverId": "category_id",
  "name": "Cafe specialty",
  "slug": "cafe-specialty",
  "icon": "☕",
  "categoryType": "expense",
  "kind": "custom",
  "createdAt": "2026-05-05T04:00:00.000Z",
  "updatedAt": "2026-05-05T04:00:00.000Z",
  "syncStatus": "synced"
}
```

#### Loi

| HTTP | Body | Khi nao xay ra |
| --- | --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` | Chua dang nhap |
| `400` | `{ "error": "Du lieu khong hop le." }` | Sai body |
| `409` | `{ "error": "Danh muc da ton tai." }` | Trung slug + categoryType trong cung user |

## Category Sync APIs

### POST `/api/sync/categories`

Nhan batch tao danh muc tu local store de dong bo len server theo local-first flow.

#### Auth

- Bat buoc dang nhap

#### Body

```json
{
  "operations": [
    {
      "operationId": "op_category_1",
      "type": "create",
      "clientId": "local_category_1",
      "payload": {
        "name": "Do dung em be",
        "icon": "🧸",
        "categoryType": "expense"
      }
    }
  ]
}
```

#### Success

```json
{
  "results": [
    {
      "operationId": "op_category_1",
      "clientId": "local_category_1",
      "serverId": "category_id",
      "status": "applied"
    }
  ]
}
```

#### Loi

| HTTP | Body | Khi nao xay ra |
| --- | --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` | Chua dang nhap |
| `400` | `{ "error": "Du lieu sync khong hop le." }` | Thieu `operationId/clientMutationId`, `clientId`, hoac body sai schema |
| `500` | `{ "error": "Khong the dong bo danh muc." }` | Loi DB / loi xu ly sync |

## Budgets APIs

### GET `/api/budgets`

Lay danh sach ngan sach da cau hinh kem tien da su dung / con lai trong moc hien tai.

#### Auth

- Bat buoc dang nhap

#### Query

| Param | Bat buoc | Gia tri hop le | Mo ta |
| --- | --- | --- | --- |
| `period` | Khong | `weekly`, `monthly`, `yearly` | Loc theo chu ky cu the |

#### Success

```json
{
  "items": [
    {
      "id": "budget_id",
      "categoryId": "category_id",
      "categoryName": "An uong",
      "categoryIcon": "🍜",
      "amountLimit": 200000,
      "spent": 170000,
      "remaining": 30000,
      "ratio": 0.85,
      "period": "weekly",
      "periodLabel": "tuan nay"
    }
  ]
}
```

#### Loi

| HTTP | Body | Khi nao xay ra |
| --- | --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` | Chua dang nhap |
| `400` | `{ "error": "Query khong hop le." }` | `period` khong nam trong `weekly/monthly/yearly` |

---

### POST `/api/budgets`

Tao moi hoac cap nhat ngan sach theo `categoryId + period`.

#### Auth

- Bat buoc dang nhap

#### Body

```json
{
  "categoryId": "category_id",
  "amountLimit": 200000,
  "period": "weekly"
}
```

#### Success

```json
{ "id": "budget_id" }
```

#### Loi

| HTTP | Body | Khi nao xay ra |
| --- | --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` | Chua dang nhap |
| `400` | `{ "error": "Du lieu khong hop le." }` | Sai body |
| `404` | `{ "error": "Khong tim thay danh muc." }` | `categoryId` khong thuoc user hien tai |

---

### POST `/api/sync/budgets`

Dong bo batch ngan sach tu local queue len server. Route nay duoc dung cho local-first flow cua budgets.

#### Auth

- Bat buoc dang nhap

#### Body

```json
{
  "operations": [
    {
      "operationId": "op_budget_1",
      "type": "upsert",
      "payload": {
        "categoryId": "category_id",
        "amountLimit": 200000,
        "period": "weekly"
      }
    }
  ]
}
```

#### Rule

- `operationId` hoac `clientMutationId` bat buoc co it nhat 1 field
- `categoryId` phai la server category id hop le vao luc job duoc gui len server
- Client co the tam giu queue neu category custom chua sync xong

#### Success

```json
{
  "results": [
    {
      "operationId": "op_budget_1",
      "status": "applied"
    }
  ]
}
```

#### `status` meaning

- `applied`: Server vua xu ly thay doi
- `duplicate`: `operationId` da duoc xu ly truoc do

#### Loi

| HTTP | Body | Khi nao xay ra |
| --- | --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` | Chua dang nhap |
| `400` | `{ "error": "Du lieu sync khong hop le." }` | Body sai schema sync |
| `500` | `{ "error": "Khong the dong bo ngan sach." }` | Loi DB / loi xu ly sync |

---

### GET `/api/budgets/alerts`

Tra ve cac canh bao ngan sach co muc su dung tu `80%` tro len trong tuan / thang / nam hien tai.

#### Auth

- Bat buoc dang nhap

#### Success

```json
{
  "items": [
    {
      "id": "category_id:weekly",
      "categoryId": "category_id",
      "categoryName": "An uong",
      "categoryIcon": "🍜",
      "spent": 170000,
      "amountLimit": 200000,
      "remaining": 30000,
      "ratio": 0.85,
      "period": "weekly",
      "periodLabel": "tuan nay"
    }
  ]
}
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |

## Settings APIs

### GET `/api/settings`

Lay settings cua user hien tai.

#### Success

```json
{
  "paydayDay": 25,
  "salaryExpected": 20000000
}
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |

---

### POST `/api/settings`

Cap nhat settings.

#### Body

```json
{
  "paydayDay": 25,
  "salaryExpected": 20000000
}
```

#### Success

```json
{
  "paydayDay": 25,
  "salaryExpected": 20000000
}
```

#### Loi

| HTTP | Body |
| --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` |
| `400` | `{ "error": "Du lieu khong hop le." }` |

---

### POST `/api/sync/settings`

Dong bo batch settings tu local queue len server. Route nay duoc dung cho local-first flow cua settings.

#### Auth

- Bat buoc dang nhap

#### Body

```json
{
  "operations": [
    {
      "operationId": "op_settings_1",
      "type": "upsert",
      "payload": {
        "paydayDay": 25,
        "salaryExpected": 20000000
      }
    }
  ]
}
```

#### Rule

- `operationId` hoac `clientMutationId` bat buoc co it nhat 1 field
- Queue cua settings mac dinh chi giu ban cap nhat moi nhat

#### Success

```json
{
  "results": [
    {
      "operationId": "op_settings_1",
      "status": "applied"
    }
  ]
}
```

#### `status` meaning

- `applied`: Server vua xu ly thay doi
- `duplicate`: `operationId` da duoc xu ly truoc do

#### Loi

| HTTP | Body | Khi nao xay ra |
| --- | --- | --- |
| `401` | `{ "error": "Vui long dang nhap bang Google." }` | Chua dang nhap |
| `400` | `{ "error": "Du lieu sync khong hop le." }` | Body sai schema sync |
| `500` | `{ "error": "Khong the dong bo cai dat." }` | Loi DB / loi xu ly sync |

## Ghi chu cho lan cap nhat API tiep theo

Khi them API moi, can bo sung day du 5 muc:

1. Endpoint + method
2. Auth requirement
3. Query/body schema
4. Success response example
5. Tat ca ma loi va body / redirect thuc te
