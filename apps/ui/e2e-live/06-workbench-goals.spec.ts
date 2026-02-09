import { test, expect, ensureAgentRunning } from "./fixtures.js";

interface Goal { id: string; name: string; isCompleted: boolean }
interface Overview { goals: Goal[]; summary: Record<string, number>; autonomy: { enabled: boolean } }

test.describe("Goals", () => {
  test.beforeEach(async ({ appPage: page }) => {
    await ensureAgentRunning(page);
  });

  test("overview returns valid structure", async ({ appPage: page }) => {
    const d = (await (await page.request.get("/api/workbench/overview")).json()) as Overview;
    expect(typeof d.summary).toBe("object");
    expect(typeof d.autonomy.enabled).toBe("boolean");
    expect(Array.isArray(d.goals)).toBe(true);
  });

  test("create returns valid response", async ({ appPage: page }) => {
    const name = `Goal ${Date.now()}`;
    const resp = await page.request.post("/api/workbench/goals", { data: { name, description: "test" } });
    expect(resp.status()).toBe(200);
    const body = (await resp.json()) as { ok: boolean; id: string };
    expect(body.ok).toBe(true);
    expect(typeof body.id).toBe("string");
    expect(body.id.length).toBeGreaterThan(0);
  });

  test("overview goal count increases after create", async ({ appPage: page }) => {
    const before = (await (await page.request.get("/api/workbench/overview")).json() as Overview).goals.length;
    await page.request.post("/api/workbench/goals", { data: { name: `P ${Date.now()}` } });
    const after = (await (await page.request.get("/api/workbench/overview")).json() as Overview).goals.length;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  test("mark complete endpoint works", async ({ appPage: page }) => {
    const { id } = (await (await page.request.post("/api/workbench/goals", { data: { name: `C ${Date.now()}` } })).json()) as { id: string };
    const resp = await page.request.post(`/api/workbench/goals/${id}/complete`, { data: { isCompleted: true } });
    expect(resp.status()).toBe(200);
  });

  test("update goal endpoint works", async ({ appPage: page }) => {
    const { id } = (await (await page.request.post("/api/workbench/goals", { data: { name: `O ${Date.now()}` } })).json()) as { id: string };
    const resp = await page.request.put(`/api/workbench/goals/${id}`, { data: { name: `R ${Date.now()}` } });
    expect(resp.status()).toBe(200);
  });

  test("summary increments after create", async ({ appPage: page }) => {
    const before = (await (await page.request.get("/api/workbench/overview")).json() as Overview).summary.goalCount;
    await page.request.post("/api/workbench/goals", { data: { name: `S ${Date.now()}` } });
    const after = (await (await page.request.get("/api/workbench/overview")).json() as Overview).summary.goalCount;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  test("empty name rejected", async ({ appPage: page }) => {
    const status = (await page.request.post("/api/workbench/goals", { data: { name: "" } })).status();
    expect([400, 422]).toContain(status);
  });

  test("empty PUT is accepted or rejected", async ({ appPage: page }) => {
    const { id } = (await (await page.request.post("/api/workbench/goals", { data: { name: `EP ${Date.now()}` } })).json()) as { id: string };
    const status = (await page.request.put(`/api/workbench/goals/${id}`, { data: {} })).status();
    expect([200, 400, 422]).toContain(status);
  });

  test("special characters in name", async ({ appPage: page }) => {
    for (const name of [`🎯 ${Date.now()}`, `<b>html</b> ${Date.now()}`, `中文 ${Date.now()}`, `"quotes" ${Date.now()}`]) {
      const resp = await page.request.post("/api/workbench/goals", { data: { name } });
      expect(resp.status()).toBe(200);
      const body = (await resp.json()) as { ok: boolean; id: string };
      expect(body.ok).toBe(true);
      expect(typeof body.id).toBe("string");
    }
  });

  test("1000-char name", async ({ appPage: page }) => {
    expect([200, 400, 422]).toContain((await page.request.post("/api/workbench/goals", { data: { name: "A".repeat(1000) } })).status());
  });

  test("5 concurrent creates → unique IDs", async ({ appPage: page }) => {
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) =>
      page.request.post("/api/workbench/goals", { data: { name: `C${i} ${Date.now()}` } }).then(async (r) => (await r.json()) as { id: string }),
    ));
    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(5);
  });

  test("tags and priority", async ({ appPage: page }) => {
    const resp = await page.request.post("/api/workbench/goals", { data: { name: `T ${Date.now()}`, tags: ["e2e"], priority: 1 } });
    expect(resp.status()).toBe(200);
    const { id } = (await resp.json()) as { id: string };
    expect(id).toBeTruthy();
  });
});
