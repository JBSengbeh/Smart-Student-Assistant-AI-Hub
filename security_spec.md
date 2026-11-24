# Smart Student Assistant — Security Specification (Phase 0)

## 1. Data Invariants
1. **Owner & Parent Invariant:** No assignment, exam, note, scholarship, schedule event, or private record can exist under `/users/{userId}/...` without an existing parent `/users/{userId}` document belonging to `request.auth.uid`, and `ownerId == userId == request.auth.uid`.
2. **PII Isolation Invariant:** Emails and billing fields live strictly under `/users/{userId}/private/{privateDocId}`, readable/writable only by `isOwner(userId)` or `isAdmin()`.
3. **Immutable Ownership & Timestamps:** `uid`/`ownerId`/`requesterUid` and `createdAt` can never be mutated after creation; `createdAt` and `updatedAt` must equal `request.time`.
4. **Terminal State Locking:** `PartnerInquiry` documents reaching `'approved'` or `'declined'` and `Scholarship` documents reaching `'archived'` cannot be modified by non-admins.
5. **Server-Authoritative Entitlements:** Client documents may store `entitlementToken`, which is verified server-side via HMAC-SHA256 before granting unlimited Gemini AI access.

## 2. The "Dirty Dozen" Attack Payloads
1. **Cross-User Read:** User B attempts `get(/users/userA/private/info)` -> `PERMISSION_DENIED`.
2. **Identity Spoofing on Create:** User B creates `/users/userB/assignments/a1` with `ownerId: "userA"` -> `PERMISSION_DENIED`.
3. **Ghost Field / Shadow Update:** User A creates `/users/userA` with `{ ..., isAdmin: true }` -> `PERMISSION_DENIED`.
4. **ID Poisoning:** User A creates `/users/userA/assignments/<2000-char-id>` -> `PERMISSION_DENIED`.
5. **Unbounded String DoS:** User A creates assignment with 50KB `title` -> `PERMISSION_DENIED`.
6. **Unbounded Array DoS:** User A creates exam with 500 `checklist` items -> `PERMISSION_DENIED`.
7. **Timestamp Forgery:** User A creates assignment with client-backdated `createdAt` != `request.time` -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation:** User A updates assignment changing `ownerId` or `createdAt` -> `PERMISSION_DENIED`.
9. **Privilege Escalation on PartnerInquiry:** Non-admin requester creates `PartnerInquiry` with `status: "approved"` -> `PERMISSION_DENIED`.
10. **Terminal State Bypass:** Non-admin attempts to edit an `'archived'` scholarship -> `PERMISSION_DENIED`.
11. **Unverified Email Spoofing:** Caller with `email: "lapcur3@gmail.com"` and `email_verified: false` tries admin action -> `PERMISSION_DENIED`.
12. **Blanket List Scraping:** Non-admin attempts `list(/partnerInquiries)` without filtering `requesterUid == request.auth.uid` -> `PERMISSION_DENIED`.
