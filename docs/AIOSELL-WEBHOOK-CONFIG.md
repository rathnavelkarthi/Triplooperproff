# Triplooper — Aiosell Channel Manager Integration
## Webhook Configuration Document

> **Document for Aiosell Integration Team**
> *Prepared by Triplooper (triplooper.com)*
> *Date: July 28, 2026*

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Reservation Webhook (Aiosell → Triplooper)](#3-reservation-webhook-aiosell--triplooper)
4. [Inventory Webhook (Aiosell → Triplooper)](#4-inventory-webhook-aiosell--triplooper)
5. [Rates Webhook (Aiosell → Triplooper)](#5-rates-webhook-aiosell--triplooper)
6. [Room & Rate Plan Mapping](#6-room--rate-plan-mapping)
7. [Environment Summary](#7-environment-summary)

---

## 1. Overview

Triplooper provides the following webhook endpoints for Aiosell to push real-time reservation, inventory, and rate updates. All endpoints are hosted on Triplooper's infrastructure and accessible via `triplooper.com`.

| Webhook | URL | Purpose |
|---------|-----|---------|
| Reservation | `https://triplooper.com/api/webhooks/aiosell/reservation` | Receive book / modify / cancel reservations |
| Inventory | `https://triplooper.com/api/webhooks/aiosell/inventory` | Receive room availability updates |
| Inventory + Restrictions | `https://triplooper.com/api/webhooks/aiosell/inventory-restrictions` | Receive availability + stop-sell, min-stay, etc. |
| Rates | `https://triplooper.com/api/webhooks/aiosell/rates` | Receive rate updates |
| Rates + Restrictions | `https://triplooper.com/api/webhooks/aiosell/rates-restrictions` | Receive rates + rateplan-level restrictions |

---

## 2. Authentication

All webhook endpoints use **HTTP Basic Authentication** with the same shared credentials.

| Field | Value |
|-------|-------|
| **Username** | `triplooper` |
| **Password** | `TplAI0s3ll@2026` |
| **Header format** | `Authorization: Basic <base64(username:password)>` |
| **Content-Type** | `application/json` |

**Example header:**
```
Authorization: Basic dHJpcGxvb3BlcjpUcGxBSTRzM2xsQDIwMjY=
```

> ⚠️ Aiosell MUST include this header in every webhook POST request. Requests without valid credentials will receive a `401 Unauthorized` response.

---

## 3. Reservation Webhook (Aiosell → Triplooper)

Aiosell sends reservation notifications to this endpoint when a guest makes a booking, modification, or cancellation on an OTA.

**Endpoint URL:** `https://triplooper.com/api/webhooks/aiosell/reservation`
**Method:** `POST`

**Success response format (all actions):**
```json
{
  "success": true,
  "message": "Reservation Updated Successfully"
}
```

---

### 3.1 New Reservation (`action: "book"`)

```json
{
  "action": "book",
  "hotelCode": "sandbox-pms",
  "channel": "Booking.com",
  "bookingId": "BK-20260801-001",
  "cmBookingId": "CM-REF-20260801-001",
  "bookedOn": "2026-07-28 14:30:00",
  "checkin": "2026-08-01",
  "checkout": "2026-08-03",
  "segment": "OTA",
  "specialRequests": "Early check-in requested. Guest prefers top floor.",
  "pah": false,
  "amount": {
    "amountAfterTax": 13789.44,
    "amountBeforeTax": 12312.00,
    "tax": 1477.44,
    "currency": "INR",
    "commission": 2462.40,
    "tcs": 61.56,
    "tds": 12.32
  },
  "guest": {
    "firstName": "Akshay",
    "lastName": "Kumar",
    "email": "akshay.kumar@email.com",
    "phone": "9988776655",
    "address": {
      "line1": "51, MG Road, Indiranagar",
      "city": "Bangalore",
      "state": "Karnataka",
      "country": "India",
      "zipCode": "560035"
    }
  },
  "rooms": [
    {
      "roomCode": "executive",
      "rateplanCode": "executive-s-ep",
      "guestName": "Akshay Kumar",
      "occupancy": {
        "adults": 1,
        "children": 0
      },
      "prices": [
        { "date": "2026-08-01", "sellRate": 5000.00 },
        { "date": "2026-08-02", "sellRate": 5000.00 }
      ]
    }
  ]
}
```

**Success response:** `200 OK`
```json
{ "success": true, "message": "Reservation Updated Successfully" }
```

---

### 3.2 Modify Reservation (`action: "modify"`)

Same payload structure as `book`, but with `"action": "modify"`.

```json
{
  "action": "modify",
  "hotelCode": "sandbox-pms",
  "channel": "Booking.com",
  "bookingId": "BK-20260801-001",
  "cmBookingId": "CM-REF-20260801-001",
  "bookedOn": "2026-07-28 14:30:00",
  "checkin": "2026-08-01",
  "checkout": "2026-08-04",
  "segment": "OTA",
  "specialRequests": "Updated: Guest extended stay by 1 night.",
  "pah": false,
  "amount": {
    "amountAfterTax": 18900.00,
    "amountBeforeTax": 16875.00,
    "tax": 2025.00,
    "currency": "INR",
    "commission": 3400.00
  },
  "guest": {
    "firstName": "Akshay",
    "lastName": "Kumar",
    "email": "akshay.kumar@email.com",
    "phone": "9988776655"
  },
  "rooms": [
    {
      "roomCode": "executive",
      "rateplanCode": "executive-s-ep",
      "guestName": "Akshay Kumar",
      "occupancy": { "adults": 1, "children": 0 },
      "prices": [
        { "date": "2026-08-01", "sellRate": 5000.00 },
        { "date": "2026-08-02", "sellRate": 5000.00 },
        { "date": "2026-08-03", "sellRate": 5000.00 }
      ]
    }
  ]
}
```

**Success response:** `200 OK`
```json
{ "success": true, "message": "Reservation Modified Successfully" }
```

---

### 3.3 Cancel Reservation (`action: "cancel"`)

```json
{
  "action": "cancel",
  "hotelCode": "sandbox-pms",
  "channel": "Booking.com",
  "bookingId": "BK-20260801-001"
}
```

**Success response:** `200 OK`
```json
{ "success": true, "message": "Reservation Cancelled Successfully" }
```

---

### 3.4 Error Responses

| HTTP Status | Scenario | Example Response |
|-------------|----------|-----------------|
| `400` | Missing required fields | `{ "success": false, "message": "action, hotelCode and bookingId are required" }` |
| `400` | Invalid JSON body | `{ "success": false, "message": "Invalid JSON body" }` |
| `400` | Unknown action | `{ "success": false, "message": "Unknown action 'invalid_action'" }` |
| `401` | Invalid or missing Basic Auth | `{ "success": false, "message": "Unauthorized" }` |
| `404` | Unknown hotelCode | `{ "success": false, "message": "Unknown hotelCode 'unknown-hotel'" }` |
| `405` | Wrong HTTP method | `{ "success": false, "message": "Method not allowed" }` |
| `500` | Internal processing error | `{ "success": false, "message": "Processing failed", "detail": "..." }` |

---

## 4. Inventory Webhook (Aiosell → Triplooper)

Aiosell pushes room availability updates to this endpoint.

### 4.1 Plain Inventory Push

**Endpoint URL:** `https://triplooper.com/api/webhooks/aiosell/inventory`
**Method:** `POST`

**Payload:**
```json
{
  "hotelCode": "sandbox-pms",
  "updates": [
    {
      "startDate": "2026-08-01",
      "endDate": "2026-08-05",
      "rooms": [
        { "available": 10, "roomCode": "executive" },
        { "available": 3,  "roomCode": "suite" }
      ]
    }
  ]
}
```

**Success response:** `200 OK`
```json
{ "success": true, "message": "Inventory Updated Successfully" }
```

---

### 4.2 Inventory + Restrictions Push

**Endpoint URL:** `https://triplooper.com/api/webhooks/aiosell/inventory-restrictions`
**Method:** `POST`

**Payload:**
```json
{
  "hotelCode": "sandbox-pms",
  "updates": [
    {
      "startDate": "2026-08-01",
      "endDate": "2026-08-05",
      "rooms": [
        {
          "available": 10,
          "roomCode": "executive",
          "restrictions": {
            "stopSell": false,
            "minimumStay": 1,
            "maximumStay": null,
            "closeOnArrival": false,
            "closeOnDeparture": false,
            "minimumStayArrival": null,
            "maximumStayArrival": null,
            "exactStayArrival": null,
            "minimumAdvanceReservation": null,
            "maximumAdvanceReservation": null
          }
        },
        {
          "available": 3,
          "roomCode": "suite",
          "restrictions": {
            "stopSell": false,
            "minimumStay": 2,
            "maximumStay": 7,
            "closeOnArrival": false,
            "closeOnDeparture": false,
            "minimumStayArrival": null,
            "maximumStayArrival": null,
            "exactStayArrival": null,
            "minimumAdvanceReservation": 1,
            "maximumAdvanceReservation": 90
          }
        }
      ]
    }
  ]
}
```

**Success response:** `200 OK`
```json
{ "success": true, "message": "Inventory Updated Successfully" }
```

**Note:** Restrictions with `null` values will be stored as-is. Only provide non-null values for restrictions you wish to set.

---

## 5. Rates Webhook (Aiosell → Triplooper)

Aiosell pushes rate updates to this endpoint.

### 5.1 Plain Rate Push

**Endpoint URL:** `https://triplooper.com/api/webhooks/aiosell/rates`
**Method:** `POST`

**Payload:**
```json
{
  "hotelCode": "sandbox-pms",
  "updates": [
    {
      "startDate": "2026-08-01",
      "endDate": "2026-08-05",
      "rates": [
        { "roomCode": "executive", "rateplanCode": "executive-s-ep", "rate": 5000 },
        { "roomCode": "executive", "rateplanCode": "executive-d-ep", "rate": 6000 },
        { "roomCode": "executive", "rateplanCode": "executive-s-cp", "rate": 7000 },
        { "roomCode": "executive", "rateplanCode": "executive-d-cp", "rate": 8000 },
        { "roomCode": "suite",     "rateplanCode": "suite-s-ep",      "rate": 8000 },
        { "roomCode": "suite",     "rateplanCode": "suite-d-ep",      "rate": 10000 },
        { "roomCode": "suite",     "rateplanCode": "suite-s-cp",     "rate": 11000 },
        { "roomCode": "suite",     "rateplanCode": "suite-d-cp",     "rate": 12000 }
      ]
    }
  ]
}
```

**Success response:** `200 OK`
```json
{ "success": true, "message": "Rates Updated Successfully" }
```

---

### 5.2 Rates + Restrictions Push

**Endpoint URL:** `https://triplooper.com/api/webhooks/aiosell/rates-restrictions`
**Method:** `POST`

**Payload:**
```json
{
  "hotelCode": "sandbox-pms",
  "updates": [
    {
      "startDate": "2026-08-01",
      "endDate": "2026-08-05",
      "rates": [
        {
          "roomCode": "executive",
          "rateplanCode": "executive-s-ep",
          "rate": 5000,
          "restrictions": {
            "stopSell": false,
            "minimumStay": 1,
            "maximumStay": null,
            "closeOnArrival": false,
            "closeOnDeparture": false,
            "minimumStayArrival": null,
            "maximumStayArrival": null,
            "exactStayArrival": null,
            "minimumAdvanceReservation": null,
            "maximumAdvanceReservation": null
          }
        }
      ]
    }
  ]
}
```

**Success response:** `200 OK`
```json
{ "success": true, "message": "Rates Updated Successfully" }
```

---

## 6. Room & Rate Plan Mapping

Based on the Aiosell sandbox property (`sandbox-pms`), the following room types and rate plans are configured:

### 6.1 Room Types

| Room Code | Room Name | Total Units | Min Occ | Max Occ |
|-----------|-----------|-------------|---------|---------|
| `executive` | EXECUTIVE | 25 | 1 | 2 |
| `suite` | SUITE | 5 | 1 | 3 |

### 6.2 Rate Plans

| Room Code | Rate Plan Code | Occupancy | Meal Plan | Description | Extra Adult |
|-----------|---------------|-----------|-----------|-------------|-------------|
| `executive` | `executive-s-ep` | Single (1) | EP | Room Only | ₹500 |
| `executive` | `executive-d-ep` | Double (2) | EP | Room Only | ₹500 |
| `executive` | `executive-s-cp` | Single (1) | CP | Breakfast Included | ₹500 |
| `executive` | `executive-d-cp` | Double (2) | CP | Breakfast Included | ₹500 |
| `suite` | `suite-s-ep` | Single (1) | EP | Room Only | ₹500 |
| `suite` | `suite-d-ep` | Double (2) | EP | Room Only | ₹500 |
| `suite` | `suite-s-cp` | Single (1) | CP | Breakfast Included | ₹500 |
| `suite` | `suite-d-cp` | Double (2) | CP | Breakfast Included | ₹500 |

### 6.3 Naming Convention

Rate plan codes follow this format: `{room_code}-{occupancy}-{mealplan}`

**Occupancy letters:**
| Letter | Meaning |
|--------|---------|
| `s` | Single |
| `d` | Double |
| `t` | Triple |
| `q` | Quad |

**Meal plan codes:**
| Code | Name | Includes |
|------|------|----------|
| `EP` | European Plan | Room only, no meals |
| `CP` | Continental Plan | Room + breakfast |
| `MAP` | Modified American Plan | Room + breakfast + one more meal (half board) |
| `AP` | American Plan | Room + all three meals (full board) |

---

## 7. Environment Summary

### 7.1 Sandbox (Testing)

| Parameter | Value |
|-----------|-------|
| Aiosell Base URL | `https://live.aiosell.com/api/v2/cm` |
| Hotel Code | `sandbox-pms` |
| Partner ID (PMS) | `sample-pms` |
| Triplooper Webhook Base | `https://triplooper.com/api/webhooks/aiosell` |

### 7.2 Production (Go-Live)

| Parameter | Value |
|-----------|-------|
| Aiosell Base URL | `https://live.aiosell.com/api/v2/cm` |
| Hotel Code | *(per property, provided by Triplooper)* |
| Partner ID (PMS) | *(issued by Aiosell at onboarding)* |
| Triplooper Webhook Base | `https://triplooper.com/api/webhooks/aiosell` |

---

*End of document. For questions, contact Triplooper at admin@triplooper.com*
