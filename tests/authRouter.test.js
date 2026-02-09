const request = require("supertest");
const app = require("../src/service.js");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
const tokenRegex = /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/;
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(tokenRegex);

  const { password, ...user } = { ...testUser, roles: [{ role: "diner" }] };
  expect(loginRes.body.user).toMatchObject(user);
});

test("register", async () => {
  const registerRes = await request(app).post("/api/auth").send(testUser);
  expect(registerRes.status).toBe(200);
  expect(registerRes.body.token).toMatch(tokenRegex);
  const { password, ...user } = { ...testUser, roles: [{ role: "diner" }] };
  expect(registerRes.body.user).toMatchObject(user);
});

test("logout", async () => {
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body).toMatchObject({ message: "logout successful" });
});

test("unauthorized access", async () => {
  const res = await request(app).get("/api/user/me");
  expect(res.status).toBe(401);
  expect(res.body).toMatchObject({ message: "unauthorized" });
});
