import { jsPDF } from "jspdf";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── Color Palette ──────────────────────────────────────────────
const C = {
  primary: [14, 42, 56] as [number, number, number],       // #0E2A38
  primaryLight: [22, 78, 99] as [number, number, number],   // #164E63
  accent: [192, 132, 68] as [number, number, number],       // #C08444 (gold)
  accentLight: [245, 205, 150] as [number, number, number],
  bg: [250, 249, 246] as [number, number, number],          // #FAF9F6
  card: [255, 255, 255] as [number, number, number],
  border: [228, 228, 231] as [number, number, number],      // #E4E4E7
  textDark: [24, 24, 27] as [number, number, number],       // #18181b
  textMedium: [82, 82, 91] as [number, number, number],     // #52525b
  textLight: [161, 161, 170] as [number, number, number],   // #a1a1aa
  green: [5, 150, 105] as [number, number, number],
  red: [225, 29, 72] as [number, number, number],
  blue: [37, 99, 235] as [number, number, number],
  orange: [234, 88, 12] as [number, number, number],
  goldBg: [254, 249, 224] as [number, number, number],
};

// ─── Page settings ──────────────────────────────────────────────
const PAGE_W = 210; // A4 width in mm
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - 2 * MARGIN;

let doc: jsPDF;
let yPos = 0;

function addPage() {
  doc.addPage();
  yPos = MARGIN;
  // Page header line
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 12, PAGE_W - MARGIN, 12);
  doc.setFontSize(7);
  doc.setTextColor(...C.textLight);
  doc.text("TRIPLOOPER — Complete Application Documentation", PAGE_W - MARGIN, 10, { align: "right" });
  doc.setFontSize(7);
  doc.text(`Page ${doc.getNumberOfPages()}`, MARGIN, 10);
  yPos = 20;
}

function checkPage(needed: number) {
  if (yPos + needed > PAGE_H - 25) addPage();
}

// ─── Section Header ─────────────────────────────────────────────
function sectionHeader(title: string, icon?: string) {
  checkPage(16);
  const prevY = yPos;
  // Left accent bar
  doc.setFillColor(...C.accent);
  doc.rect(MARGIN, yPos, 3, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...C.primary);
  doc.text(icon ? `${icon}  ${title}` : title, MARGIN + 8, yPos + 8);
  yPos += 14;
  // Thin separator
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, yPos, PAGE_W - MARGIN, yPos);
  yPos += 6;
}

function subSectionHeader(title: string) {
  checkPage(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.primaryLight);
  doc.text(title, MARGIN + 2, yPos + 5);
  yPos += 10;
}

function subSubHeader(title: string) {
  checkPage(8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.textDark);
  doc.text(title, MARGIN + 6, yPos + 4);
  yPos += 8;
}

function bodyText(text: string, indent = 0, color?: [number, number, number]) {
  checkPage(6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...(color || C.textMedium));
  const lines = doc.splitTextToSize(text, CONTENT_W - indent - 8);
  doc.text(lines, MARGIN + 6 + indent, yPos + 3);
  yPos += lines.length * 4.5 + 2;
}

function bullet(text: string, indent = 6) {
  checkPage(5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.textDark);
  doc.circle(MARGIN + 6 + indent, yPos + 1, 0.6, "F");
  const lines = doc.splitTextToSize(text, CONTENT_W - indent - 16);
  doc.text(lines, MARGIN + 12 + indent, yPos + 3);
  yPos += lines.length * 4.5 + 1.5;
}

function featureCard(title: string, desc: string) {
  checkPage(16);
  const cardY = yPos;
  const cardH = 14;
  // Card background
  doc.setFillColor(...C.card);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN + 4, cardY, CONTENT_W - 8, cardH, 1.5, 1.5, "FD");
  // Left accent dot
  doc.setFillColor(...C.accent);
  doc.circle(MARGIN + 10, cardY + 7, 1.5, "F");
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...C.primary);
  doc.text(title, MARGIN + 15, cardY + 5);
  // Description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.textMedium);
  const descLines = doc.splitTextToSize(desc, CONTENT_W - 30);
  doc.text(descLines, MARGIN + 15, cardY + 9);
  yPos = cardY + cardH + 3;
}

function infoBox(text: string, color: [number, number, number], bgColor: [number, number, number]) {
  checkPage(10);
  const boxY = yPos;
  doc.setFillColor(...bgColor);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN + 6, boxY, CONTENT_W - 12, 10, 1, 1, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, CONTENT_W - 28);
  doc.text(lines, MARGIN + 12, boxY + 4);
  yPos = boxY + 10 + (lines.length > 1 ? 3 : 0);
}

function spacer(h = 3) {
  yPos += h;
}

// ═════════════════════════════════════════════════════════════════
// MAIN PDF GENERATION
// ═════════════════════════════════════════════════════════════════

async function generatePDF() {
  doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // ═══ COVER PAGE ═══════════════════════════════════════════════
  yPos = MARGIN;

  // Full background
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Decorative gold line
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 160, PAGE_W - MARGIN, 160);

  // Logo / Brand
  doc.setFont("helvetica", "normal");
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text("TRIPLOOPER", PAGE_W / 2, 120, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...C.accent);
  doc.text("Premium Property Management System", PAGE_W / 2, 135, { align: "center" });

  // Decorative gold line
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 145, PAGE_W - MARGIN, 145);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("COMPLETE APPLICATION", PAGE_W / 2, 185, { align: "center" });
  doc.text("FEATURES DOCUMENTATION", PAGE_W / 2, 205, { align: "center" });

  // Gold ornament
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.accentLight);
  doc.text("✦  ✦  ✦", PAGE_W / 2, 225, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.textLight);
  doc.text("Comprehensive feature catalog covering all user perspectives", PAGE_W / 2, 245, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.textLight);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, PAGE_W / 2, 258, { align: "center" });

  // ═══ TABLE OF CONTENTS ════════════════════════════════════════
  addPage();
  sectionHeader("Table of Contents", "📋");

  const tocItems = [
    ["1.", "Platform Overview", "What Triplooper is and its core architecture"],
    ["2.", "Property Owner Dashboard (CRM)", "Complete admin panel — 25+ modules"],
    ["3.", "Guest Portal & Booking Experience", "All guest-facing features"],
    ["4.", "Multi-Property Business Module", "Group management & reseller platform"],
    ["5.", "Super Admin / Platform Admin", "Platform-level governance tools"],
    ["6.", "Public Website & Marketing", "Landing pages, pricing, SaaS site"],
    ["7.", "Email & Notification System", "Transactional emails & automated triggers"],
    ["8.", "WhatsApp Integration", "Guest communication via Evolution API"],
    ["9.", "Payment Processing (Razorpay)", "Subscription & addon billing"],
    ["10.", "Database Schema & Edge Functions", "Supabase backend architecture"],
  ];

  for (const [num, title, desc] of tocItems) {
    checkPage(7);
    doc.setFillColor(...C.accent);
    doc.circle(MARGIN + 4, yPos + 2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.primary);
    doc.text(`${num}  ${title}`, MARGIN + 10, yPos + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.textMedium);
    doc.text(desc, MARGIN + 10, yPos + 9);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.1);
    doc.line(MARGIN + 10, yPos + 12, PAGE_W - MARGIN, yPos + 12);
    yPos += 14;
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 1: PLATFORM OVERVIEW
  // ══════════════════════════════════════════════════════════════
  addPage();
  sectionHeader("1. Platform Overview", "🏨");

  bodyText("Triplooper (formerly HospitalityOS / Ganesh Residency) is a comprehensive property management system designed for hotels, resorts, and restaurants. It combines a direct-booking public website with a full-featured internal CRM, guest self-service portal, multi-property business management, and platform administration tools.");
  spacer(4);

  subSectionHeader("Architecture");
  bullet("Frontend: React 19 with Vite build tool, TypeScript throughout");
  bullet("Styling: Tailwind CSS 4.0 with utility-first responsive design");
  bullet("Authentication: Clerk (primary) with Supabase Auth fallback for staff");
  bullet("Backend/Database: Supabase (PostgreSQL) with Row-Level Security");
  bullet("Serverless Edge Functions: Supabase Edge Functions (Deno) for WhatsApp, Staff creation");
  bullet("Payments: Razorpay integration for subscriptions and add-ons");
  bullet("Email: Resend API with React Email templates");
  bullet("Charts: Recharts for data visualization");
  bullet("Animations: Motion (Framer Motion) for smooth transitions");

  spacer(4);
  subSectionHeader("User Roles");
  const roles = [
    ["PLATFORM_ADMIN", "System-wide super admin — full access to all tenants and businesses"],
    ["SUPER_ADMIN", "Property owner — full access to a single property's CRM"],
    ["BUSINESS_ADMIN", "Multi-property operator — manages multiple properties under a business entity"],
    ["MANAGER", "Hotel manager — daily operations, reservations, staffing"],
    ["RECEPTION", "Front desk — check-in/out, room assignment, guest management"],
    ["HOUSEKEEPING", "Housekeeping staff — room status, cleaning schedules"],
    ["ACCOUNTANT", "Finance — revenue reports, GST, invoices, expenses"],
    ["SERVER", "Restaurant staff — POS, food orders, table management"],
  ];
  for (const [role, desc] of roles) {
    checkPage(6);
    doc.setFillColor(...C.primaryLight);
    doc.roundedRect(MARGIN + 6, yPos, 40, 5, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(role, MARGIN + 6, yPos + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.textDark);
    const descLines = doc.splitTextToSize(desc, CONTENT_W - 60);
    doc.text(descLines, MARGIN + 52, yPos + 3);
    yPos += 7;
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 2: PROPERTY OWNER DASHBOARD (CRM)
  // ══════════════════════════════════════════════════════════════
  addPage();
  sectionHeader("2. Property Owner Dashboard (CRM)", "📊");
  bodyText("The CRM is the core of Triplooper — a comprehensive admin panel for managing every aspect of a hospitality property. It includes 25+ modules accessible through a sidebar navigation system with role-based access control.");

  // 2.1 Dashboard
  subSectionHeader("2.1 Dashboard");
  featureCard("Analytics Overview", "Revenue metrics, occupancy percentage, booking trends, and quick stats at a glance");
  featureCard("Occupancy Chart", "Visual occupancy rate chart using Recharts for tracking booking levels over time");
  featureCard("Revenue Chart", "Daily/weekly/monthly revenue visualization with trend indicators");
  featureCard("Quick Actions", "Shortcut buttons for common tasks: new booking, check-in, check-out");
  featureCard("Today's Overview", "Check-ins today, check-outs today, current occupancy, pending tasks");

  // 2.2 Reservations
  addPage();
  subSectionHeader("2.2 Reservations");
  featureCard("Reservation List", "Searchable, filterable table of all reservations with status, dates, guest info, and amounts");
  featureCard("Create Booking", "Manual booking creation form — room selection, dates, guest details, pricing");
  featureCard("Check-in / Check-out", "One-click status changes with automatic email notifications to guests");
  featureCard("Modify Reservation", "Edit dates, room assignment, guest details, and pricing on existing bookings");
  featureCard("Cancel Reservation", "Cancel bookings with optional email notification to the guest");
  featureCard("Booking Modal", "Full-screen modal for viewing and editing all reservation details");
  featureCard("Quick Checkout Modal", "Streamlined checkout flow — preview bill, add charges, process payment");

  // 2.3 Calendar
  subSectionHeader("2.3 Calendar");
  featureCard("Visual Calendar Grid", "Month/week/day view showing all room bookings and availability");
  featureCard("Room Status Colors", "Color-coded slots: green (available), red (booked), yellow (check-in/out), gray (maintenance)");
  featureCard("Click to Book", "Click on an empty slot to quickly create a new reservation");
  featureCard("Drag to Modify", "Drag reservations to modify dates visually");

  // 2.4 Guests
  subSectionHeader("2.4 Guests");
  featureCard("Guest Directory", "Searchable database of all guest profiles with booking history");
  featureCard("Guest Profile", "Detailed profile: contact info, stay history, preferences, special requests");
  featureCard("Aadhaar Integration", "Upload and process Aadhaar cards for guest verification (OCR extraction of name, DOB, address)");
  featureCard("Guest History", "Complete history of all stays, total spent, preferences, and feedback");

  // 2.5 Rooms
  addPage();
  subSectionHeader("2.5 Rooms");
  featureCard("Room Management", "CRUD operations for all room types and individual rooms");
  featureCard("Room Configuration", "Room name, type (Executive, Triple, Four-Occupancy, Six-Bed), base price, amenities, images");
  featureCard("Availability Toggle", "Mark rooms as available, occupied, or under maintenance");
  featureCard("Room Status Dashboard", "Visual grid showing current status of every room in the property");

  // 2.6 Restaurant & F&B
  subSectionHeader("2.6 Restaurant & F&B Management");
  featureCard("Restaurant Dashboard", "Overview of restaurant operations — active orders, table occupancy, daily revenue");
  featureCard("Menu Manager", "Create and manage menu items with categories, prices, descriptions, images, and availability");
  featureCard("Point of Sale (POS)", "Full POS system — add items to cart, apply discounts, split bills, process payments");
  featureCard("Food Orders", "Real-time order tracking from placement to fulfillment with status updates");
  featureCard("Table Management", "Visual table layout — assign tables, merge/split, track occupancy and reservations");
  featureCard("Server Orders", "Server-side ordering system — waitstaff can place orders directly from guest tables");
  featureCard("Food Inventory", "Track ingredient and supply inventory levels, low stock alerts, usage reports");

  // 2.7 Financials
  subSectionHeader("2.7 Financial Management");
  featureCard("Payments", "Complete payment history — track all transactions, payment methods, and statuses");
  featureCard("Invoices", "Generate GST-compliant invoices with PDF export for guest billing");
  featureCard("Expenses Tracking", "Categorize and track operational expenses — utilities, supplies, maintenance, payroll");
  featureCard("Profit & Loss Statement", "Automated P&L reports comparing revenue vs expenses with date range filters");
  featureCard("Reports", "Comprehensive reporting: occupancy reports, revenue analysis, booking source breakdown, financial summaries");

  // 2.8 Operations
  addPage();
  subSectionHeader("2.8 Staff Management");
  featureCard("Staff Directory", "Complete staff list with roles, contact info, status, and schedules");
  featureCard("Add Staff", "Create staff accounts with role-based permissions — sends login credentials via email");
  featureCard("Role Assignment", "Assign roles: MANAGER, RECEPTION, HOUSEKEEPING, ACCOUNTANT, SERVER");
  featureCard("Staff Status", "Track staff availability — ACTIVE, ON_LEAVE, INACTIVE");

  subSectionHeader("2.9 Service & Maintenance");
  featureCard("Service Requests", "Guest service request management — housekeeping, maintenance, concierge requests with status tracking");
  featureCard("Room Service", "Log and track room service requests with priority levels and assignment");

  // 2.10 Channel Manager
  subSectionHeader("2.10 Channel Manager (OTA Sync)");
  featureCard("Channel Connections", "Connect and manage OTA channels (Booking.com, Agoda, MakeMyTrip)");
  featureCard("Inventory Sync", "Sync room availability across all connected channels in real-time");
  featureCard("Rate Sync", "Sync pricing rules across channels — avoid overbooking and rate discrepancies");
  featureCard("Sync Logs", "Audit trail of all channel sync operations with success/error status");

  // 2.11 Website & Content
  subSectionHeader("2.11 Website & Content Management");
  featureCard("Website Editor", "Edit public website content — hero section, about text, contact info");
  featureCard("Rooms CMS", "Manage room descriptions, images, amenities displayed on the public site");
  featureCard("Landing CMS", "Configure landing page content — testimonials, features, call-to-action sections");

  // 2.12 Settings & Configuration
  addPage();
  subSectionHeader("2.12 Settings & Configuration");
  featureCard("Booking Settings", "Configure booking rules — minimum nights, maximum guests, cancellation policy, advance booking window");
  featureCard("Pricing Rules", "Dynamic pricing engine — seasonal rates, occupancy-based pricing (upsell/downsell), weekend/holiday pricing");
  featureCard("WhatsApp Settings", "Connect WhatsApp via Evolution API — QR code pairing, message templates, auto-confirmation messages");
  featureCard("Billing / Subscription", "View current plan, upgrade/downgrade subscriptions, manage add-ons (extra rooms, WhatsApp pack, custom domain, OTA sync, priority support, analytics)");
  featureCard("Feature Toggles", "Per-property enable/disable of CRM modules (dashboard, reservations, payments, POS, etc.)");

  // ══════════════════════════════════════════════════════════════
  // SECTION 3: GUEST PORTAL & BOOKING EXPERIENCE
  // ══════════════════════════════════════════════════════════════
  addPage();
  sectionHeader("3. Guest Portal & Booking Experience", "👤");
  bodyText("Triplooper provides a complete guest-facing experience — from browsing the property website to booking rooms and accessing a self-service portal during their stay.");

  subSectionHeader("3.1 Public Website & Booking Engine");
  featureCard("Premium Landing Page", "Immersive hero section with high-quality visuals, animated scroll storytelling, and destination magazine layout");
  featureCard("Room Catalog", "Detailed listings of room types with photos, amenities descriptions, and real-time pricing");
  featureCard("Amenities Showcase", "Interactive display of property amenities — pool, spa, restaurant, gym, beach access");
  featureCard("Experience Section", "Showcase local experiences, tours, and activities available to guests");
  featureCard("Explore Section", "Interactive map and guide to local attractions, restaurants, and points of interest");
  featureCard("Events Calendar", "Display upcoming events, festivals, and special offers at the property");
  featureCard("Photo Gallery", "Cinematic hero image gallery with immersive scroll effects");

  subSectionHeader("3.2 4-Step Booking Flow");
  featureCard("Step 1: Date & Room Selection", "Interactive date picker for check-in/check-out, room type browser with pricing, sticky booking summary sidebar");
  featureCard("Step 2: Guest Information", "Secure form for personal details, contact information, special requests, and room preferences");
  featureCard("Step 3: Payment", "Multiple payment options — Razorpay (cards, UPI, net banking), simulated checkout for testing");
  featureCard("Step 4: Confirmation", "Success screen with booking ID reference, invoice download, WhatsApp confirmation trigger");
  featureCard("Booking Progress Indicator", "4-step visual progress bar showing current stage in the booking process");
  featureCard("Floating Booking Bar", "Sticky booking bar that follows the user while scrolling on the property website");
  featureCard("Mobile Sticky Bar", "Mobile-optimized sticky booking CTA for small screens");

  // 3.3 Guest Self-Service Portal
  addPage();
  subSectionHeader("3.3 Guest Self-Service Portal");
  featureCard("Guest Portal Login", "Token-based access to personal portal — no password needed, secure magic link sent via WhatsApp/Email");
  featureCard("My Stay Dashboard", "Overview of current/upcoming stay — dates, room info, booking status");
  featureCard("Digital Bill", "View and download itemized bill for current stay — room charges, F&B, services, taxes");
  featureCard("Food Ordering", "In-room food ordering from the property's menu — browse categories, add to cart, place order");
  featureCard("Service Requests", "Request housekeeping, maintenance, concierge, or other services — track request status");
  featureCard("Guest Chat", "Real-time chat with front desk / hotel staff for instant communication during stay");

  subSectionHeader("3.4 Additional Guest Features");
  featureCard("Table Order (QR Code)", "Scan QR code at restaurant table to browse menu and place orders directly from phone");
  featureCard("Room Detail Page", "Dedicated page for each room type with full specifications, photos, and booking CTA");
  featureCard("Aadhaar Upload", "Upload Aadhaar card for contactless check-in — automated ID verification");
  featureCard("WhatsApp Notifications", "Booking confirmed, check-in instructions, checkout reminders via WhatsApp");

  // ══════════════════════════════════════════════════════════════
  // SECTION 4: MULTI-PROPERTY BUSINESS MODULE
  // ══════════════════════════════════════════════════════════════
  addPage();
  sectionHeader("4. Multi-Property Business Module", "🏢");
  bodyText("The Business Module allows an operator to manage multiple properties under a single business entity. This is designed for hotel groups, franchise operators, and resellers who need centralized management.");

  featureCard("Business Dashboard", "Overview of all properties under the business — total rooms, combined occupancy, aggregate revenue");
  featureCard("Property Management", "Add multiple properties — each gets its own subdomain, CRM, and public website");
  featureCard("Property Detail", "Individual property settings — plan, features, customization, staff access");
  featureCard("Business Invites", "Invite new operators via email with configurable limits (max properties, rooms per property)");
  featureCard("Reseller Platform", "Platform admin can create reseller accounts with customized capacity limits");
  featureCard("Centralized Analytics", "View combined analytics across all managed properties");

  // ══════════════════════════════════════════════════════════════
  // SECTION 5: SUPER ADMIN / PLATFORM ADMIN
  // ══════════════════════════════════════════════════════════════
  addPage();
  sectionHeader("5. Super Admin / Platform Admin", "⚙️");
  bodyText("The Platform Admin panel provides system-wide governance tools for the Triplooper platform operator. Access is restricted to configured platform admin email addresses.");

  featureCard("Platform Dashboard", "System-wide stats — total tenants, total businesses, active subscriptions, platform revenue");
  featureCard("Tenant Management", "View and manage all registered properties across the platform");
  featureCard("Business Management", "View all business entities, invite new operators, configure capacity limits");
  featureCard("User Management", "Monitor all users — owners, staff, and guests across the platform");
  featureCard("Plan Oversight", "View subscription status for all tenants, upgrade/downgrade remotely");
  featureCard("System Health", "Monitor API usage, storage, and edge function performance");
  featureCard("Platform Configuration", "Configure global settings, default plans, feature flags");

  spacer(4);
  infoBox("Note: Platform Admin access is restricted to pre-configured email addresses (rathnavelkarthi1@gmail.com, admin@triplooper.com) and bypasses normal role-based permissions.", C.blue, [239, 246, 255]);

  // ══════════════════════════════════════════════════════════════
  // SECTION 6: PUBLIC WEBSITE & MARKETING
  // ══════════════════════════════════════════════════════════════
  addPage();
  sectionHeader("6. Public Website & Marketing", "🌐");

  subSectionHeader("6.1 Main Home Page (Tenant Site)");
  bodyText("Each property gets its own subdomain-based public website (e.g., propertyname.triplooper.com) with a customizable template. Components include:");
  bullet("Hero section with tagline and CTA", 0);
  bullet("Room catalog with pricing and availability", 0);
  bullet("Amenities grid", 0);
  bullet("Photo gallery with immersive storytelling", 0);
  bullet("Location/explore map section", 0);
  bullet("Events and experiences", 0);
  bullet("Contact form and information", 0);
  bullet("Floating WhatsApp support button", 0);
  bullet("Footer with links, social media, and policies", 0);

  subSectionHeader("6.2 SaaS Marketing Site");
  featureCard("SaaS Hero Section (Hero195)", "Premium marketing hero with animated elements for the Triplooper SaaS platform");
  featureCard("Feature Grid", "Showcase of platform features — 20+ feature cards with icons and descriptions");
  featureCard("Problem-Solution Section", "Address pain points of property management and how Triplooper solves them");
  featureCard("ROI Calculator Section", "Demonstrate return on investment for property owners switching to Triplooper");
  featureCard("Testimonials", "Social proof with guest and property owner testimonials");
  featureCard("Trust Section", "Security badges, partner logos, and trust signals");
  featureCard("Who It's For", "Target audience segmentation — boutique hotels, resorts, restaurants, hostels");
  featureCard("Logo Strip", "Brand logos of companies/partners that trust Triplooper");
  featureCard("Pricing Section", "Detailed pricing comparison — Starter, Growth, Pro, Enterprise plans");
  featureCard("Final CTA", "Compelling call-to-action section with signup prompt");

  subSectionHeader("6.3 Pricing Page");
  featureCard("Plan Comparison", "Side-by-side comparison of all plans (Starter, Growth, Pro, Enterprise)");
  featureCard("Billing Toggle", "Monthly vs Yearly billing toggle with discount display");
  featureCard("Feature Breakdown", "Detailed feature list per plan with checkmarks and limitations");
  featureCard("Add-on Marketplace", "Optional add-ons: Extra Rooms, WhatsApp Pack, Custom Domain, OTA Sync, Priority Support, Advanced Analytics");
  featureCard("FAQ Accordion", "Expandable FAQ section addressing common questions about plans and billing");

  // ══════════════════════════════════════════════════════════════
  // SECTION 7: EMAIL & NOTIFICATION SYSTEM
  // ══════════════════════════════════════════════════════════════
  addPage();
  sectionHeader("7. Email & Notification System", "📧");
  bodyText("Triplooper uses Resend for transactional email delivery with professionally designed HTML templates using React Email.");

  subSectionHeader("7.1 Automated Emails");
  featureCard("Welcome Email", "Sent to property owners upon registration — includes dashboard URL, credentials, founder's note");
  featureCard("Booking Confirmation", "Sent to guest with reservation details, reference number, and guest portal link");
  featureCard("Booking Cancellation", "Notification to guest when a booking is cancelled with cancellation details");
  featureCard("Check-in Confirmation", "Welcome email upon guest check-in — room info, check-out date, front desk contact");
  featureCard("Check-out Receipt", "Complete invoice/receipt upon check-out — itemized charges, GST breakdown, payment method");
  featureCard("Staff Credentials", "Sent to new staff — login URL, email, password, role assignment");
  featureCard("Booking Status Change", "Notification when booking status changes (e.g., pending → confirmed)");
  featureCard("Business Invite", "Invitation email for business operators with secure accept link");

  subSectionHeader("7.2 Email Features");
  bullet("Resend API integration with fallback to local Express proxy", 0);
  bullet("Responsive HTML templates optimized for all email clients", 0);
  bullet("Founder signature with personal touch on welcome emails", 0);
  bullet("Status badge indicators (Confirmed, Cancelled, Pending, etc.)", 0);
  bullet("Secure credential delivery with password change reminders", 0);

  // ══════════════════════════════════════════════════════════════
  // SECTION 8: WHATSAPP INTEGRATION
  // ══════════════════════════════════════════════════════════════
  addPage();
  sectionHeader("8. WhatsApp Integration", "💬");
  bodyText("Triplooper integrates with WhatsApp via the Evolution API — a self-hosted WhatsApp Business API proxy that provides reliable messaging without Meta's Business API restrictions.");

  subSectionHeader("8.1 Connection & Setup");
  featureCard("QR Code Pairing", "Scan WhatsApp QR code to connect — managed via Supabase Edge Function");
  featureCard("Instance Management", "Create, connect, disconnect WhatsApp instances per property");
  featureCard("Connection Status", "Real-time status monitoring — connected, disconnected, error states");
  featureCard("Tenant-Level Config", "Enable/disable WhatsApp per property with independent instances");

  subSectionHeader("8.2 Automated Messaging");
  featureCard("Booking Confirmation", "Automatic WhatsApp message to guest upon booking with stay details and portal link");
  featureCard("Custom Templates", "Configurable message templates with variable substitution (guest name, room, dates, portal URL)");
  featureCard("Scheduled Messages", "WhatsApp scheduled message logging and delivery tracking");
  featureCard("Send Logs", "Complete audit trail of all sent WhatsApp messages with delivery status");

  subSectionHeader("8.3 Guest Communication");
  featureCard("Floating WhatsApp Button", "Persistent WhatsApp button on public website for instant guest inquiries");
  featureCard("Guest Portal Link", "WhatsApp messages include secure guest portal links for self-service access");

  // ══════════════════════════════════════════════════════════════
  // SECTION 9: PAYMENT PROCESSING
  // ══════════════════════════════════════════════════════════════
  addPage();
  sectionHeader("9. Payment Processing (Razorpay)", "💳");
  bodyText("Triplooper uses Razorpay for subscription billing and add-on purchases. The payment system integrates with Supabase Edge Functions for secure order creation and verification.");

  subSectionHeader("9.1 Subscription Plans");
  const plans = [
    ["Starter", "₹0", "5 rooms, 20 reservations/mo, 10 menu items, 5 tables, 2 staff"],
    ["Growth", "₹2,499/mo or ₹23,999/yr", "30 rooms, unlimited reservations, 50 menu items, 20 tables, 5 staff"],
    ["Pro", "₹4,999/mo or ₹47,999/yr", "75 rooms, unlimited reservations, 200 menu items, 50 tables, 15 staff"],
    ["Enterprise", "₹9,999/mo or ₹95,999/yr", "Unlimited rooms, reservations, menu items, tables, and staff"],
  ];
  for (const [plan, price, features] of plans) {
    checkPage(8);
    doc.setFillColor(...C.primaryLight);
    doc.roundedRect(MARGIN + 6, yPos, 28, 5, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(plan, MARGIN + 6, yPos + 4, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.accent);
    doc.text(price, MARGIN + 38, yPos + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.textMedium);
    doc.text(features, MARGIN + 38, yPos + 9);
    yPos += 13;
  }

  spacer(4);
  subSectionHeader("9.2 Add-on Marketplace");
  const addons = [
    ["Extra 10 Rooms", "₹499/mo"],
    ["WhatsApp Pack", "₹799/mo"],
    ["Custom Domain", "₹299/mo"],
    ["OTA Channel Sync", "₹1,499/mo"],
    ["Priority Support", "₹999/mo"],
    ["Advanced Analytics", "₹699/mo"],
  ];
  for (const [addon, price] of addons) {
    checkPage(6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.textDark);
    doc.circle(MARGIN + 8, yPos + 1, 0.6, "F");
    doc.text(addon, MARGIN + 14, yPos + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.accent);
    doc.text(price, PAGE_W - MARGIN - 6, yPos + 3, { align: "right" });
    yPos += 7;
  }

  subSectionHeader("9.3 Payment Flow");
  bullet("Razorpay SDK loaded dynamically on the client side", 0);
  bullet("Order created via Supabase Edge Function (create-razorpay-order)", 0);
  bullet("Payment handled through Razorpay Checkout modal (cards, UPI, net banking, wallets)", 0);
  bullet("Payment verified server-side via Edge Function (verify-razorpay-payment)", 0);
  bullet("Plan limits upgraded upon successful verification", 0);

  // ══════════════════════════════════════════════════════════════
  // SECTION 10: DATABASE & BACKEND
  // ══════════════════════════════════════════════════════════════
  addPage();
  sectionHeader("10. Database Schema & Backend", "🗄️");

  subSectionHeader("10.1 Core Tables (Supabase PostgreSQL)");
  const tables = [
    ["tenants", "Core entity — each property/venue; stores business info, subdomain, plan, settings"],
    ["businesses", "Multi-property operator entity; links multiple tenants under one business"],
    ["business_invites", "Invitation tracking for business operator onboarding"],
    ["staff", "Staff members with roles, status, and tenant association"],
    ["reservations", "All bookings — guest info, dates, room, status, payment, source, Aadhaar data"],
    ["rooms", "Room inventory — type, price, amenities, availability status per tenant"],
    ["menu_items", "Restaurant menu items — name, price, category, description, availability"],
    ["food_orders", "In-room and restaurant food orders — items, quantities, status, table assignment"],
    ["tables", "Restaurant table layout — capacity, location, status (available/occupied/reserved)"],
    ["expenses", "Operational expense tracking — category, amount, vendor, payment method"],
    ["payments", "Payment records — amount, method, status, linked reservation"],
    ["invoices", "GST-compliant invoice records with tax breakdown"],
    ["guest_profiles", "Guest identity database — contact info, Aadhaar data, stay history"],
    ["user_properties", "User-tenant role mapping — links users to properties with role and permissions"],
    ["cms_settings", "Content management settings — hero text, contact info, images per property"],
    ["channel_connections", "OTA channel integration config — API keys, sync settings per channel"],
    ["channel_sync_logs", "Audit trail for channel sync operations"],
    ["whatsapp_scheduled_messages", "WhatsApp message delivery log with status tracking"],
    ["room_pricing", "Dynamic pricing rules — seasonal rates, occupancy-based adjustments"],
  ];
  for (const [table, desc] of tables) {
    checkPage(6);
    doc.setFont("courier", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.primary);
    doc.text(table, MARGIN + 6, yPos + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.textMedium);
    const dLines = doc.splitTextToSize(desc, CONTENT_W - 55);
    doc.text(dLines, MARGIN + 52, yPos + 3);
    yPos += dLines.length * 4 + 3;
  }

  subSectionHeader("10.2 Supabase Edge Functions");
  const edgeFunctions = [
    ["create-staff", "Creates staff users in Auth and staff table — email, password, role assignment, rollback on failure"],
    ["send-whatsapp", "Sends WhatsApp messages via Evolution API — tenant config, phone normalization, delivery logging"],
    ["whatsapp-connect", "Manages WhatsApp instance lifecycle — create, QR code, status check, disconnect"],
  ];
  for (const [fn, desc] of edgeFunctions) {
    checkPage(6);
    doc.setFillColor(...C.primaryLight);
    doc.roundedRect(MARGIN + 6, yPos, 34, 5, 1, 1, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(fn, MARGIN + 6, yPos + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.textMedium);
    const dLines = doc.splitTextToSize(desc, CONTENT_W - 50);
    doc.text(dLines, MARGIN + 46, yPos + 3);
    yPos += dLines.length * 4 + 4;
  }

  subSectionHeader("10.3 RLS Policies");
  bodyText("Row-Level Security (RLS) is enforced on all database tables. Policies ensure tenants can only access their own data, staff can only access permitted operations, and platform admins have super-user access through service role bypass.");

  subSectionHeader("10.4 Key Database RPC Functions");
  bullet("create_tenant — Creates a new property with owner, subdomain, and business type", 0);
  bullet("Various RLS bypass functions for admin operations", 0);

  // ══════════════════════════════════════════════════════════════
  // SECTION 11: PLAN LIMITS & FEATURE TOGGLES
  // ══════════════════════════════════════════════════════════════
  addPage();
  sectionHeader("11. Plan Limits & Feature Toggles", "🔒");
  bodyText("Each subscription plan has defined resource limits enforced throughout the application. Feature toggles allow per-property enablement/disablement of individual CRM modules.");

  subSectionHeader("11.1 Resource Limits by Plan");
  const limitHeaders = ["Resource", "Starter", "Growth", "Pro", "Enterprise"];
  const limitRows = [
    ["Rooms", "5", "30", "75", "∞"],
    ["Reservations/mo", "20", "∞", "∞", "∞"],
    ["Menu Items", "10", "50", "200", "∞"],
    ["Tables", "5", "20", "50", "∞"],
    ["Staff", "2", "5", "15", "∞"],
    ["Food Orders/mo", "20", "∞", "∞", "∞"],
  ];

  const colW = [30, 24, 24, 24, 24];
  const startX = MARGIN + 10;

  // Header row
  doc.setFillColor(...C.primary);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  let xPos = startX;
  for (let i = 0; i < limitHeaders.length; i++) {
    doc.rect(xPos, yPos, colW[i], 7, "F");
    doc.text(limitHeaders[i], xPos + colW[i] / 2, yPos + 5, { align: "center" });
    xPos += colW[i];
  }
  yPos += 7;

  // Data rows
  for (const row of limitRows) {
    checkPage(6);
    xPos = startX;
    for (let i = 0; i < row.length; i++) {
      if (i === 0) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.textDark);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.textMedium);
      }
      doc.setFontSize(8);
      const bgColor = yPos % 2 === 0 ? [249, 250, 251] as [number, number, number] : [255, 255, 255] as [number, number, number];
      doc.setFillColor(...bgColor);
      doc.rect(xPos, yPos, colW[i], 6, "F");
      doc.text(row[i], xPos + colW[i] / 2, yPos + 4.5, { align: "center" });
      xPos += colW[i];
    }
    yPos += 6;
  }

  spacer(6);

  subSectionHeader("11.2 Feature Toggles (Per Property)");
  bodyText("Each property can independently enable or disable the following CRM modules via JSON configuration stored in the tenants table:");
  const featureModules = [
    "Dashboard, Reservations, Calendar, Guests, Rooms, Channel Manager",
    "Payments, Invoices, Expenses, Profit & Loss, Reports",
    "POS (Point of Sale), Menu Manager, Food Orders, Tables, Inventory",
    "Website Editor, Rooms CMS, Pricing Rules, Booking Settings",
    "WhatsApp, Staff Management, Billing, Server Orders"
  ];
  for (const group of featureModules) {
    checkPage(5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.textDark);
    doc.circle(MARGIN + 8, yPos + 1, 0.5, "F");
    doc.text(group, MARGIN + 14, yPos + 3);
    yPos += 5;
  }

  // ══════════════════════════════════════════════════════════════
  // CLOSING / FOOTER
  // ══════════════════════════════════════════════════════════════
  addPage();
  // Full dark background
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...C.accent);
  doc.text("TRIPLOOPER", PAGE_W / 2, 100, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("Premium Property Management System", PAGE_W / 2, 115, { align: "center" });

  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 30, 130, PAGE_W - MARGIN - 30, 130);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.textLight);
  doc.text("Complete Application Documentation", PAGE_W / 2, 145, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.textLight);
  doc.text(`© ${new Date().getFullYear()} Triplooper. All rights reserved.`, PAGE_W / 2, 170, { align: "center" });
  doc.text("Built with React 19, TypeScript, Supabase, Tailwind CSS", PAGE_W / 2, 180, { align: "center" });

  // ─── Save PDF ────────────────────────────────────────────────
  const desktopPath = path.join(os.homedir(), "OneDrive", "Desktop", "Triplooper-Complete-Features-Documentation.pdf");
  const buffer = Buffer.from(doc.output("arraybuffer"));
  fs.writeFileSync(desktopPath, buffer);
  console.log(`✅ PDF generated successfully at: ${desktopPath}`);
}

generatePDF().catch(console.error);
