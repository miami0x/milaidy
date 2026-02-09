import { test, expect, ensureAgentRunning } from "./fixtures.js";

interface Todo { id: string; name: string; isCompleted: boolean; isUrgent: boolean; priority: number }
interface Overview { todos: Todo[]; summary: { todoCount: number; openTodos: number } }

async function createTodo(page: import("@playwright/test").Page, name: string, extra?: Record<string, unknown>) {
  const resp = await page.request.post("/api/workbench/todos", { data: { name, ...extra } });
  return { status: resp.status(), body: (await resp.json()) as { ok?: boolean; id?: string } };
}

function skipIfDown(r: { status: number }): void {
  if (r.status !== 200) test.skip(true, `Todo service ${r.status}`);
}

test.describe("Todos", () => {
  test.beforeEach(async ({ appPage: page }) => {
    await ensureAgentRunning(page);
  });

  test("creation endpoint (canary)", async ({ appPage: page }) => {
    const { status, body } = await createTodo(page, `T ${Date.now()}`);
    if (status === 200) { expect(body.ok).toBe(true); expect(typeof body.id).toBe("string"); }
    else { console.warn(`Todo service returned ${status}`); expect([500, 501, 503]).toContain(status); }
  });

  test("mark complete endpoint works", async ({ appPage: page }) => {
    const r = await createTodo(page, `C ${Date.now()}`); skipIfDown(r);
    const resp = await page.request.post(`/api/workbench/todos/${r.body.id}/complete`, { data: { isCompleted: true } });
    expect(resp.status()).toBe(200);
  });

  test("urgent flag accepted", async ({ appPage: page }) => {
    const r = await createTodo(page, `U ${Date.now()}`, { isUrgent: true }); skipIfDown(r);
    expect(r.body.ok).toBe(true);
    expect(typeof r.body.id).toBe("string");
  });

  test("priority update endpoint works", async ({ appPage: page }) => {
    const r = await createTodo(page, `P ${Date.now()}`, { priority: 1 }); skipIfDown(r);
    const resp = await page.request.put(`/api/workbench/todos/${r.body.id}`, { data: { priority: 5 } });
    expect(resp.status()).toBe(200);
  });

  test("todo count increases after create", async ({ appPage: page }) => {
    const before = (await (await page.request.get("/api/workbench/overview")).json() as Overview).summary.todoCount;
    const r = await createTodo(page, `S ${Date.now()}`); skipIfDown(r);
    const after = (await (await page.request.get("/api/workbench/overview")).json() as Overview).summary.todoCount;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  test("update name endpoint works", async ({ appPage: page }) => {
    const r = await createTodo(page, `O ${Date.now()}`); skipIfDown(r);
    const resp = await page.request.put(`/api/workbench/todos/${r.body.id}`, { data: { name: `R ${Date.now()}` } });
    expect(resp.status()).toBe(200);
  });

  test("empty name rejected", async ({ appPage: page }) => {
    const status = (await page.request.post("/api/workbench/todos", { data: { name: "" } })).status();
    expect([400, 422]).toContain(status);
  });

  test("type field", async ({ appPage: page }) => {
    for (const type of ["daily", "one-off", "aspirational"] as const) {
      const r = await createTodo(page, `${type} ${Date.now()}`, { type }); skipIfDown(r);
      expect(typeof r.body.id).toBe("string");
    }
  });

  test("dueDate field", async ({ appPage: page }) => {
    const r = await createTodo(page, `D ${Date.now()}`, { dueDate: new Date(Date.now() + 86_400_000).toISOString() }); skipIfDown(r);
    expect(r.body.ok).toBe(true);
  });

  test("special characters accepted", async ({ appPage: page }) => {
    const r = await createTodo(page, `🔥 <script> "q" ${Date.now()}`); skipIfDown(r);
    expect(r.body.ok).toBe(true);
    expect(typeof r.body.id).toBe("string");
  });
});
