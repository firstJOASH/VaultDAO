# Data Export Functionality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add export functionality for proposals, activity, transactions, and financial summaries with CSV/JSON/PDF output, preview, date filtering, export history, and mobile-responsive UI.

**Architecture:** Add a reusable export utility layer (`export.ts`) plus a reusable `ExportModal` component, then integrate it into `Proposals` and a new `Activity` dashboard page. Persist export history in localStorage and surface it in `Settings` with re-export support. Use `jsPDF` + `jspdf-autotable` for report generation.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vite, `jspdf`, `jspdf-autotable`.

---

### Task 1: Add export utilities and history persistence

**Files:**
- Create: `frontend/src/utils/export.ts`
- Create: `frontend/src/utils/exportHistory.ts`
- Modify: `frontend/package.json`

**Step 1: Add dependency for PDF generation**

Run: `npm install jspdf jspdf-autotable`
Expected: packages added to dependencies.

**Step 2: Implement generic export helpers**

Add:
- CSV conversion with escaped cells and header support
- JSON pretty-print export
- PDF report generation with metadata + summary + table
- timestamped filename helper
- date range filter helper
- preview rows helper (first 10 rows)

**Step 3: Implement export history storage**

Add:
- `saveExportHistoryItem`
- `getExportHistory`
- `clearExportHistory`
- bounded list size (last 50 items)

**Step 4: Verify utility build**

Run: `npm run build`
Expected: TypeScript build succeeds.

### Task 2: Build ExportModal component

**Files:**
- Create: `frontend/src/components/ExportModal.tsx`

**Step 1: Define modal API**

Props:
- `isOpen`, `onClose`
- `vaultName`, `vaultAddress`
- `initialDataType`
- `datasets` (`proposals`, `activity`, `transactions`)
- `onExported` callback for history logging

**Step 2: Implement controls**

Add:
- data type selection
- format selection (`csv`, `json`, `pdf`)
- start/end date inputs
- preview table (first 10 rows)
- loading state and disabled states

**Step 3: Implement export action**

Use `export.ts` helpers and call `onExported` with metadata.

**Step 4: Ensure responsive behavior**

Mobile: full-screen modal style; Desktop: centered constrained modal.

### Task 3: Integrate export into Proposals and add Activity page

**Files:**
- Modify: `frontend/src/app/dashboard/Proposals.tsx`
- Create: `frontend/src/app/dashboard/Activity.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout/DashboardLayout.tsx`

**Step 1: Proposals integration**

Add `Export` button in header and wire `ExportModal` with preselected proposals dataset.

**Step 2: Create Activity page**

Add page with activity list and `Export` button; preselect activity dataset in modal.

**Step 3: Add route and navigation**

Register `/dashboard/activity` and sidebar item.

**Step 4: Add derived transactions + financial summary for export**

Derive transactions from executed proposals and activity events for modal datasets.

### Task 4: Add Settings export history with re-export

**Files:**
- Modify: `frontend/src/app/dashboard/Settings.tsx`

**Step 1: Render export history list**

Show latest export items with filename, type, date, and format.

**Step 2: Add clear history and re-export affordance**

Clear list and provide "Re-export" action via metadata.

**Step 3: Mobile polish**

Use responsive cards/buttons and 44px touch targets.

### Task 5: QA and acceptance verification

**Files:**
- Modify if needed based on QA findings

**Step 1: Lint and build**

Run:
- `npm run lint`
- `npm run build`

Expected: no new lint/type errors.

**Step 2: Requirement checklist verification**

Verify:
- `export.ts` functions exist and work
- modal supports data/format/date/preview/loading
- Proposals + Activity export entry points
- Settings export history rendering
- timestamp filenames
- mobile responsive behavior

**Step 3: Final smoke validation**

Manual validation in UI for CSV/JSON/PDF download and preview behavior.
