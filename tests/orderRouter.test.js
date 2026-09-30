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

const admin = createAdmin();
const diner = createDiner();

const orderRequest = {
  franchiseId: 1,
  storeId: 2,
  items: [{ menuId: 3, description: "5 Cheese Pizza", price: 12 }],
};
const factoryRequest = {
  user: diner,
  body: { franchiseId: 1, storeId: 2, items: [] },
};
const reportUrl = "https://factory.example/report/4";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /menu getMenu", () => {
  test("returns the menu returned by the database", async () => {
    const menu = [{ id: 1, title: "Cheesy Overload" }];

    mockDB.getMenu.mockResolvedValue(menu);

    await getMenu(null, response, next);

    expect(mockDB.getMenu).toHaveBeenCalledTimes(1);
    expect(response.send).toHaveBeenCalledWith(menu);
    expect(next).not.toHaveBeenCalled();
  });
  test("forwards menu lookup errors to next", async () => {
    const error = new Error("menu lookup error");

    mockDB.getMenu.mockRejectedValue(error);

    await getMenu(null, response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(response.send).not.toHaveBeenCalled();
  });
});

describe("PUT /menu addMenuItem", () => {
  test("allows an admin to add an item and returns the refreshed menu", async () => {
    const item = {
      title: "Cheesy Overload",
      description: "5 Cheese Pizza",
      price: 12,
    };
    const menu = [{ id: 1, ...item }];
    const request = { user: admin, body: item };

    mockDB.addMenuItem.mockResolvedValue(undefined);
    mockDB.getMenu.mockResolvedValue(menu);

    await addMenuItem(request, response, next);

    expect(mockDB.addMenuItem).toHaveBeenCalledWith(item);
    expect(mockDB.getMenu).toHaveBeenCalledTimes(1);
    expect(response.send).toHaveBeenCalledWith(menu);
    expect(next).not.toHaveBeenCalled();
  });
  test("forwards a 403 StatusCodeError when a non-admin tries to add an item", async () => {
    const user = createDiner(createAuthenticatedUser);
    const request = { user, body: { title: "Cheesy Overload" } };

    await addMenuItem(request, response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "unable to add menu item",
        statusCode: 403,
      }),
    );
    expect(mockDB.addMenuItem).not.toHaveBeenCalled();
    expect(mockDB.getMenu).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
  });
  test("forwards addMenuItem errors to next without fetching or returning the menu", async () => {
    const item = { title: "Cheesy Overload" };
    const request = { user: admin, body: item };
    const error = new Error("menu insert error");

    mockDB.addMenuItem.mockRejectedValue(error);

    await addMenuItem(request, response, next);

    expect(mockDB.addMenuItem).toHaveBeenCalledWith(item);
    expect(mockDB.getMenu).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
    expect(response.send).not.toHaveBeenCalled();
  });
  test("forwards refreshed menu lookup errors to next", async () => {
    const item = { title: "Cheesy Overload" };
    const request = { user: admin, body: item };
    const error = new Error("refreshed menu lookup error");

    mockDB.addMenuItem.mockResolvedValue(undefined);
    mockDB.getMenu.mockRejectedValue(error);

    await addMenuItem(request, response, next);

    expect(mockDB.addMenuItem).toHaveBeenCalledWith(item);
    expect(mockDB.getMenu).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
    expect(response.send).not.toHaveBeenCalled();
  });
});

describe("GET / getOrders", () => {
  test("returns orders for user and the requested page", async () => {
    const page = "2";
    const orders = { dinerId: diner.id, orders: [], page };
    const request = { user: diner, query: { page } };

    mockDB.getOrders.mockResolvedValue(orders);

    await getOrders(request, response, next);

    expect(mockDB.getOrders).toHaveBeenCalledWith(diner, page);
    expect(response.json).toHaveBeenCalledWith(orders);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards order lookup errors to next", async () => {
    const request = { user: diner, query: { page: "1" } };
    const error = new Error("order lookup error");

    mockDB.getOrders.mockRejectedValue(error);

    await getOrders(request, response, next);

    expect(mockDB.getOrders).toHaveBeenCalledWith(diner, "1");
    expect(next).toHaveBeenCalledWith(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});

describe("POST / createOrder", () => {
  test("creates user's order, posts it to the factory, and returns the factory success data", async () => {
    const order = { ...orderRequest, id: 4 };
    const factoryResponse = {
      reportUrl: reportUrl,
      jwt: "factory-token",
    };
    const request = { user: diner, body: orderRequest };
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(factoryResponse),
    });

    mockDB.addDinerOrder.mockResolvedValue(order);

    await createOrder(request, response, next);

    expect(mockDB.addDinerOrder).toHaveBeenCalledWith(diner, orderRequest);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${config.factory.url}/api/order`);
    expect(options.method).toBe("POST");
    expect(options.headers.authorization).toBe(
      `Bearer ${config.factory.apiKey}`,
    );
    expect(JSON.parse(options.body)).toEqual({
      diner: { id: diner.id, name: diner.name, email: diner.email },
      order: order,
    });

    expect(response.send).toHaveBeenCalledWith({
      order: order,
      followLinkToEndChaos: factoryResponse.reportUrl,
      jwt: factoryResponse.jwt,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 500 with the factory report link when the factory responds unsuccessfully", async () => {
    const createdOrder = { ...orderRequest, id: 4 };
    const request = { user: diner, body: orderRequest };

    mockDB.addDinerOrder.mockResolvedValue(createdOrder);
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ reportUrl }),
    });

    await createOrder(request, response, next);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.send).toHaveBeenCalledWith({
      message: "Failed to fulfill order at factory",
      followLinkToEndChaos: reportUrl,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards order database errors to next without calling the factory", async () => {
    const error = new Error("order persistence error");
    const fetchSpy = jest.spyOn(global, "fetch");

    mockDB.addDinerOrder.mockRejectedValue(error);

    await createOrder(factoryRequest, response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
  });

  test("forwards factory request errors to next without returning success", async () => {
    const error = new Error("factory unavailable");

    mockDB.addDinerOrder.mockResolvedValue({ id: 4 });
    jest.spyOn(global, "fetch").mockRejectedValue(error);

    await createOrder(factoryRequest, response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(response.send).not.toHaveBeenCalled();
  });

  test("forwards factory response parsing errors to next without returning success", async () => {
    const error = new Error("invalid factory JSON");

    mockDB.addDinerOrder.mockResolvedValue({ id: 4 });
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(error),
    });

    await createOrder(factoryRequest, response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(response.send).not.toHaveBeenCalled();
  });
});
