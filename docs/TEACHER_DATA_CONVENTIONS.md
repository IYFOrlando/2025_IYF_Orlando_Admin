# Teacher Data Management Conventions

## Document ID Strategy

**All teacher documents MUST use email as the document ID:**

- Document ID = lowercase email address
- Example: `john.doe@example.com` → Document ID: `john.doe@example.com`

## Required Fields

Every teacher document must have:

```typescript
{
  email: string,          // Lowercase, used as document ID
  name: string,           // Full name
  phone?: string,         // Optional phone number
  assignments: Array<{    // Academy assignments
    academyId: string,
    academyName: string,
    levelName: string | null
  }>,
  authorizedAcademies: string[],     // Derived from assignments
  authorizedAcademyIds: string[],    // Derived from assignments
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Data Integrity Rules

### 1. Email Uniqueness

- ✅ **One email = One teacher document**
- ❌ Never create multiple documents for the same email
- ❌ Never use anything other than email as document ID

### 2. Name Handling

- ⚠️ **Names can be duplicated** (different people, same name)
- ✅ Use email to differentiate between teachers with the same name
- ⚠️ If you see duplicate names in dropdowns, check if they have different emails

### 3. Assignment Sync

- ✅ When a teacher is assigned to an academy, update BOTH:
  1. The academy document (teacher field)
  2. The teacher document (assignments field)
- ✅ Use the `handleAssign` and `handleSaveTeacher` functions in TeachersManagementPage

## Creating New Teachers

### From Academy Management

When assigning a teacher that doesn't exist:

```typescript
// 1. Check if email exists
const existing = teachers.find(t => t.email === newEmail)

// 2. If not, create with email as ID
await setDoc(doc(db, 'teachers', newEmail.toLowerCase()), {
  email: newEmail.toLowerCase(),
  name: teacherName,
  phone: teacherPhone || '',
  assignments: [...],
  authorizedAcademies: [...],
  authorizedAcademyIds: [...],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
})
```

### From Teacher Management Page

Use the "Assign / Add Teacher" button which:

1. Prompts for email
2. Checks if teacher exists
3. Creates if needed (using email as ID)
4. Updates academy assignment

## Updating Teachers

### Changing Email

If a teacher's email changes:

```typescript
const oldEmail = 'old@example.com'
const newEmail = 'new@example.com'

// 1. Create new document with new email
await setDoc(doc(db, 'teachers', newEmail.toLowerCase()), { ... })

// 2. Update all academy references
// (handled by handleSaveTeacher)

// 3. Delete old document
await deleteDoc(doc(db, 'teachers', oldEmail.toLowerCase()))
```

### Changing Name/Phone

Just update the document - no special handling needed.

## Common Issues & Fixes

### Issue: Duplicate Names in Dropdown

**Cause**: Multiple teachers with same name but different emails
**Fix**: This is valid - they are different people. Use email to distinguish.

### Issue: Orphaned Documents (Non-email IDs)

**Cause**: Legacy data or manual creation
**Fix**: Run `scripts/cleanup-teachers.cjs` to merge into email-based IDs

### Issue: Teacher Not Showing in Dropdown

**Cause**: No email set, or document ID ≠ email
**Fix**: Ensure document ID matches lowercase email

## Maintenance Scripts

### Check Teacher Data

```bash
node scripts/check-teachers.cjs
```

Shows all teachers and identifies duplicates.

### Clean Up Orphaned Documents

```bash
node scripts/cleanup-teachers.cjs --dry-run  # Preview
node scripts/cleanup-teachers.cjs            # Execute
```

Merges documents where ID ≠ email.

### Merge Duplicate Names

```bash
node scripts/merge-duplicate-names.cjs
```

Interactive script to merge teachers with same name but different emails.

## Validation Checklist

Before deploying teacher changes:

- [ ] All teacher document IDs are lowercase emails
- [ ] No duplicate email addresses
- [ ] All assignments are synced between academies and teachers
- [ ] No orphaned teacher documents (check with `check-teachers.cjs`)
