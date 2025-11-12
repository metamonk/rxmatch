# Authentication & Authorization

**Project**: RxMatch
**Status**: ⚠️ DEFERRED FOR MVP
**Last Updated**: 2025-11-12

---

## Current Status

**Authentication is NOT implemented** in the current version of RxMatch. The application is designed to be deployed in a controlled environment with access restrictions managed at the infrastructure level.

---

## Deployment Security Options

### Option 1: Cloud Run IAM Authentication (RECOMMENDED FOR MVP)

Deploy the application with Cloud Run IAM authentication, requiring users to authenticate with Google accounts.

```yaml
# service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: rxmatch-api
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/ingress: internal-and-cloud-load-balancing
    spec:
      containers:
        - image: us-central1-docker.pkg.dev/rxmatch-478003/rxmatch/rxmatch:latest
```

**Access Control**:
```bash
# Grant access to specific users
gcloud run services add-iam-policy-binding rxmatch-api \
  --region=us-central1 \
  --member='user:pharmacist@example.com' \
  --role='roles/run.invoker'

# Grant access to a group
gcloud run services add-iam-policy-binding rxmatch-api \
  --region=us-central1 \
  --member='group:pharmacists@example.com' \
  --role='roles/run.invoker'
```

**Advantages**:
- ✅ No code changes needed
- ✅ Uses existing Google Workspace accounts
- ✅ Audit logging via Google Cloud
- ✅ No additional cost
- ✅ HIPAA-compliant authentication

**Disadvantages**:
- ❌ Requires Google accounts
- ❌ No fine-grained role-based access control
- ❌ All authenticated users have full access

**Setup Instructions**:
1. Deploy with `--no-allow-unauthenticated`
2. Grant IAM roles to users/groups
3. Users must authenticate via `gcloud auth login`
4. Access via `gcloud run services proxy`

---

### Option 2: VPN-Only Access

Deploy the application on an internal network accessible only via VPN.

```yaml
# service.yaml - Internal access only
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/ingress: internal
        run.googleapis.com/vpc-access-connector: projects/PROJECT/locations/REGION/connectors/CONNECTOR
```

**Advantages**:
- ✅ No authentication code needed
- ✅ Simple deployment
- ✅ Network-level security

**Disadvantages**:
- ❌ Requires VPN infrastructure
- ❌ Less flexible access control
- ❌ Additional network setup

---

### Option 3: Identity-Aware Proxy (IAP)

Use Google Cloud Identity-Aware Proxy for authentication.

```bash
# Enable IAP
gcloud iap web enable \
  --resource-type=app-engine \
  --service=rxmatch-api

# Configure OAuth consent screen
gcloud iap oauth-brands create \
  --application_title="RxMatch" \
  --support_email="support@example.com"
```

**Advantages**:
- ✅ User-friendly browser-based login
- ✅ Integration with Google Workspace
- ✅ Detailed access controls
- ✅ Automatic HTTPS

**Disadvantages**:
- ❌ Additional configuration
- ❌ May incur costs
- ❌ Requires domain verification

---

## Future Implementation: Firebase Auth

**Status**: Planned for future release
**Priority**: Medium
**Estimated Effort**: 2-3 days

### Planned Architecture

```typescript
// src/lib/auth/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### User Roles

```typescript
export enum UserRole {
  ADMIN = 'admin',
  PHARMACIST = 'pharmacist',
  VIEWER = 'viewer'
}

interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  createdAt: Date;
  lastLogin: Date;
  emailVerified: boolean;
}
```

### Permission Matrix

| Feature | Admin | Pharmacist | Viewer |
|---------|-------|------------|--------|
| Parse Prescriptions | ✅ | ✅ | ❌ |
| View Results | ✅ | ✅ | ✅ |
| Manual Review | ✅ | ✅ | ❌ |
| Export Data (JSON/CSV) | ✅ | ✅ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| System Configuration | ✅ | ❌ | ❌ |

### Implementation Plan

#### Phase 1: Firebase Setup (Day 1)

1. Create Firebase project
2. Enable Firebase Auth
3. Configure authentication methods
4. Set up custom claims for roles

```bash
# Install dependencies
npm install firebase firebase-admin

# Initialize Firebase
firebase init auth
```

#### Phase 2: Backend Integration (Day 1-2)

```typescript
// src/hooks.server.ts
import { auth } from '$lib/auth/firebase';

export const handle = async ({ event, resolve }) => {
  // Extract token from Authorization header
  const token = event.request.headers.get('Authorization')?.replace('Bearer ', '');

  if (token) {
    try {
      const decodedToken = await auth.verifyIdToken(token);
      event.locals.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || UserRole.VIEWER
      };
    } catch (error) {
      console.error('Auth error:', error);
    }
  }

  return resolve(event);
};
```

#### Phase 3: Frontend Integration (Day 2-3)

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { auth } from '$lib/auth/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { user } from '$lib/stores/auth';

  onMount(() => {
    onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        user.set({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          // Fetch role from Firestore or custom claims
        });
      } else {
        user.set(null);
      }
    });
  });
</script>
```

#### Phase 4: Role-Based Access Control (Day 3)

```typescript
// src/lib/auth/permissions.ts
export function canParsePrescription(user: User): boolean {
  return [UserRole.ADMIN, UserRole.PHARMACIST].includes(user.role);
}

export function canManageUsers(user: User): boolean {
  return user.role === UserRole.ADMIN;
}

export function canExportData(user: User): boolean {
  return [UserRole.ADMIN, UserRole.PHARMACIST].includes(user.role);
}

// Middleware to protect routes
export function requireRole(...roles: UserRole[]) {
  return (event: RequestEvent) => {
    if (!event.locals.user) {
      throw error(401, 'Unauthorized');
    }

    if (!roles.includes(event.locals.user.role)) {
      throw error(403, 'Forbidden');
    }
  };
}
```

#### Phase 5: Session Management (Day 3)

```typescript
// Session configuration
export const SESSION_CONFIG = {
  maxAge: 30 * 60 * 1000, // 30 minutes
  absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours
  rolling: true // Extend on activity
};

// Session middleware
export async function validateSession(event: RequestEvent) {
  const session = event.cookies.get('session');

  if (!session) {
    return null;
  }

  // Verify session token
  const sessionData = await verifySessionToken(session);

  // Check session expiration
  if (Date.now() - sessionData.lastActivity > SESSION_CONFIG.maxAge) {
    // Session expired
    event.cookies.delete('session');
    return null;
  }

  // Check absolute timeout
  if (Date.now() - sessionData.createdAt > SESSION_CONFIG.absoluteTimeout) {
    // Absolute timeout reached
    event.cookies.delete('session');
    return null;
  }

  // Update last activity
  sessionData.lastActivity = Date.now();
  event.cookies.set('session', createSessionToken(sessionData), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: SESSION_CONFIG.maxAge / 1000
  });

  return sessionData;
}
```

---

## Password Policy

When Firebase Auth is implemented, the following password policy will be enforced:

```typescript
export const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  blockCommonPasswords: true,
  maxConsecutiveChars: 3
};

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common passwords
  if (PASSWORD_POLICY.blockCommonPasswords && COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Multi-Factor Authentication (Future)

**Status**: Planned for future release
**Priority**: High (for production)

### Implementation Options

1. **SMS-based OTP**
   - Via Firebase Auth Phone Authentication
   - Requires phone number verification

2. **Authenticator App (TOTP)**
   - Google Authenticator, Authy, etc.
   - More secure than SMS

3. **Security Keys (WebAuthn)**
   - Hardware keys (YubiKey, etc.)
   - Highest security level

### Planned Configuration

```typescript
export const MFA_CONFIG = {
  required: {
    admin: true,        // MFA required for admins
    pharmacist: false,  // MFA optional for pharmacists
    viewer: false       // MFA optional for viewers
  },
  methods: ['totp', 'sms', 'webauthn'],
  backupCodes: 10 // Number of backup codes to generate
};
```

---

## Migration Path

### Current State → Firebase Auth

1. **Pre-Migration**:
   - Document current access control (IAM/VPN)
   - Identify all users requiring access
   - Communicate migration timeline

2. **Migration**:
   - Set up Firebase project
   - Configure authentication methods
   - Create user accounts
   - Assign roles
   - Test authentication flow

3. **Transition**:
   - Deploy with dual authentication support
   - Migrate users incrementally
   - Monitor for issues
   - Provide user training

4. **Post-Migration**:
   - Remove old authentication method
   - Update documentation
   - Collect user feedback

---

## Security Considerations

### Password Storage

- ✅ Firebase handles password hashing (bcrypt/scrypt)
- ✅ Never store plaintext passwords
- ✅ Use Firebase's built-in security

### Session Security

- ✅ HttpOnly cookies
- ✅ Secure flag (HTTPS only)
- ✅ SameSite=Strict
- ✅ Session timeout: 30 minutes
- ✅ Absolute timeout: 8 hours

### Token Management

- ✅ JWT tokens with short expiration
- ✅ Refresh tokens for extended sessions
- ✅ Token revocation on logout
- ✅ Validate tokens server-side

---

## Cost Estimate (Firebase Auth)

**Firebase Auth Pricing** (as of 2025):
- First 50,000 monthly active users: **FREE**
- Additional users: $0.0025/user

**Estimated Monthly Cost**:
- 10 users: $0
- 100 users: $0
- 1,000 users: $0
- 10,000 users: $0
- 100,000 users: $125

---

## References

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Cloud Run IAM Authentication](https://cloud.google.com/run/docs/authenticating/developers)
- [Identity-Aware Proxy](https://cloud.google.com/iap/docs)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)

---

**Document Control**:
- Version: 1.0
- Created: 2025-11-12
- Status: Deferred
- Target Implementation: TBD
