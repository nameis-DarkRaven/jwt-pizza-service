const {
  createResponse,
  createDiner,
  createAdmin,
  getRouteHandler,
  getRouteHandlers,
  createAuthenticatedUser,
  createUser,
} = require("./testfunctions.js");

const jwt = require("jsonwebtoken");

const mockDB = {
  getUser: jest.fn(),
  updateUser: jest.fn(),
  loginUser: jest.fn(),
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
    const updatedUser = request.user;

    mockDB.getUser.mockResolvedValue(createDiner());
    mockDB.updateUser.mockResolvedValue(updatedUser);
    mockDB.loginUser.mockResolvedValue(undefined);

    await updateUser(request, response, next);

    expect(mockDB.updateUser).toHaveBeenCalledWith(
      Number(request.params.userId),
      request.body.name,
      request.body.email,
      request.body.password,
    );
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
  test("allows an admin to update another user's account", async () => {
    const request = createUpdateUserRequest(
      7,
      createAdmin(createAuthenticatedUser),
    );
    const updatedUser = {
      ...createDiner(),
      name: request.body.name,
      email: request.body.email,
    };

    mockDB.getUser.mockResolvedValue(createDiner());
    mockDB.updateUser.mockResolvedValue(updatedUser);
    mockDB.loginUser.mockResolvedValue(undefined);

    await updateUser(request, response, next);

    expect(mockDB.updateUser).toHaveBeenCalledWith(
      7,
      request.body.name,
      request.body.email,
      request.body.password,
    );
    expect(response.json).toHaveBeenCalledWith({
      user: updatedUser,
      token: expect.any(String),
    });
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
});

describe("DELETE /:userId deleteUser", () => {
  // this functionality is not yet implemented
  //   test.todo("successfully delete user from database");
  //   test.todo("deletion of non-existent user fails");

  //temp test
  test("delete not implemented", () => {
    const request = null;
    deleteUser(request, response, next);

    expect(response.json).toHaveBeenCalledWith({ message: "not implemented" });
  });
});

describe("GET / listUsers", () => {
  // this functionality is not yet implemented
  //   test.todo("get list of all users");
  //   test.todo("get empty list when no users exist");

  //temp test
  test("listUsers not implemented", () => {
    const request = null;
    listUsers(request, response, next);

    expect(response.json).toHaveBeenCalledWith({
      message: "not implemented",
      users: [],
      more: false,
    });
  });
});
