const {
  createResponse,
  createDiner,
  createAdmin,
  createAuthenticatedUser,
  getRouteHandler,
} = require("./testfunctions.js");

const jwt = require("jsonwebtoken");

const mockDB = {
  addDinerOrder: jest.fn(),
  getOrders: jest.fn(),
  getMenu: jest.fn(),
  addMenuItem: jest.fn(),
};

jest.mock("../src/database/database.js", () => ({
  DB: mockDB,
  Role: { Admin: "admin" },
}));

const orderRouter = require("../src/routes/orderRouter.js");
const config = require("../src/config.js");

const getMenu = getRouteHandler(orderRouter, "get", "/menu");
const addMenuItem = getRouteHandler(orderRouter, "put", "/menu");
const getOrders = getRouteHandler(orderRouter, "get", "/");
const createOrder = getRouteHandler(orderRouter, "post", "/");
const response = createResponse();
const next = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /menu getMenu", () => {
  test.todo("returns the menu returned by the database");
  test.todo("forwards menu lookup errors to next");
});

describe("PUT /menu addMenuItem", () => {
  test.todo("allows an admin to add an item and returns the refreshed menu");
  test.todo(
    "forwards a 403 StatusCodeError when a non-admin tries to add an item",
  );
  test.todo(
    "forwards addMenuItem errors to next without fetching or returning the menu",
  );
  test.todo("forwards refreshed menu lookup errors to next");
});

describe("GET / getOrders", () => {
  test.todo("returns orders for req.user and the requested page");
  test.todo("forwards order lookup errors to next");
});

describe("POST / createOrder", () => {
  test.todo(
    "creates req.user's order, posts it to the factory, and returns the factory success data",
  );
  test.todo(
    "returns 500 with the factory report link when the factory responds unsuccessfully",
  );
  test.todo(
    "forwards order database errors to next without calling the factory",
  );
  test.todo(
    "forwards factory request errors to next without returning success",
  );
  test.todo(
    "forwards factory response parsing errors to next without returning success",
  );
});
