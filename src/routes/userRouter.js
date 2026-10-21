const express = require("express");
const { asyncHandler, StatusCodeError } = require("../endpointHelper.js");
const { DB, Role } = require("../database/database.js");
const { authRouter, setAuth } = require("./authRouter.js");

const userRouter = express.Router();

userRouter.docs = [
  {
    method: "GET",
    path: "/api/user/me",
    requiresAuth: true,
    description: "Get authenticated user",
    example: `curl -X GET localhost:3000/api/user/me -H 'Authorization: Bearer tttttt'`,
    response: {
      id: 1,
      name: "常用名字",
      email: "a@jwt.com",
      roles: [{ role: "admin" }],
    },
  },
  {
    method: "PUT",
    path: "/api/user/:userId",
    requiresAuth: true,
    description: "Update user",
    example: `curl -X PUT localhost:3000/api/user/1 -d '{"name":"常用名字", "email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json' -H 'Authorization: Bearer tttttt'`,
    response: {
      user: {
        id: 1,
        name: "常用名字",
        email: "a@jwt.com",
        roles: [{ role: "admin" }],
      },
      token: "tttttt",
    },
  },
  {
    method: "DELETE",
    path: "/api/user/:userId",
    requiresAuth: true,
    description: "Delete a user (admins only)",
    example: `curl -X DELETE localhost:3000/api/user/1 -H 'Authorization: Bearer tttttt'`,
    response: { message: "user deleted" },
  },
  {
    method: "GET",
    path: "/api/user?page=1&limit=10&name=*",
    requiresAuth: true,
    description: "List users (admins only)",
    example: `curl 'localhost:3000/api/user?page=1&limit=10&name=*' -H 'Authorization: Bearer tttttt'`,
    response: {
      users: [
        {
          id: 1,
          name: "常用名字",
          email: "a@jwt.com",
          roles: [{ role: "admin" }],
        },
      ],
      more: false,
    },
  },
];

function parsePositiveInteger(
  value,
  fallback,
  fieldName,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new StatusCodeError(`${fieldName} must be a positive integer`, 400);
  }
  return Math.min(parsed, maximum);
}

// getUser
userRouter.get(
  "/me",
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    res.json(req.user);
  }),
);

// updateUser
userRouter.put(
  "/:userId",
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const userId = Number(req.params.userId);
    const user = req.user;
    if (user.id !== userId && !user.isRole(Role.Admin)) {
      return res.status(403).json({ message: "unauthorized" });
    }
    const updatedUser = await DB.updateUser(userId, name, email, password);
    if (!updatedUser || Number(updatedUser.id) !== userId) {
      throw new StatusCodeError("user not found", 404);
    }
    await DB.logoutUserSessions(userId);
    if (Number(user.id) === userId) {
      const auth = await setAuth(updatedUser);
      return res.json({ user: updatedUser, token: auth });
    }
    res.json({ user: updatedUser });
  }),
);

// deleteUser
userRouter.delete(
  "/:userId",
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    if (!req.user.isRole(Role.Admin)) {
      return res.status(403).json({ message: "unauthorized" });
    }
    const userId = Number(req.params.userId);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      throw new StatusCodeError("invalid user id", 400);
    }
    const deleted = await DB.deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({ message: "user not found" });
    }
    res.json({ message: "user deleted" });
  }),
);

// listUsers
userRouter.get(
  "/",
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    if (!req.user.isRole(Role.Admin)) {
      return res.status(403).json({ message: "unauthorized" });
    }
    const page = parsePositiveInteger(req.query.page, 1, "page");
    const limit = parsePositiveInteger(req.query.limit, 10, "limit", 100);
    const nameFilter =
      typeof req.query.name === "string" ? req.query.name : "*";
    res.json(await DB.getUsers(page, limit, nameFilter));
  }),
);

module.exports = userRouter;
