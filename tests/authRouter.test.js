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

const register = getRouteHandler("post");
const login = getRouteHandler("put");
const logout = getRouteHandler("delete");
const response = createResponse();
const next = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("setAuthUser", () => {
  test("loads a logged-in user from a valid bearer token and adds role lookup", async () => {
    const user = createDiner();
    const token = jwt.sign(user, config.jwtSecret);
    const request = { headers: { authorization: `Bearer ${token}` } };
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

    await setAuthUser(request, response, next);

    expect(mockDB.isLoggedIn).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("calls next without setting a user when Authorization header has unexpected format", async () => {
    const request = { headers: { authorization: "InvalidFormat" } };

    await setAuthUser(request, response, next);

    expect(mockDB.isLoggedIn).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("calls next without setting a user when the token is not logged in", async () => {
    const user = createDiner();
    const token = jwt.sign(user, config.jwtSecret);
    const request = { headers: { authorization: `Bearer ${token}` } };
    mockDB.isLoggedIn.mockResolvedValue(false);

    await setAuthUser(request, response, next);

    expect(mockDB.isLoggedIn).toHaveBeenCalledWith(token);
    expect(request.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("clears the user when database validation throws ", async () => {
    const token = "token";
    const request = { headers: { authorization: `Bearer ${token}` } };

    mockDB.isLoggedIn.mockRejectedValue(new Error("database error"));

    await setAuthUser(request, response, next);

    expect(request.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("clears the user when JWT verification throws", async () => {
    const token = jwt.sign(createDiner(), "wrong-secret");
    const request = { headers: { authorization: `Bearer ${token}` } };

    mockDB.isLoggedIn.mockResolvedValue(true);

    await setAuthUser(request, response, next);

    expect(mockDB.isLoggedIn).toHaveBeenCalledWith(token);
    expect(request.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("authenticateToken", () => {
  test("returns 401 and unauthorized when req.user is absent", () => {
    const request = { user: null };

    authRouter.authenticateToken(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.send).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });
  test("calls next when req.user is present", () => {
    const request = { user: createDiner() };

    authRouter.authenticateToken(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/auth registration", () => {
  test.each([
    ["name", { email: "test@example.com", password: "password" }],
    ["email", { name: "pizza diner", password: "password" }],
    ["password", { name: "pizza diner", email: "test@example.com" }],
  ])("returns 400 when %s is missing", async (missingField, body) => {
    const request = { body };

    await register(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      message: "name, email, and password are required",
    });

    expect(mockDB.addUser).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
  test("adds a diner role, signs in the new user, and returns user plus token", async () => {
    const user = createDiner();
    const request = {
      body: { name: user.name, email: user.email, password: "password" },
    };

    mockDB.addUser.mockResolvedValue(user);
    mockDB.loginUser.mockResolvedValue(undefined);

    await register(request, response);

    expect(mockDB.addUser).toHaveBeenCalledWith({
      ...request.body,
      roles: [{ role: "diner" }],
    });
    expect(mockDB.loginUser).toHaveBeenCalledWith(user.id, expect.any(String));
    expect(response.json).toHaveBeenCalledWith({
      user: user,
      token: expect.any(String),
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("PUT /api/auth login", () => {
  test("gets the user by email and password and returns user plus token", async () => {
    const user = createDiner();
    const request = {
      body: { email: user.email, password: "password" },
    };

    mockDB.getUser.mockResolvedValue(user);

    await login(request, response);

    expect(mockDB.getUser).toHaveBeenCalledWith(user.email, "password");
    expect(mockDB.loginUser).toHaveBeenCalledWith(user.id, expect.any(String));
    expect(response.json).toHaveBeenCalledWith({
      user: user,
      token: expect.any(String),
    });
  });
  test("passes an unknown user error to next", async () => {
    const request = {
      body: { email: "nonexistent@jwt.com", password: "password" },
    };
    const error = new Error("unknown user");

    mockDB.getUser.mockRejectedValue(error);

    await login(request, response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(response.status).not.toHaveBeenCalled();
    expect(mockDB.loginUser).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/auth logout", () => {
  test("rejects a request without an authenticated user with 401", async () => {
    const request = { user: null };

    await authRouter.authenticateToken(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.send).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });
  test("logs out the bearer token and returns the success message", async () => {
    const user = createDiner();
    const token = jwt.sign(user, config.jwtSecret);
    const request = {
      user: user,
      headers: { authorization: `Bearer ${token}` },
    };

    mockDB.logoutUser.mockResolvedValue(undefined);

    await logout(request, response, next);

    expect(mockDB.logoutUser).toHaveBeenCalledWith(token);
    expect(response.json).toHaveBeenCalledWith({
      message: "logout successful",
    });
  });
  test("returns success without calling logoutUser when the authenticated request has no token", async () => {
    const user = createDiner();
    const request = {
      user: user,
      headers: {},
    };

    await logout(request, response, next);

    expect(mockDB.logoutUser).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({
      message: "logout unsuccessful",
    });
  });
  test("passes database errors to asyncHandler next", async () => {
    const user = createDiner();
    const token = jwt.sign(user, config.jwtSecret);
    const request = {
      user: user,
      headers: { authorization: `Bearer ${token}` },
    };
    const error = new Error("database error");

    mockDB.logoutUser.mockRejectedValue(error);

    await logout(request, response, next);

    expect(mockDB.logoutUser).toHaveBeenCalledWith(token);
    expect(next).toHaveBeenCalledWith(error);
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });
});

describe("setAuth", () => {
  test.todo("signs the user JWT, records the token, and returns it");
  test.todo("propagates loginUser errors");
});
