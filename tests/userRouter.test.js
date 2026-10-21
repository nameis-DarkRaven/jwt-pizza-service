const {
  createResponse,
  createDiner,
  createAdmin,
  getRouteHandler,
  getRouteHandlers,
  createAuthenticatedUser,
} = require("./testFunctions.js");

const jwt = require("jsonwebtoken");

const mockDB = {
  getUser: jest.fn(),
  updateUser: jest.fn(),
  loginUser: jest.fn(),
  logoutUserSessions: jest.fn(),
  getUsers: jest.fn(),
  deleteUser: jest.fn(),
};

jest.mock("../src/database/database.js", () => ({
  DB: mockDB,
  Role: { Admin: "admin" },
}));

const userRouter = require("../src/routes/userRouter.js");
const config = require("../src/config.js");

const getUser = getRouteHandler(userRouter, "get", "/me");
const updateUser = getRouteHandler(userRouter, "put", "/:userId");
const deleteUser = getRouteHandler(userRouter, "delete", "/:userId");
const listUsers = getRouteHandler(userRouter, "get", "/");
const deleteUserAuthentication = getRouteHandlers(
  userRouter,
  "delete",
  "/:userId",
)[0];
const listUsersAuthentication = getRouteHandlers(userRouter, "get", "/")[0];
const next = jest.fn();
const response = createResponse();

function createUpdateUserRequest(
  userId,
  authenticatedUser = createAuthenticatedUser(userId),
) {
  return {
    user: authenticatedUser,
    params: { userId: userId },
    body: {
      name: "Updated User",
      email: "updated@jwt.com",
      password: "updatedpassword",
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /me getUser", () => {
  test("returns the authenticated user from req.user", async () => {
    const request = { user: createDiner() };

    await getUser(request, response, next);

    expect(response.json).toHaveBeenCalledWith(request.user);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("PUT /:userId updateUser", () => {
  test("allows a user to update their own account and returns a new token", async () => {
    const request = createUpdateUserRequest(7);
    request.body.roles = [{ role: "admin" }];
    const updatedUser = request.user;

    mockDB.getUser.mockResolvedValue(createDiner());
    mockDB.updateUser.mockResolvedValue(updatedUser);
    mockDB.loginUser.mockResolvedValue(undefined);

    await updateUser(request, response, next);

    expect(mockDB.getUser).not.toHaveBeenCalled();
    expect(mockDB.updateUser).toHaveBeenCalledWith(
      Number(request.params.userId),
      request.body.name,
      request.body.email,
      request.body.password,
    );
    expect(mockDB.logoutUserSessions).toHaveBeenCalledWith(updatedUser.id);
    expect(mockDB.loginUser).toHaveBeenCalledWith(
      updatedUser.id,
      expect.any(String),
    );

    const result = response.json.mock.calls[0][0];
    expect(result.user).toEqual(updatedUser);
    expect(jwt.verify(result.token, config.jwtSecret)).toMatchObject({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      roles: updatedUser.roles,
    });
    expect(next).not.toHaveBeenCalled();
  });
  test("allows an admin to update another user without receiving their token", async () => {
    const request = createUpdateUserRequest(7, createAdmin());
    const updatedUser = {
      ...createDiner(),
      name: request.body.name,
      email: request.body.email,
    };

    mockDB.getUser.mockResolvedValue(createDiner());
    mockDB.updateUser.mockResolvedValue(updatedUser);
    mockDB.loginUser.mockResolvedValue(undefined);

    await updateUser(request, response, next);

    expect(mockDB.getUser).not.toHaveBeenCalled();
    expect(mockDB.updateUser).toHaveBeenCalledWith(
      7,
      request.body.name,
      request.body.email,
      request.body.password,
    );
    expect(response.json).toHaveBeenCalledWith({
      user: updatedUser,
    });
    expect(mockDB.logoutUserSessions).toHaveBeenCalledWith(updatedUser.id);
    expect(mockDB.loginUser).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
  test("returns 403 when a non-admin updates another user's account", async () => {
    const request = createUpdateUserRequest(7, createAuthenticatedUser(8));

    await updateUser(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(mockDB.getUser).not.toHaveBeenCalled();
    expect(mockDB.updateUser).not.toHaveBeenCalled();
    expect(mockDB.loginUser).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
  test("returns 404 when the target user does not exist", async () => {
    const request = createUpdateUserRequest(7);

    mockDB.updateUser.mockResolvedValue(null);

    await updateUser(request, response, next);

    expect(mockDB.updateUser).toHaveBeenCalledWith(
      Number(request.params.userId),
      request.body.name,
      request.body.email,
      request.body.password,
    );
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "user not found" }),
    );
    expect(mockDB.loginUser).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });
  test("forwards updateUser database errors to next without returning success", async () => {
    const request = createUpdateUserRequest(7, createAuthenticatedUser(7));
    const error = new Error("Database error");

    mockDB.getUser.mockResolvedValue(createDiner());
    mockDB.updateUser.mockRejectedValue(error);

    await updateUser(request, response, next);

    expect(mockDB.updateUser).toHaveBeenCalledWith(
      7,
      request.body.name,
      request.body.email,
      request.body.password,
    );
    expect(next).toHaveBeenCalledWith(error);
    expect(mockDB.loginUser).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });
  test("forwards loginUser errors to next without returning success", async () => {
    const request = createUpdateUserRequest(7);
    const updatedUser = createDiner();
    const error = new Error("login persistence failed");

    mockDB.getUser.mockResolvedValue(createDiner());
    mockDB.updateUser.mockResolvedValue(updatedUser);
    mockDB.loginUser.mockRejectedValue(error);

    await updateUser(request, response, next);

    expect(mockDB.updateUser).toHaveBeenCalledWith(
      7,
      request.body.name,
      request.body.email,
      request.body.password,
    );
    expect(mockDB.loginUser).toHaveBeenCalledWith(7, expect.any(String));
    expect(next).toHaveBeenCalledWith(error);
    expect(response.json).not.toHaveBeenCalled();
  });
  test("forwards session revocation errors without issuing a replacement token", async () => {
    const request = createUpdateUserRequest(7);
    const updatedUser = createDiner();
    const error = new Error("session revocation failed");
    mockDB.updateUser.mockResolvedValue(updatedUser);
    mockDB.logoutUserSessions.mockRejectedValue(error);

    await updateUser(request, response, next);

    expect(mockDB.logoutUserSessions).toHaveBeenCalledWith(updatedUser.id);
    expect(mockDB.loginUser).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});

describe("DELETE /:userId deleteUser", () => {
  test("requires authentication", () => {
    deleteUserAuthentication({}, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.send).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  test("allows an admin to delete a user", async () => {
    const request = {
      user: createAdmin(),
      params: { userId: "7" },
    };
    mockDB.deleteUser.mockResolvedValue(true);

    await deleteUser(request, response, next);

    expect(mockDB.deleteUser).toHaveBeenCalledWith(7);
    expect(response.json).toHaveBeenCalledWith({ message: "user deleted" });
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects a non-admin delete request", async () => {
    const request = {
      user: createAuthenticatedUser(7),
      params: { userId: "7" },
    };

    await deleteUser(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(mockDB.deleteUser).not.toHaveBeenCalled();
  });

  test("returns 404 when the target user does not exist", async () => {
    const request = {
      user: createAdmin(),
      params: { userId: "99" },
    };
    mockDB.deleteUser.mockResolvedValue(false);

    await deleteUser(request, response, next);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "user not found" });
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards database errors", async () => {
    const request = {
      user: createAdmin(),
      params: { userId: "7" },
    };
    const error = new Error("Database error");
    mockDB.deleteUser.mockRejectedValue(error);

    await deleteUser(request, response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});

describe("GET / listUsers", () => {
  test("requires authentication", () => {
    listUsersAuthentication({}, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.send).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  test("returns paginated public user data for admins", async () => {
    const users = [
      {
        id: 7,
        name: "pizza diner",
        email: "diner@jwt.com",
        roles: [{ role: "diner" }],
      },
    ];
    const request = {
      user: createAdmin(),
      query: { page: "2", limit: "5", name: "*diner*" },
    };
    mockDB.getUsers.mockResolvedValue({ users, more: true });

    await listUsers(request, response, next);

    expect(mockDB.getUsers).toHaveBeenCalledWith(2, 5, "*diner*");
    expect(response.json).toHaveBeenCalledWith({ users, more: true });
    expect(JSON.stringify(response.json.mock.calls[0][0])).not.toContain(
      "password",
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects a non-admin list request", async () => {
    const request = {
      user: createAuthenticatedUser(7),
      query: {},
    };

    await listUsers(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(mockDB.getUsers).not.toHaveBeenCalled();
  });

  test("uses safe default pagination and filter values", async () => {
    const request = { user: createAdmin(), query: {} };
    mockDB.getUsers.mockResolvedValue({ users: [], more: false });

    await listUsers(request, response, next);

    expect(mockDB.getUsers).toHaveBeenCalledWith(1, 10, "*");
    expect(response.json).toHaveBeenCalledWith({ users: [], more: false });
  });

  test("forwards database errors", async () => {
    const request = { user: createAdmin(), query: {} };
    const error = new Error("Database error");
    mockDB.getUsers.mockRejectedValue(error);

    await listUsers(request, response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});
