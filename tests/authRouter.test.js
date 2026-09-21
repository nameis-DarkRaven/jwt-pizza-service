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

// Used by the route TODOs below to invoke handlers without starting the server.
// eslint-disable-next-line no-unused-vars
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

function createUser(id, name, email, roles) {
  return {
    id: id,
    name: name,
    email: email,
    roles: roles,
  };
}

function createDiner() {
  return createUser(7, "pizza diner", "diner@jwt.com", [{ role: "diner" }]);
}

describe("setAuthUser", () => {
  test("loads a logged-in user from a valid bearer token and adds role lookup", async () => {
    const user = createDiner();
    const token = jwt.sign(user, config.jwtSecret);
    const request = { headers: { authorization: `Bearer ${token}` } };
    const response = createResponse();
    const next = jest.fn();
    mockDB.isLoggedIn.mockResolvedValue(true);

    await setAuthUser(request, response, next);

    expect(mockDB.isLoggedIn).toHaveBeenCalledWith(token);
    expect(request.user).toMatchObject(user);
    expect(request.user.isRole("diner")).toBe(true);
    expect(request.user.isRole("admin")).toBe(false);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("calls next without setting a user when no Authorization header exists", async () => {
    const request = { headers: {} };
    const response = createResponse();
    const next = jest.fn();

    await setAuthUser(request, response, next);

    expect(mockDB.isLoggedIn).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("calls next without setting a user when the token is not logged in", async () => {
    const user = createDiner();
    const token = jwt.sign(user, config.jwtSecret);
    const request = { headers: { authorization: `Bearer ${token}` } };
    const response = createResponse();
    const next = jest.fn();
    mockDB.isLoggedIn.mockResolvedValue(false);

    await setAuthUser(request, response, next);

    expect(mockDB.isLoggedIn).toHaveBeenCalledWith(token);
    expect(request.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("clears the user when database validation throws ", async () => {
    const token = "token";
    const request = { headers: { authorization: `Bearer ${token}` } };
    const response = createResponse();
    const next = jest.fn();

    mockDB.isLoggedIn.mockRejectedValue(new Error("database error"));

    await setAuthUser(request, response, next);

    expect(request.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("clears the user when JWT verification throws", async () => {
    const token = jwt.sign(createDiner(), "invalid-secret");
    const request = { headers: { authorization: `Bearer ${token}` } };
    const response = createResponse();
    const next = jest.fn();

    mockDB.isLoggedIn.mockResolvedValue(true);

    await setAuthUser(request, response, next);

    expect(mockDB.isLoggedIn).toHaveBeenCalledWith(token);
    expect(request.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });
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
