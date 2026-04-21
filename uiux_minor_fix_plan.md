# UI/UX and Minor Functional Fix Plan

## Scope
- Total consolidated issues reviewed: 67
- UI/UX issues to fix: 18
- Minor functional flow issues to fix: 15
- Major functional flow issues to discuss: 34

## Fix Sequence
- Phase 1: Form validation and feedback consistency (Cities, Recipients, Templates, Compliance upload).
- Phase 2: Layout and interaction polish (Dashboard spacing, header overlap, modal scroll lock, dropdown behavior).
- Phase 3: Minor flow corrections (redirect-after-save, year validation control, sorting/filtering, role highlight).
- Phase 4: Cross-browser and regression checks (Safari copy link, PDF alignment, no-data messages).

## Module-wise Backlog (UI/UX + Minor)
### Buildings
- [UI/UX Change] F1-DEF-5: The line break added for the other cells in the table by clicking on 'Paused' icon.
- [UI/UX Change] F2-ISS-10: Status' column shows multiple states simultaneously (Active + Paused) causing unclear/confusing behavior on 'Buildings' page.
- [UI/UX Change] F2-ISS-13: No success message appears after updating records on 'Buildings, Recipients, and Staff' pages.
- [Minor Functional Flow Change] F2-ISS-16: Status' column available in 'Buildings' module without any option to modify or manage status (Active/Inactive) on 'Buildings' page.
- [UI/UX Change] F2-ISS-23: No validation when no building is selected under 'Add Recipient' popup despite default checkbox pre-selected like 1st Building name on 'Recipient' page.

### Cities
- [UI/UX Change] F1-DEF-2: Validation message missing from the modal.
- [Minor Functional Flow Change] F1-DEF-3: The user stays on the edit page after clicking on Save Changes button.
- [UI/UX Change] F2-ISS-1: City search dropdown remains visible and blocks UI after clearing input in 'Search' field under 'Create New City' popup, on 'Cities' page.
- [UI/UX Change] F2-ISS-3: Duplicate city options appearing in search city dropdown under 'Create New City' popup, on 'Cities' page.
- [UI/UX Change] F2-ISS-6: User is not redirected to 'Cities' page after updating city details from 'Edit city configuration' page.
- [UI/UX Change] F2-ISS-8: Unnecessary empty space appears below the 'City Statistics' section on 'Dashboard' page, affecting layout consistency.
- [UI/UX Change] F2-ISS-9: Background page remains scrollable and causes scroll glitch after selecting city in 'Add Building' popup on 'Buildings' page.
- [Minor Functional Flow Change] F2-ISS-14: No sorting functionality available across the data tables (Cities, Buildings, Recipients, Staff) for better data management, accross the website.
- [UI/UX Change] F2-ISS-17: Select a City' option from filter dropdown resets page to empty state despite being a non-actionable/default option on 'Templates' page.

### Edit recipient
- [Minor Functional Flow Change] F1-IMP-16: Replace browser default validation (“Please fill out this field”) with custom inline validation messages styled consistently with the application UI.

### Energy & Reports
- [UI/UX Change] F2-ISS-25: Header layout breaks at 100% zoom causing overlap between 'User Role' label and navigation tabs ('Energy/Messages') with screen size 1265 × 559.
- [UI/UX Change] F2-ISS-33: Alignment issue occurring in generated report PDF file.
- [UI/UX Change] F2-ISS-34: Show an info message when no details available under 'Utility consumption history' section, on 'Energy & Reports' page.

### General
- [Minor Functional Flow Change] F2-ISS-15: No filtering functionality available across the website to refine and view specific data.

### Inline Editing
- [Minor Functional Flow Change] F1-IMP-5: Allow editing city/building details directly within table rows (e.g., click cell → edit → save) instead of navigating to separate pages

### Input Validation & UX
- [Minor Functional Flow Change] F1-IMP-17: Add input constraints and UI controls for Year field, such as:
 Restrict input to 4-digit numeric values only
 Add min/max range (e.g., 1900–current year)
 Use a numeric stepper or dropdown for year selection
 Show inline validation message for invalid input

### Messages/Compliance
- [Minor Functional Flow Change] F2-ISS-19: No filter options are available to segregate messages based on their status in 'Message History' section, on 'Compilance' page.
- [UI/UX Change] F2-ISS-27: Incorrect success message grammar message appear after uploading the file under 'Upload compliance photo or BMS record' popup.
- [Minor Functional Flow Change] F2-ISS-28: Missing navigation option after file upload completion, under 'Upload compliance photo or BMS record' popup.

### Recipients
- [UI/UX Change] F1-DEF-6: The building name dropdown shows cropped from right side.
- [UI/UX Change] F2-ISS-11: Validation error for missing email/phone appears on 'Recipients' lis page instead of 'Add Recipient' popup.
- [UI/UX Change] F2-ISS-12: No validation appearing after entering invalid mobile number under 'Add/Edit Recipient' popup on 'Recipients' page.

### Smart Default Filters
- [Minor Functional Flow Change] F1-IMP-1: Default all dashboards and reports to last 24 hours or current day, with quick toggle options (24h / 7d / 30d)

### Smart Empty States
- [Minor Functional Flow Change] F1-IMP-14: Show guided messages like “No cities added yet – Click here to add or upload CSV”

### Staff
- [Minor Functional Flow Change] F2-ISS-21: User Role' (Admin/Staff) is not visually distinguished/highlighted on the header, reducing visibility and clarity.

### UI / User Interaction
- [Minor Functional Flow Change] F1-IMP-19: Change cursor to a hand pointer (clickable cursor) when hovering over interactive elements such as list items, buttons, dropdowns, or selectable rows.

### UI Consistency
- [Minor Functional Flow Change] F1-IMP-15: Standardize text formatting (e.g., auto Title Case for building name and address).

### Utility Data Upload
- [Minor Functional Flow Change] F1-DEF-11: Year field accepts invalid and non-standard values without validation

## Notes
- Address duplicate/overlapping issues in the same module together to reduce rework.
- Standardize success/error toasts and inline validation messages in shared form components.