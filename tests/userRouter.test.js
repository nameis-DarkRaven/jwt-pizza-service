const jwt = require("jsonwebtoken");

const mockDB = {
  updateUser: jest.fn(),
};

describe("GET /me getUser", () => {
  test.todo("rejects a request without an authenticated user with 401");
  test.todo("get user data from database");
  test.todo("unauthorized attempt to access user data is rejected");
  test.todo("returns error when user does not exist");
});

describe("PUT /:userId updateUser", () => {
  test.todo("rejects a request without an authenticated user with 401");
  test.todo(
    "allows a user to update their own account and returns a new token",
  );
  test.todo("allows an admin to update another user's account");
  test.todo("returns 403 when a non-admin updates another user's account");
  test.todo("returns 404 when the requested user does not exist");
  test.todo(
    "forwards updateUser database errors to next without returning success",
  );
  test.todo("forwards loginUser errors to next without returning success");
});

describe("DELETE /:userId deleteUser", () => {
  //   test.todo("successfully delete user from database");
  //   test.todo("deletion of non-existent user fails");
  test.todo("rejects a request without an authenticated user with 401");
});

describe("GET / listUsers", () => {
  //   test.todo("get list of all users");
  //   test.todo("get empty list when no users exist");
  test.todo("rejects a request without an authenticated user with 401");
});
