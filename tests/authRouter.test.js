const jwt = require("jsonwebtoken");

const mockDB = {
  addUser: jest.fn(),
  getUser: jest.fn(),
  isLoggedIn: jest.fn(),
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
};

jest.mock("../src/database/database.js", () => ({
  DB: mockDB,
  Role: {
    Diner: "diner",
  },
}));

const { authRouter, setAuthUser } = require("../src/routes/authRouter.js");
const config = require("../src/config.js");

function getRouteHandler(method) {
  const layer = authRouter.stack.find(
    (stackLayer) => stackLayer.route?.methods[method],
  );
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function createResponse() {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.send = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("setAuthUser", () => {
  test.todo(
    "loads a logged-in user from a valid bearer token and adds role lookup",
  );
  test.todo(
    "calls next without setting a user when no Authorization header exists",
  );
  test.todo(
    "calls next without setting a user when the token is not logged in",
  );
  test.todo(
    "clears the user when database validation or JWT verification throws",
  );
});

describe("authenticateToken", () => {
  test.todo("returns 401 and unauthorized when req.user is absent");
  test.todo("calls next when req.user is present");
});

describe("POST /api/auth registration", () => {
  test.todo("returns 400 when name is missing");
  test.todo("returns 400 when email is missing");
  test.todo("returns 400 when password is missing");
  test.todo(
    "adds a diner role, signs in the new user, and returns user plus token",
  );
  test.todo("passes database errors to asyncHandler next");
});

describe("PUT /api/auth login", () => {
  test.todo("gets the user by email and password and returns user plus token");
  test.todo("passes an unknown-user error to asyncHandler next");
});

describe("DELETE /api/auth logout", () => {
  test.todo("rejects a request without an authenticated user with 401");
  test.todo("logs out the bearer token and returns the success message");
  test.todo(
    "returns success without calling logoutUser when the authenticated request has no token",
  );
  test.todo("passes database errors to asyncHandler next");
});

describe("setAuth", () => {
  test.todo("signs the user JWT, records the token, and returns it");
  test.todo("propagates loginUser errors");
});
