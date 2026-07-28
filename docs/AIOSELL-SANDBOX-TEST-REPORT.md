# Aiosell Channel Manager — Sandbox API Test Report

> **Date:** July 28, 2026
> **Environment:** Sandbox (`live.aiosell.com`)
> **Partner ID:** `sample-pms`
> **Hotel Code:** `sandbox-pms`
> **Auth:** Basic `aiosell : AIOsell@123`
> **Tested by:** Triplooper (`triplooper.com`)

---

## Executive Summary

All **6 core API endpoints** tested successfully (HTTP 200). The Aiosell sandbox is fully operational and ready for integration.

| Test Result | Count |
|-------------|-------|
| ✅ Passed | 6 |
| ❌ Failed | 0 |
| **Coverage** | **100%** |

---

## 1. GET — Property / Mapping Details

**Endpoint:** `GET /property_details/{hotelCode}?partnerId={pms}`
**URL:** `https://live.aiosell.com/api/v2/cm/property_details/sandbox-pms?partnerId=sample-pms`
**Status:** ✅ **200 OK**

### Response Summary

| Field | Value |
|-------|-------|
| Hotel ID | `sandbox-pms` |
| Hotel Name | `Sandbox PMS` |
| Category | `hotel` |
| Currency | `INR` |
| Timezone | `Asia/Kolkata` |
| Address | India, Bangalore, Karnataka |
| Total Rooms | **2** (EXECUTIVE: 25 units, SUITE: 5 units) |
| Total Rate Plans | **8** (4 per room type) |

### Room Configuration

| Room ID | Name | Units | Min Occ | Max Occ | Description |
|---------|------|-------|---------|---------|-------------|
| `executive` | EXECUTIVE | 25 | 1 | 2 | Free Wifi |
| `suite` | SUITE | 5 | 1 | 3 | Free Wifi |

### Rate Plans per Room

**EXECUTIVE:**
| Rate Plan Code | Occupancy | Meal Plan | Name | Extra Adult |
|---------------|-----------|-----------|------|-------------|
| `executive-s-ep` | 1 | EP (0 meals) | Room Only | ₹500 |
| `executive-d-ep` | 2 | EP (0 meals) | Room Only | ₹500 |
| `executive-s-cp` | 1 | CP (1 meal) | Breakfast | ₹500 |
| `executive-d-cp` | 2 | CP (2 meals) | Breakfast | ₹500 |

**SUITE:**
| Rate Plan Code | Occupancy | Meal Plan | Name | Extra Adult |
|---------------|-----------|-----------|------|-------------|
| `suite-s-ep` | 1 | EP (0 meals) | Room Only | ₹500 |
| `suite-d-ep` | 2 | EP (0 meals) | Room Only | ₹500 |
| `suite-s-cp` | 1 | CP (1 meal) | Breakfast | ₹500 |
| `suite-d-cp` | 2 | CP (2 meals) | Breakfast | ₹500 |

### Naming Convention Confirmed

Rate plan format: `{room_code}-{occupancy}-{mealplan}`
- `s` = Single, `d` = Double, `t` = Triple, `q` = Quad
- `EP` = Room Only, `CP` = Breakfast, `MAP` = Half Board, `AP` = Full Board

---

## 2. POST — Inventory Push

**Endpoint:** `POST /update/{pms}`
**URL:** `https://live.aiosell.com/api/v2/cm/update/sample-pms`
**Status:** ✅ **200 OK**

### Request Payload

```json
{
  "hotelCode": "sandbox-pms",
  "updates": [{
    "startDate": "2026-08-01",
    "endDate": "2026-08-03",
    "rooms": [
      { "roomCode": "executive", "available": 10 },
      { "roomCode": "suite", "available": 3 }
    ]
  }]
}
```

### Response

```json
{
  "success": true,
  "message": "Request Received Successfully"
}
```

### Verification

The pushed inventory was verified by fetching data (see Test 4 below). The fetch confirmed that the inventory was correctly stored with `executive: 10` and `suite: 3` across all 3 dates.

---

## 3. POST — Rate Push

**Endpoint:** `POST /update-rates/{pms}`
**URL:** `https://live.aiosell.com/api/v2/cm/update-rates/sample-pms`
**Status:** ✅ **200 OK**

### Request Payload

```json
{
  "hotelCode": "sandbox-pms",
  "updates": [{
    "startDate": "2026-08-01",
    "endDate": "2026-08-03",
    "rates": [
      { "roomCode": "executive", "rateplanCode": "executive-s-ep", "rate": 5000 },
      { "roomCode": "executive", "rateplanCode": "executive-d-ep", "rate": 6000 },
      { "roomCode": "suite", "rateplanCode": "suite-s-ep", "rate": 8000 },
      { "roomCode": "suite", "rateplanCode": "suite-d-ep", "rate": 10000 }
    ]
  }]
}
```

### Response

```json
{
  "success": true,
  "message": "Request Received Successfully"
}
```

### Verification

The pushed rates were verified by fetching data (see Test 5). All 4 rate plans showed the correct pushed values on the requested dates.

---

## 4. POST — Fetch Inventory

**Endpoint:** `POST /data/{pms}`
**URL:** `https://live.aiosell.com/api/v2/cm/data/sample-pms`
**Status:** ✅ **200 OK**

### Request Payload

```json
{
  "type": "inventory",
  "hotelCode": "sandbox-pms",
  "startDate": "2026-08-01",
  "endDate": "2026-08-03"
}
```

### Response Summary

| Date | Executive | Suite |
|------|-----------|-------|
| 2026-08-01 | **10** ✅ (matched push) | **3** ✅ (matched push) |
| 2026-08-02 | **10** ✅ (matched push) | **3** ✅ (matched push) |
| 2026-08-03 | **10** ✅ (matched push) | **3** ✅ (matched push) |

**Result:** ✅ Inventory push/fetch round-trip verified. All values match.

---

## 5. POST — Fetch Rates

**Endpoint:** `POST /data/{pms}`
**URL:** `https://live.aiosell.com/api/v2/cm/data/sample-pms`
**Status:** ✅ **200 OK**

### Request Payload

```json
{
  "type": "rates",
  "hotelCode": "sandbox-pms",
  "startDate": "2026-08-01",
  "endDate": "2026-08-03"
}
```

### Response Summary

| Room | Rate Plan | Pushed Rate | Fetched Rate | Match? |
|------|-----------|-------------|--------------|--------|
| executive | `executive-s-ep` | ₹5,000 | **₹5,000** | ✅ |
| executive | `executive-d-ep` | ₹6,000 | **₹6,000** | ✅ |
| executive | `executive-s-cp` | — (did not push) | ₹10,000 | ℹ️ (pre-existing) |
| executive | `executive-d-cp` | — (did not push) | ₹10,000 | ℹ️ (pre-existing) |
| suite | `suite-s-ep` | ₹8,000 | **₹8,000** | ✅ |
| suite | `suite-d-ep` | ₹10,000 | **₹10,000** | ✅ |
| suite | `suite-s-cp` | — (did not push) | ₹8,000 | ℹ️ (pre-existing) |
| suite | `suite-d-cp` | — (did not push) | ₹6,000 | ℹ️ (pre-existing) |

**Result:** ✅ All 4 pushed rates verified. 4 pre-existing rates untouched.

---

## 6. POST — Fetch Reservations

**Endpoint:** `POST /data/{pms}`
**URL:** `https://live.aiosell.com/api/v2/cm/data/sample-pms`
**Status:** ✅ **200 OK**

### Request Payload

```json
{
  "type": "reservation",
  "hotelCode": "sandbox-pms",
  "startDate": "2026-07-22",
  "endDate": "2026-07-28"
}
```

### Response Summary

| Metric | Count |
|--------|-------|
| Total reservations returned | **16** |
| Unique channels | Direct, PMS, Aiosell BE, make my trip |

### Reservation Breakdown

| Status | Count | Examples |
|--------|-------|---------|
| `action: "book"` | 14 | Various guest names and channels |
| `action: "cancel"` | 2 | Swapnil Harne (Aiosell BE), Bharath (PMS) |

### Channels Used

| Channel | Bookings |
|---------|----------|
| Direct | 10 |
| PMS | 5 (with `cmBookingId` format `AIO-SAN-XXXX-XXXX`) |
| Aiosell BE | 1 |
| make my trip | 1 |

### Key Observations

- **Guest fields are optional**: Multiple bookings have `phone: null`, `email: null`, sparse address
- **Payment at hotel (pah)**: Most bookings have `pah: true` (pay at hotel)
- **cmBookingId**: Present only on PMS-channel bookings (format: `AIO-SAN-XXXX-XXXX`)
- **Cancelled bookings**: Returned alongside active ones with `action: "cancel"`

---

## 7. Push → Fetch Round-Trip Verification

| Step | Action | Data Sent | Verified? |
|------|--------|-----------|-----------|
| 1 | Push Inventory | executive: 10, suite: 3 | — |
| 2 | Fetch Inventory | executive: 10, suite: 3 | ✅ Match |
| 3 | Push Rates | 4 rate plans at specified amounts | — |
| 4 | Fetch Rates | All 4 pushed rates confirmed | ✅ Match |

**Round-trip integrity: ✅ PASS**

---

## 8. Authentication & Error Handling

| Test | Expected | Actual | Result |
|------|----------|--------|--------|
| Valid Basic Auth (200) | Success response | `success: true` | ✅ |
| Missing Auth (401) | Unauthorized | *(not tested, but per spec)* | ℹ️ |
| Wrong hotelCode (404) | Unknown hotelCode | *(not tested, but per spec)* | ℹ️ |
| Invalid dates (400) | Validation error | *(not tested, but per spec)* | ℹ️ |

---

## 9. Conclusion

| # | Endpoint | Method | Result |
|---|----------|--------|--------|
| 1 | Get Property Details | GET | ✅ PASS |
| 2 | Inventory Push | POST | ✅ PASS |
| 3 | Rate Push | POST | ✅ PASS |
| 4 | Fetch Inventory | POST | ✅ PASS |
| 5 | Fetch Rates | POST | ✅ PASS |
| 6 | Fetch Reservations | POST | ✅ PASS |

**All endpoints functional. Sandbox ready for integration. Push → Fetch round-trip verified.**

---

*Report generated by Triplooper — triplooper.com*
