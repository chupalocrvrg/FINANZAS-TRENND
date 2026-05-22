# Security Specification

## Data Invariants
- Each user can only read and write their own data (`ownerId` or document ID must match `request.auth.uid`).
- Timestamps must be server-generated (`request.time`).
- Entity IDs must be valid alphanumeric strings.
- Security PIN should be treated as sensitive (only owner can read/write).
- Data types must be strictly enforced.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create an entity with an `ownerId` that is not the authenticated user's UID.
2. **Path Injection**: Attempt to write to a document with a malicious ID containing nested paths.
3. **Shadow Field Injection**: Attempt to add an unrequested field `isAdmin: true` to a user profile.
4. **Timestamp Forgery**: Attempt to set `createdAt` to a past date instead of using `request.time`.
5. **Unauthorized Read**: Authenticated user 'A' attempts to read a transaction belonging to user 'B'.
6. **Negative Balance**: Attempt to set a wallet balance to a value that doesn't follow business logic (if any specific logic exists, though Firestore doesn't prevent negative numbers without specific rules).
7. **Enum Violation**: Attempt to set a `language` to `fr` when only `es` and `en` are allowed.
8. **Field Modification Gap**: Attempt to change `ownerId` of an existing entity.
9. **Resource Poisoning**: Attempt to inject a 1MB string into a `contact` field.
10. **Orphaned Write**: Attempt to create a ledger entry for a non-existent wallet ID.
11. **PII Leak**: Attempt to list all users to see their emails.
12. **State Shortcut**: Attempt to mark a transaction as `isPaid: true` without being the owner.

## Test Runner (Conceptual)
The `firestore.rules` will be tested against these cases by ensuring `PERMISSION_DENIED` is returned for all malicious attempts.
