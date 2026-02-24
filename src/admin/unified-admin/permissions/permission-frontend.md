# Permission API Endpoints

## Base Path
`/api/v1/unified-admin/permissions`

---

## 1. List All Permissions
**GET** `/api/v1/unified-admin/permissions`

**Query Params:**
- `page` (optional): number
- `limit` (optional): number
- `resource` (optional): string

**Response:**
```
[
  {
    "id": "string",
    "name": "string",
    "key": "string",
    "resource": "string",
    "description": "string | null",
    "user_id": "string | null",
    "created_at": "string",
    "updated_at": "string"
  }
]
```

---

## 2. Get Permission by ID
**GET** `/api/v1/unified-admin/permissions/:id`

**Response:**
```
{
  "id": "string",
  "name": "string",
  "key": "string",
  "resource": "string",
  "description": "string | null",
  "user_id": "string | null",
  "created_at": "string",
  "updated_at": "string"
}
```

---

## 3. Create Permission
**POST** `/api/v1/unified-admin/permissions`

**Payload:**
```
{
  "name": "string",        // Display name (e.g. "Manage users")
  "key": "string",         // Programmatic key (e.g. "manage_users")
  "resource": "string",     // Resource label (e.g. "Users")
  "description": "string", // Optional: what this permission allows
  "user_id": "string"       // Optional: assign to this user; omit to create a definition/template
}
```

**Response:**
```
{
  "id": "string",
  "name": "string",
  "key": "string",
  "resource": "string",
  "description": "string | null",
  "user_id": "string | null",
  "created_at": "string",
  "updated_at": "string"
}
```

---

## 4. Update Permission
**PUT** `/api/v1/unified-admin/permissions/:id`

**Payload:**
```
{
  "name": "string",
  "key": "string",
  "resource": "string",
  "description": "string"
}
```
(All fields optional.)

**Response:**
```
{
  "id": "string",
  "name": "string",
  "key": "string",
  "resource": "string",
  "description": "string | null",
  "user_id": "string | null",
  "created_at": "string",
  "updated_at": "string"
}
```

---

## 5. Delete Permission
**DELETE** `/api/v1/unified-admin/permissions/:id`

**Response:**
```
{
  "message": "Permission deleted successfully"
}
```

---

## 6. Bulk Assign Permissions
**POST** `/api/v1/unified-admin/permissions/bulk`

**Payload:**
```
{
  "user_id": "string",
  "permissions": [
    { "key": "string" }   // e.g. { "key": "manage_users" }
  ]
}
```

**Response:**
```
{
  "assigned": [
    { "key": "string" }
  ]
}
```

---

## 7. List Permission Resources
**GET** `/api/v1/unified-admin/permissions/resources`

**Response:**
```
[
  "resource1",
  "resource2"
]
```
