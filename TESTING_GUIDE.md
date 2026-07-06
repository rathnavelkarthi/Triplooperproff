# QA Testing Guide: Property Verification & Platform Admin Features

This guide details the test cases for verifying the new **Property Verification Gating**, **Inline Document Review**, and **Email Notification Systems**.

---

## Part 1: Owner Verification Portal & Gating

### Test Case 1.1: Verification Gate Redirection
1. **Prerequisite:** Create or log into a Property Owner account whose property has `verification_status = 'pending'` or `'rejected'`.
2. **Steps:**
   - Log in via `/admin/login`.
   - Attempt to navigate to `/admin/dashboard`, `/admin/rooms`, or any other business route.
3. **Expected Result:**
   - The owner is blocked and automatically redirected to `/admin/verification`.
   - The main sidebar and dashboard content are inaccessible.

### Test Case 1.2: Document Upload Flow
1. **Prerequisite:** Owner is on `/admin/verification`.
2. **Steps:**
   - Click "Upload" for **Government Trade Authorization** and select a PDF or image.
   - Click "Upload" for **Government Complaints Proof** and select a file.
3. **Expected Result:**
   - Upload indicators show success.
   - Files are stored securely in the Supabase private bucket `property-documents` under paths matching `[tenant_id]/[document_type].[extension]`.
   - The status updates dynamically to show uploaded filenames.

---

## Part 2: Platform Admin Dashboard

### Test Case 2.1: Granular Status Badges
1. **Prerequisite:** Log into a Platform Admin account (e.g. `admin@triplooper.com`) and navigate to `/admin/platform`.
2. **Steps:**
   - Scan the list of properties in the "Properties & Stays" card.
3. **Expected Result:**
   - Properties are marked with correct statuses:
     - `Approved` (green) for verified properties.
     - `Rejected` (red) for rejected properties.
     - `Pending - Review Ready` (amber) if BOTH Trade Auth and Complaints Proof are uploaded.
     - `Pending - Uploads Missing` (gray) if any required documents are missing.

### Test Case 2.2: Document View & Download
1. **Prerequisite:** Expand a property card that has uploaded documents.
2. **Steps:**
   - Click **View** on the "Trade Authorization" or "Complaints Proof" slot.
   - Click **Download** on the same slot.
3. **Expected Result:**
   - Clicking **View** opens a secure, time-limited signed URL (`supabase.storage.createSignedUrl`) of the document in a new tab.
   - Clicking **Download** triggers an automatic file download using the file's original saved filename.

### Test Case 2.3: Inline Owner Email Editing (Tier 1 Fix)
1. **Prerequisite:** Expand a property card showing a Clerk ID fallback (e.g. `user_...` containing no `@` character) as its contact email.
2. **Steps:**
   - Verify that the contact reads `Owner Contact: user_... (Invalid email! Please edit to send notices)` in red text.
   - Click the small **Pencil** icon next to the email.
   - Enter an invalid email (e.g., `not-an-email`) and click **Save**. Verify that it blocks saving.
   - Enter a valid email address (e.g., `owner@example.com`) and click **Save**.
3. **Expected Result:**
   - The database table `tenants` is updated (setting `custom_email = 'owner@example.com'`).
   - The dashboard updates immediately showing the updated contact in normal text: `Owner Contact: owner@example.com`.

---

## Part 3: Email Notice Dispatching

### Test Case 3.1: Approve Property Notification
1. **Prerequisite:** A property is in a pending state with a valid email.
2. **Steps:**
   - Expand the property card on `/admin/platform`.
   - Click the **Approve Property** button.
3. **Expected Result:**
   - The property's database status updates to `approved`.
   - The backend `verify-property` Edge Function triggers, updating the database status, sending WhatsApp notifications (if enabled), and returning user metadata.
   - The client triggers Resend to dispatch a beautifully branded **Verification Approved** email to the owner.

### Test Case 3.2: Reject & Request Fix Form
1. **Prerequisite:** A property is in a pending state.
2. **Steps:**
   - Click **Reject & Request Fix**.
   - Review or modify the pre-filled rejection reasons in the textarea.
   - Click **Reject Property**.
3. **Expected Result:**
   - The status updates to `rejected` in the database.
   - A branded **Verification Rejected** email containing the custom reason is sent to the owner.
   - The owner is redirected back to `/admin/verification` when they log in to re-upload documents.

### Test Case 3.3: Compose Custom Email Notice
1. **Prerequisite:** Expand any property card.
2. **Steps:**
   - Click **Send Email Notice**.
   - Input a custom subject and body text.
   - Click **Send Custom Email**.
3. **Expected Result:**
   - The local/Vercel serverless proxy `/api/send-email` executes the request.
   - Resend delivers a custom email wrapped inside the premium Triplooper email template layout.
