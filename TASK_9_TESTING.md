# Task 9: Inactive NDC Handling - Testing Guide

## Implementation Summary

### Components Modified/Created:
1. **FDA Service** (`src/lib/services/fda.ts`)
   - Added `formatExpirationDate()` helper function
   - Enhanced NDCPackage to include `expirationDate` field
   - Existing `isProductActive()` method already checks expiration dates

2. **InactiveNDCConfirmationModal** (`src/lib/components/packages/InactiveNDCConfirmationModal.svelte`)
   - New modal component for inactive NDC acknowledgment
   - Displays package details including formatted expiration date
   - Shows clear warning about risks of inactive NDCs
   - Requires checkbox acknowledgment before proceeding
   - Fully accessible (ARIA labels, keyboard support, screen reader friendly)

3. **PackageSelector** (`src/lib/components/packages/PackageSelector.svelte`)
   - Added inactive NDC warning banner (shows count when filter is off)
   - Enhanced package cards with inline expiration date warnings
   - Intercepts inactive NDC selection to show confirmation modal
   - Prevents selection without acknowledgment
   - Added inactive package filtering (on by default)

### Type Definitions Updated:
- **NDCPackage** (`src/lib/types/medication.ts`)
  - Added `expirationDate?: string` field

## Testing Checklist

### Unit Testing
- [ ] FDA Service
  - [x] `isProductActive()` correctly identifies expired NDCs
  - [x] `formatExpirationDate()` formats YYYYMMDD to readable date
  - [x] NDCPackage includes expirationDate in parsed results

### Component Testing

#### InactiveNDCConfirmationModal
- [ ] Modal displays when triggered
- [ ] Package details are shown correctly
- [ ] Expiration date is formatted and displayed
- [ ] Checkbox starts unchecked
- [ ] Confirm button is disabled until checkbox is checked
- [ ] Confirm button enables when checkbox is checked
- [ ] Cancel button closes modal without selection
- [ ] Backdrop click closes modal
- [ ] Escape key closes modal
- [ ] Enter key confirms when checkbox is checked
- [ ] Accessibility:
  - [ ] Screen reader announces modal role and title
  - [ ] Focus management works correctly
  - [ ] All interactive elements are keyboard accessible

#### PackageSelector
- [ ] Inactive warning banner shows when inactive NDCs exist and filter is off
- [ ] Warning banner shows correct count of inactive NDCs
- [ ] Filter checkbox is checked by default
- [ ] Toggling filter shows/hides inactive packages
- [ ] Inactive packages have red border and red background
- [ ] Inactive badge is displayed on inactive packages
- [ ] Expiration date warning is shown inline on inactive packages
- [ ] Clicking active NDC selects immediately (no modal)
- [ ] Clicking inactive NDC shows modal (blocks selection)
- [ ] Modal confirmation completes selection
- [ ] Modal cancellation prevents selection

### Integration Testing

#### End-to-End Flow
1. **Search for medication with mixed active/inactive NDCs**
   - [ ] Both active and inactive packages load
   - [ ] Warning banner appears
   - [ ] Inactive count is accurate

2. **Filter inactive NDCs**
   - [ ] Check "Hide inactive NDC codes" by default
   - [ ] Only active packages shown
   - [ ] Uncheck to show all packages
   - [ ] Inactive packages appear with warnings

3. **Select active NDC**
   - [ ] Click active package radio button
   - [ ] Selection completes immediately
   - [ ] No modal appears
   - [ ] Package is selected and highlighted

4. **Attempt to select inactive NDC**
   - [ ] Click inactive package radio button
   - [ ] Modal appears immediately
   - [ ] Package details match selected package
   - [ ] Expiration date is displayed

5. **Acknowledge and confirm inactive NDC**
   - [ ] Try to click Confirm without checkbox - button disabled
   - [ ] Check acknowledgment checkbox
   - [ ] Confirm button becomes enabled
   - [ ] Click Confirm
   - [ ] Modal closes
   - [ ] Inactive package is selected
   - [ ] Selection event fires with correct package data

6. **Cancel inactive NDC selection**
   - [ ] Click inactive package
   - [ ] Modal appears
   - [ ] Click Cancel or backdrop or Escape key
   - [ ] Modal closes
   - [ ] Package is NOT selected
   - [ ] Previous selection (if any) remains

### Accessibility Testing

#### Keyboard Navigation
- [ ] Tab through filter checkbox
- [ ] Tab through package radio buttons
- [ ] Enter key selects active packages
- [ ] Enter key opens modal for inactive packages
- [ ] Tab through modal elements (close button, checkbox, buttons)
- [ ] Escape closes modal
- [ ] Enter confirms when checkbox is checked

#### Screen Reader Testing
- [ ] Warning banner is announced with role="alert"
- [ ] Inactive count is read correctly
- [ ] Package cards describe status (active/inactive)
- [ ] Modal title and description are announced
- [ ] Checkbox label is read clearly
- [ ] Button states (disabled/enabled) are announced

### Visual Testing

#### Color Contrast
- [x] Red warning colors meet WCAG AA contrast ratios
- [x] Red badges on inactive packages are readable
- [x] Warning icons are visible
- [x] Modal has clear visual hierarchy

#### Responsive Design
- [ ] Modal is readable on mobile (max-w-2xl responsive)
- [ ] Warning banner wraps properly on small screens
- [ ] Package cards stack appropriately
- [ ] Modal scrolls when content overflows

## Test Scenarios

### Scenario 1: All Active NDCs
**Input:** Search returns only active NDCs
**Expected:**
- No warning banner
- No inactive badges
- All packages selectable without modal
- Filter toggle shows "N of N packages"

### Scenario 2: All Inactive NDCs
**Input:** Search returns only inactive NDCs
**Expected:**
- Warning banner shows correct count
- All packages have inactive badge and warnings
- Filter checkbox hides all packages when checked
- Modal required for any selection

### Scenario 3: Mixed Active/Inactive
**Input:** Search returns mix of active and inactive NDCs
**Expected:**
- Warning banner shows inactive count
- Active packages selectable normally
- Inactive packages require modal
- Filter works correctly

### Scenario 4: No Expiration Date on Inactive
**Input:** Inactive NDC without expiration date
**Expected:**
- Package marked as inactive
- No expiration date shown
- Modal still appears
- "Listing Expired On" section is hidden

### Scenario 5: Future Expiration Date
**Input:** NDC with expiration date in future
**Expected:**
- Package marked as active
- No inactive warnings
- Selectable without modal

## Manual Testing Commands

```bash
# Start development server
npm run dev

# Run type checking
npm run check

# Test with real FDA API data
# Search for drugs known to have inactive NDCs:
# - "Lisinopril" (many generic versions, some discontinued)
# - "Atorvastatin" (older formulations may be inactive)
```

## Known Limitations

1. **No audit logging yet** - Acknowledgment is not logged to calculation results (future enhancement)
2. **No persistence** - Modal state resets on component remount
3. **Single selection only** - Radio button pattern doesn't support multi-select

## Future Enhancements

1. Add acknowledgment to calculation audit trail
2. Store user preference for "show inactive" filter
3. Add batch acknowledgment for multiple inactive selections
4. Add more detailed inactive reasons (discontinued vs expired vs reformulated)
5. Link to alternative active NDCs when available
