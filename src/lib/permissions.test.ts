import { describe, it, expect } from "vitest";
import { permissionsForRole, ROLE_PERMISSIONS } from "./permissions";

describe("permissionsForRole", () => {
  it("manager can do everything", () => {
    const p = permissionsForRole("manager");
    expect(p.web.delete).toBe(true);
    expect(p.line.adjust).toBe(true);
  });

  it("staff can edit but not delete", () => {
    const p = permissionsForRole("staff");
    expect(p.web.edit).toBe(true);
    expect(p.web.delete).toBe(false);
    expect(p.line.adjust).toBe(true);
  });

  it("sales is view-only and cannot adjust stock via LINE", () => {
    const p = permissionsForRole("sales");
    expect(p.web.add).toBe(false);
    expect(p.web.edit).toBe(false);
    expect(p.line.adjust).toBe(false);
    expect(p.web.view).toBe(true);
  });

  it("falls back to the staff preset for unknown roles", () => {
    expect(permissionsForRole("nonsense")).toEqual(ROLE_PERMISSIONS.staff);
  });
});
