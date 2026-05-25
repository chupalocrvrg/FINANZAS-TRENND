# Cybersecurity Penetration Testing & Invariants Specification
This specification acts as the TDD (Test-Driven Development) security reference sheet for Firestore and API routing security. It documents the critical boundary limitations used to construct mathematically precise security rules for our cloud storage databases.

## 1. Architectural Integrity Invariants
1. **Zero-Trust Ownership**: No user can query or access any financial entity, transaction, wallet, ledger, or digital service without holding explicit authenticated ownership of that node (`ownerId == request.auth.uid`).
2. **Deterministic Identifier Whitelisting**: All system path IDs must adhere to standard base64/URL-safe routing formatting. Any non-conforming identifier is blocked immediately to prevent cross-site data pollution or document ID poisoning.
3. **Strict Size Guardrails (Resource Exhaustion Defense)**: All incoming payloads are strictly analyzed on a field-by-field level. Unlimited text strings or nested mock objects designed to trigger Denial-of-Wallet (excessive storage and high read footprint charges) are blocked.
4. **Temporal Invariance**: Create and update timestamps cannot be simulated by client devices. The database relies exclusively on the request server's temporal standard (`request.time`).
5. **No Escalation update blocks**: Core schema relational bindings (like `ownerId` or `createdAt` fields) are labeled as deep-constant objects. Once established, any modification results in logical rejection.

---

## 2. The "Dirty Dozen" Malicious Exploitation Payloads (Red Team Scenarios)

### Scenario 1: User Profile Ghost Fields Attack (Privilege Escalation)
* **Goal**: An attacker attempts to inject administrative or premium status parameters into their user profile node to circumvent system payment plans or gain higher system privileges.
* **Malicious Payload**:
  ```json
  {
    "uid": "victim_uid",
    "email": "attacker@spam.com",
    "isAdmin": true,
    "bypassBilling": true,
    "maxWalletsAllowed": 99999
  }
  ```
* **Defense**: Denied via exact size limit checks, immutable validation checks, and strict type verification.

### Scenario 2: Identity Hijacking / Transfer of Resource (Resource Takeover)
* **Goal**: A malicious actor modifies the `ownerId` of an existing financial entity to transfer it to a victim's workspace, attempting to contaminate metrics or inject rogue payment links.
* **Malicious Payload (Update)**:
  ```json
  {
    "name": "Supplier Premium Plus",
    "type": "supplier",
    "ownerId": "victim_user_id_xyz",
    "rate": 150.0
  }
  ```
* **Defense**: Denied by checking `incoming().ownerId == existing().ownerId` inside the allow update logic block.

### Scenario 3: Memory Exhaustion / Denial-of-Wallet Attack (String Bomb)
* **Goal**: The attacker writes a nested ledger or digital service record with a massive description of 10 Megabytes to drive storage costs to the standard maximum.
* **Malicious Payload**:
  ```json
  {
    "amount": 250.00,
    "walletId": "main_vault",
    "ownerId": "attacker_uid",
    "description": "A".repeat(10 * 1024 * 1024)
  }
  ```
* **Defense**: Denied by `.size() <= 500` checks paired with strict `is string` layout guards on all string attributes.

### Scenario 4: Identifier Poisoning / Path Traversal Attack
* **Goal**: Inject path traversal characters (`../`, `..%2F`) or astronomical strings in the Firestore paths to access internal subcollections or trigger Cloud Logging buffer overflows.
* **Target ID**: `../../admins/some_other_id` or a 4KB array of Unicode characters.
* **Defense**: Enforced via `isValidId()` matching `'^[a-zA-Z0-9_\\-]+$'` and requiring `size() <= 128` on all key parameter tags in the match route.

### Scenario 5: Balance Tampering Arbitrary Type Injection (Value Poisoning)
* **Goal**: A user sends a ledger entry or wallet update where the numeric balance/amount is a Boolean `true` or is changed from a standard float count to a nested malicious structure to break application parsing engines.
* **Malicious Payload**:
  ```json
  {
    "name": "My Personal Wallet",
    "type": "cash",
    "balance": {"$inc": "infinite_loop_exploit"},
    "ownerId": "attacker_uid"
  }
  ```
* **Defense**: Denied via explicit type check filters (`data.balance is number`).

### Scenario 6: Service Status Race Condition (State Shortcutting)
* **Goal**: An expired service subscription is updated directly from 'expired' back to 'active' without proceeding through the proper renewal transaction logic.
* **Malicious Payload**:
  ```json
  {
    "status": "active"
  }
  ```
* **Defense**: Mitigated by restricting actions during updates, ensuring that critical mutations require validation hooks.

### Scenario 7: Relational Orphan Creation (Dangling Ledger Items)
* **Goal**: A user posts an account transaction ledger card binding it to an empty or non-existent wallet ID, creating orphaned elements that cause rendering breakdowns in the client app.
* **Malicious Payload**:
  ```json
  {
    "amount": -50.00,
    "walletId": "",
    "ownerId": "attacker_uid"
  }
  ```
* **Defense**: Prevented by checking `isValidId(data.walletId)` and enforcing `walletId` completeness if specified.

### Scenario 8: Fraudulent Time Spoofing (Backdating Transaction Scapes)
* **Goal**: Inject historic or futuristic ledger entries to skew analytics and hide audits from tax panels.
* **Malicious Payload**:
  ```json
  {
    "amount": 50000.00,
    "walletId": "wallet_1",
    "ownerId": "attacker_uid",
    "createdAt": "1999-12-31T23:59:59Z"
  }
  ```
* **Defense**: Denied in validation rule blocks by making `createdAt == request.time` and using server runtime standards for validation.

### Scenario 9: Blanket Query Extraction (Data Scrape Attack)
* **Goal**: Bypass frontend query conditions and extract todos/ledgers of all system tenants by issuing a client-side blanket get query on the raw collection.
* **Trigger Operation**: `getDocs(collection(db, 'ledger'))`
* **Defense**: Denied since rules require explicit user filters mapping to the authenticated user ID: `allow list: if resource.data.ownerId == request.auth.uid`.

### Scenario 10: Digital Service Subcollection Resource Exhaustion
* **Goal**: Post infinite service history logs associated with random IDs to exhaust target index bounds.
* **Malicious Payload**:
  ```json
  {
    "action": "attacker_flooder",
    "details": {},
    "userId": "attacker_uid"
  }
  ```
* **Defense**: Enforced via relational validation looking up the parent `digital_services` node and checking the owner's authenticated identity.

### Scenario 11: Floating Transaction rate validation bypass
* **Goal**: Update rate metrics in transactions with negative values or complex floating limits designed to break calculations.
* **Malicious Payload**:
  ```json
  {
    "chargedRate": -1.0e+20,
    "isPaid": false
  }
  ```
* **Defense**: Denied via strict validation constraints enforcing `.chargedRate >= 0` and standard formatting rules.

### Scenario 12: Inactive Account Ledger Update Injection
* **Goal**: A deleted/inactive owner profile pushes continuous ledger records bypassing state checks.
* **Defense**: Enforced by ensuring `isValidUser()` verifies active authentication, matching only active verified sessions in all system write operations.
