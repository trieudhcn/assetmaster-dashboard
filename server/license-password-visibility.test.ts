import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const view = readFileSync(
  resolve(import.meta.dirname, "../client/src/pages/LicensesServicesManagementView.tsx"),
  "utf8"
);

describe("software activation password visibility", () => {
  it("toggles a revealed password back to its hidden state", () => {
    expect(view).toContain(
      "const passwordVisible = Boolean(revealedCredentials[`account-${account.id}`])"
    );
    expect(view).toContain("aria-pressed={passwordVisible}");
    expect(view).toContain(
      'passwordVisible ? onHidePassword(account.id) : onRevealPassword(account.id, "view")'
    );
    expect(view).toContain('{passwordVisible ? "Ẩn mật khẩu" : "Xem mật khẩu"}');
    expect(view).toContain("<EyeOff size={13} />");
    expect(view).toContain("<Eye size={13} />");
    expect(view).toContain("delete next[`account-${id}`]");
  });

  it("does not reveal the password when copying and clears secrets on modal changes", () => {
    expect(view).toContain(
      'if (variables.action === "view") setRevealedCredentials'
    );
    expect(view).toContain(
      'if (variables.action === "copy") void navigator.clipboard.writeText(result.value)'
    );
    expect(view).toContain(
      "setRevealedCredentials({});\n  }, [licenseModal]);"
    );
  });
});
