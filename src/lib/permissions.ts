// ────────────────────────────────────────────────────────────────────────────
// Staff permission presets by position. Single definition shared by the staff
// management hook and tested in isolation.
// ────────────────────────────────────────────────────────────────────────────

export interface StorePermissions {
  web: { view: boolean; add: boolean; edit: boolean; delete: boolean };
  line: { view: boolean; adjust: boolean };
}

export const ROLE_PERMISSIONS: Record<string, StorePermissions> = {
  manager: {
    web: { view: true, add: true, edit: true, delete: true },
    line: { view: true, adjust: true },
  },
  staff: {
    web: { view: true, add: true, edit: true, delete: false },
    line: { view: true, adjust: true },
  },
  sales: {
    web: { view: true, add: false, edit: false, delete: false },
    line: { view: true, adjust: false },
  },
};

/** Permissions for a position, defaulting to the `staff` preset for unknown roles. */
export function permissionsForRole(role: string): StorePermissions {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.staff;
}
