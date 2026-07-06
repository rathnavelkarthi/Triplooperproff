# Triplooper Master QA Testing Manual

This document is a comprehensive manual testing guide for the entire Triplooper platform. The tester should execute each test case step-by-step and record the **PASS/FAIL** status along with any comments.

---

## 🔑 Tester Roles & Credentials Setup
Before beginning, ensure you have:
1. **Platform Admin Account:** Access to `triplooper.com/admin/platform` (e.g. `admin@triplooper.com`).
2. **Property Owner Account:** Access to a property portal (e.g. `Aniya Residency` or `ARFU NEST`).
3. **Staff/Receptionist Account:** Created via the property portal.
4. **Driver Partner Account:** Access to the driver registration/login flow.
5. **Guest Session:** Created via a reservation token link.

---

## 📊 Section 1: Platform Admin Dashboard (`/admin/platform`)

### TC 1.1: Business Invites Workflow
* **Steps:**
  1. Click **New Invite** on the "Business Invites" panel.
  2. Input a test email, business name (e.g., "QA test resort"), max properties = `3`, and max rooms = `20`.
  3. Click **Send Invite**.
  4. Verify the invite appears in the list as `pending`.
  5. Click the **Copy Link** button and paste it into a new incognito window.
  6. Click **Delete Invite** on a pending invite to verify cancellation works.
* **Pass/Fail:** `[  ]`
* **Comments:**

### TC 1.2: Interactive Property List & Stats
* **Steps:**
  1. Verify the summary stats cards at the top show correct counts: **Total Properties**, **Platform Bookings**, **Active Businesses**, and **Pending Invites**.
  2. Locate a property card (e.g., "ARFU NEST"). Click on the card to expand it.
  3. Verify that the daily revenue, monthly revenue, daily commission (12%), and monthly commission (12%) calculations are computed and displayed.
* **Pass/Fail:** `[  ]`
* **Comments:**

### TC 1.3: Document checklist, View & Download
* **Steps:**
  1. Expand a pending property card.
  2. Review the **Verification & Documents** status card.
  3. Verify that uploaded documents show a green `Uploaded` badge with **View** and **Download** buttons.
  4. Click **View** on a document. Verify it opens the file securely in a new browser tab.
  5. Click **Download**. Verify it downloads to your local machine with the original filename.
* **Pass/Fail:** `[  ]`
* **Comments:**

### TC 1.4: Owner Contact Inline Email Edit
* **Steps:**
  1. Locate the **Owner Contact** text at the bottom right of the expanded property card.
  2. If the email contains a Clerk user ID instead of a valid email address (e.g. `user_...`), verify that a red flashing warning `(Invalid email! Please edit to send notices)` is visible.
  3. Click the small **Pencil** edit icon next to the email.
  4. Input an invalid email (like `test-email`) and click **Save**. Verify it blocks and triggers an error toast.
  5. Input a valid email (like `tester@triplooper.com`) and click **Save**.
  6. Verify the warning disappears and the database is updated.
* **Pass/Fail:** `[  ]`
* **Comments:**

### TC 1.5: Verification Decisions & Resend Notices
* **Steps:**
  1. Click **Send Email Notice** on any property card.
  2. Enter a custom subject and body message in the inline form, then click **Send Custom Email**. Verify success toast.
  3. Click **Reject & Request Fix** on a pending property.
  4. Input a custom rejection reason and click **Reject Property**. Verify the property status badge changes to `Rejected` and a notification email is dispatched.
  5. Click **Approve Property**. Verify the status changes to `Approved` and a welcome/approval email is sent.
* **Pass/Fail:** `[  ]`
* **Comments:**

### TC 1.6: Driver Verification & List Management
* **Steps:**
  1. Click the **Drivers** tab on the Platform Admin panel.
  2. Expand a pending driver profile.
  3. Click **Approve Driver** or **Reject Driver**.
  4. Verify the driver's status badge updates instantly.
* **Pass/Fail:** `[  ]`
* **Comments:**

---

## 🏨 Section 2: Property Portal (PMS & CRM Dashboard)

### TC 2.1: Verification Redirection Gate
* **Steps:**
  1. Log in as a property owner whose verification status is `pending` or `rejected`.
  2. Attempt to click sidebar links to access rooms, reservations, or settings.
* **Expected Result:**
  - You are strictly locked and redirected to `/admin/verification`.
  - You can upload files in the Trade Authorization and Complaints Proof slots.
  - You are only unlocked once the Platform Admin changes your status to `Approved`.
* **Pass/Fail:** `[  ]`
* **Comments:**

### TC 2.2: Room Inventory Management
* **Steps:**
  1. Navigate to the **Rooms** section.
  2. Click **Add Room**. Fill in room number, room type, description, amenities, and price. Click **Save**.
  3. On any room card, toggle the Status dropdown: change status from `Available` to `Cleaning` or `Maintenance`.
  4. Verify the status indicator updates color (Available: Green, Cleaning: Orange, Maintenance: Red).
* **Pass/Fail:** `[  ]`
* **Comments:**

### TC 2.3: Booking Engine & Invoicing
* **Steps:**
  1. Navigate to the **Reservations** section.
  2. Click **Create Booking**. Input guest name, phone, email, check-in/check-out dates, selected room, and total amount. Click **Book**.
  3. Click on the newly created reservation to view its details.
  4. Click **Generate Invoice / Receipt**. Verify it opens a clean, printable PDF receipt showing guest details, room pricing, and GST breakdowns.
  5. Click **Check Out** on an active guest reservation. Verify the room availability status changes back to `Available`.
* **Pass/Fail:** `[  ]`
* **Comments:**

### TC 2.4: Interactive Calendar & Timeline
* **Steps:**
  1. Navigate to the **Calendar View** page.
  2. Verify that all rooms are listed on the Y-axis and dates are on the X-axis.
  3. Check if active reservations appear as horizontal color-coded bars across their booked dates.
  4. Click on a reservation bar to verify it opens the reservation details modal.
* **Pass/Fail:** `[  ]`
* **Comments:**

### TC 2.5: Guest Service Requests
* **Steps:**
  1. Navigate to the **Service Requests** panel.
  2. Verify you can view requests sent by guests (e.g. Room Cleaning, Towels, Room Service).
  3. Select a staff member to assign the task, change the priority to **High**, and set the status to **In Progress** or **Completed**.
* **Pass/Fail:** `[  ]`
* **Comments:**

---

## 📱 Section 3: Guest Portal (Mobile-First Experience)

### TC 3.1: Tokenized Guest Access
* **Steps:**
  1. Copy the guest session link/token URL from the active reservation page.
  2. Open the link in a mobile viewport or phone browser.
  3. Verify that the guest lands on their dedicated portal showing their name, room number, and check-out date without requiring a standard username/password login.
* **Pass/Fail:** `[  ]`
* **Comments:**

### TC 3.2: Digital Room Service & Food Ordering
* **Steps:**
  1. Navigate to the **Food Service** page in the Guest Portal.
  2. Browse menu categories (Starters, Main Course, Drinks).
  3. Select items, specify quantities, and add them to the cart.
  4. Open the cart and click **Place Order**.
  5. Go to the Property Admin Portal → Restaurant/Service Requests section. Verify that the order appears in real-time with the correct room number and items.
* **Pass/Fail:** `[  ]`
* **Comments:**

### TC 3.3: Feedback & Testimonials Submission
* **Steps:**
  1. Navigate to the **Feedback** tab in the Guest Portal.
  2. Rate the stay (1-5 stars) and enter comments. Click **Submit**.
  3. Verify the feedback is logged and appears under the property's public website testimonials section.
* **Pass/Fail:** `[  ]`
* **Comments:**

---

## 🚗 Section 4: Driver Portal & Tourist Attractions CMS

### TC 4.1: Driver Portal Registration & Login
* **Steps:**
  1. Open the Driver Portal signup page `/driver/register`.
  2. Fill in the driver registration form: Name, Phone, Vehicle Number, Vehicle Type (e.g., Sedan, SUV), and Licence Number. Click **Register**.
  3. Log out and log back in via `/driver/login` using the registered credentials.
  4. Toggle the online/offline toggle in the Driver Dashboard. Verify status changes.
* **Pass/Fail:** `[  ]`
* **Comments:**

### TC 4.2: Nearby Attractions Manager
* **Steps:**
  1. Log in as a Property Owner or Platform Admin.
  2. Navigate to **Nearby Attractions** or **CMS settings**.
  3. Click **Add Attraction**. Enter Name, Description, Distance from hotel (in km), and upload an image. Click **Save**.
  4. Log in to the Guest Portal for that property.
  5. Navigate to **Local Guide / Nearby Attractions**.
  6. Verify that the newly added attraction displays correctly with its distance, description, and photo.
* **Pass/Fail:** `[  ]`
* **Comments:**
