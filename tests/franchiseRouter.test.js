const {
  createResponse,
  createDiner,
  createAdmin,
  createFranchisee,
  createAuthenticatedUser,
  getRouteHandler,
  getRouteHandlers,
} = require("./testFunctions.js");

const mockDB = {
  getFranchises: jest.fn(),
  getUserFranchises: jest.fn(),
  createFranchise: jest.fn(),
  getFranchise: jest.fn(),
  deleteFranchise: jest.fn(),
  createStore: jest.fn(),
  deleteStore: jest.fn(),
};

jest.mock("../src/database/database.js", () => ({
  DB: mockDB,
  Role: {
    Admin: "admin",
  },
}));

const franchiseRouter = require("../src/routes/franchiseRouter.js");

const getFranchises = getRouteHandler(franchiseRouter, "get", "/");
const getUserFranchises = getRouteHandler(franchiseRouter, "get", "/:userId");
const createFranchise = getRouteHandler(franchiseRouter, "post", "/");
const [authenticateDeleteFranchise, deleteFranchise] = getRouteHandlers(
  franchiseRouter,
  "delete",
  "/:franchiseId",
);

const createStore = getRouteHandler(
  franchiseRouter,
  "post",
  "/:franchiseId/store",
);
const deleteStore = getRouteHandler(
  franchiseRouter,
  "delete",
  "/:franchiseId/store/:storeId",
);

const response = createResponse();
const next = jest.fn();
const franchisee = createFranchisee();
const admin = createAdmin();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET / getFranchises", () => {
  test("returns franchises and more flag using the supplied filters", async () => {
    const request = {
      user: createDiner(),
      query: { page: "1", limit: "5", name: "pizza*" },
    };
    const franchises = [{ id: 1, name: "pizzaPocket" }];

    mockDB.getFranchises.mockResolvedValue([franchises, false]);

    await getFranchises(request, response, next);

    expect(mockDB.getFranchises).toHaveBeenCalledWith(
      request.user,
      "1",
      "5",
      "pizza*",
    );
    expect(response.json).toHaveBeenCalledWith({ franchises, more: false });
    expect(next).not.toHaveBeenCalled();
  });
  test("forwards getFranchises errors to next", async () => {
    const error = new Error("franchise lookup error");

    mockDB.getFranchises.mockRejectedValue(error);

    await getFranchises({ query: {} }, response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});

describe("GET /:userId getUserFranchises", () => {
  test("returns franchises when the authenticated user requests their own", async () => {
    const franchises = [{ id: 12, name: "pizzaPocket" }];
    const request = {
      user: franchisee,
      params: { userId: String(franchisee.id) },
    };

    mockDB.getUserFranchises.mockResolvedValue(franchises);

    await getUserFranchises(request, response, next);

    expect(mockDB.getUserFranchises).toHaveBeenCalledWith(franchisee.id);
    expect(response.json).toHaveBeenCalledWith(franchises);
    expect(next).not.toHaveBeenCalled();
  });
  test("allows an admin to retrieve another user's franchises", async () => {
    const targetUserId = 24;
    const franchises = [{ id: 12, name: "pizzaPocket" }];
    const request = {
      user: admin,
      params: { userId: String(targetUserId) },
    };

    mockDB.getUserFranchises.mockResolvedValue(franchises);

    await getUserFranchises(request, response, next);

    expect(mockDB.getUserFranchises).toHaveBeenCalledWith(targetUserId);
    expect(response.json).toHaveBeenCalledWith(franchises);
    expect(next).not.toHaveBeenCalled();
  });
  test("returns an empty list without querying the database when a non-admin requests another user's franchises", async () => {
    const user = createDiner(createAuthenticatedUser);
    const request = {
      user,
      params: { userId: "24" },
    };

    await getUserFranchises(request, response, next);

    expect(mockDB.getUserFranchises).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith([]);
    expect(next).not.toHaveBeenCalled();
  });
  test("forwards getUserFranchises errors to next", async () => {
    const request = {
      user: franchisee,
      params: { userId: String(franchisee.id) },
    };
    const error = new Error("user franchise lookup error");

    mockDB.getUserFranchises.mockRejectedValue(error);

    await getUserFranchises(request, response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});

describe("POST / createFranchise", () => {
  test("allows an admin to create a franchise and returns the created franchise", async () => {
    const franchise = {
      name: "pizzaPocket",
      admins: [{ email: "franchisee@jwt.com" }],
      id: 12,
    };
    const request = { user: admin, body: franchise };

    mockDB.createFranchise.mockResolvedValue(franchise);

    await createFranchise(request, response, next);

    expect(mockDB.createFranchise).toHaveBeenCalledWith(franchise);
    expect(response.send).toHaveBeenCalledWith(franchise);
    expect(next).not.toHaveBeenCalled();
  });

  test.each([
    ["franchisee", createFranchisee],
    ["diner", createDiner],
  ])(
    "forwards a 403 StatusCodeError when a %s tries to create a franchise",
    async (nonadmin, createUser) => {
      const user = createUser(createAuthenticatedUser);
      const request = {
        user,
        body: { name: user.name },
      };

      await createFranchise(request, response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 }),
      );
      expect(mockDB.createFranchise).not.toHaveBeenCalled();
      expect(response.send).not.toHaveBeenCalled();
    },
  );
  test("forwards createFranchise errors to next", async () => {
    const franchise = { name: "pizzaPocket", admins: [] };
    const error = new Error("franchise creation error");
    const request = { user: admin, body: franchise };

    mockDB.createFranchise.mockRejectedValue(error);

    await createFranchise(request, response, next);

    expect(mockDB.createFranchise).toHaveBeenCalledWith(franchise);
    expect(next).toHaveBeenCalledWith(error);
    expect(response.send).not.toHaveBeenCalled();
  });
});

describe("DELETE /:franchiseId deleteFranchise", () => {
  test("allows an admin to delete a franchise", async () => {
    const franchiseId = 12;

    mockDB.getFranchise.mockResolvedValue({
      id: franchiseId,
      admins: [],
    });
    mockDB.deleteFranchise.mockResolvedValue(undefined);

    await deleteFranchise(
      { user: admin, params: { franchiseId: String(franchiseId) } },
      response,
      next,
    );

    expect(mockDB.getFranchise).toHaveBeenCalledWith({ id: franchiseId });
    expect(mockDB.deleteFranchise).toHaveBeenCalledWith(franchiseId);
    expect(response.json).toHaveBeenCalledWith({
      message: "franchise deleted",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("allows a franchise owner to delete their franchise", async () => {
    const franchiseId = 12;

    mockDB.getFranchise.mockResolvedValue({
      id: franchiseId,
      admins: [{ id: franchisee.id }],
    });
    mockDB.deleteFranchise.mockResolvedValue(undefined);

    await deleteFranchise(
      { user: franchisee, params: { franchiseId: String(franchiseId) } },
      response,
      next,
    );

    expect(mockDB.deleteFranchise).toHaveBeenCalledWith(franchiseId);
    expect(response.json).toHaveBeenCalledWith({
      message: "franchise deleted",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards a 403 StatusCodeError when a non-owner non-admin tries to delete a franchise", async () => {
    const user = createDiner(createAuthenticatedUser);
    const franchiseId = 12;

    mockDB.getFranchise.mockResolvedValue({
      id: franchiseId,
      admins: [{ id: 24 }],
    });

    await deleteFranchise(
      { user, params: { franchiseId: String(franchiseId) } },
      response,
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
    expect(mockDB.deleteFranchise).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });

  test("forwards deleteFranchise errors to next without returning success", async () => {
    const admin = createAdmin();
    const franchiseId = 12;
    const error = new Error("franchise deletion failed");

    mockDB.getFranchise.mockResolvedValue({
      id: franchiseId,
      admins: [],
    });
    mockDB.deleteFranchise.mockRejectedValue(error);

    await deleteFranchise(
      { user: admin, params: { franchiseId: String(franchiseId) } },
      response,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  test("requires authentication before deleting a franchise", () => {
    const request = { user: null, params: { franchiseId: "12" } };

    authenticateDeleteFranchise(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.send).toHaveBeenCalledWith({
      message: "unauthorized",
    });
    expect(next).not.toHaveBeenCalled();
    expect(mockDB.getFranchise).not.toHaveBeenCalled();
    expect(mockDB.deleteFranchise).not.toHaveBeenCalled();
  });
});

describe("POST /:franchiseId/store createStore", () => {
  test("allows an admin to create a store for an existing franchise", async () => {
    const franchiseId = 12;
    const store = { name: "Downtown" };
    const request = {
      user: admin,
      params: { franchiseId: String(franchiseId) },
      body: store,
    };
    const createdStore = { id: 32, franchiseId, name: store.name };

    mockDB.getFranchise.mockResolvedValue({
      id: franchiseId,
      admins: [],
    });
    mockDB.createStore.mockResolvedValue(createdStore);

    await createStore(request, response, next);

    expect(mockDB.createStore).toHaveBeenCalledWith(franchiseId, store);
    expect(response.send).toHaveBeenCalledWith(createdStore);
    expect(next).not.toHaveBeenCalled();
  });

  test("allows a franchise admin to create a store for their franchise", async () => {
    const franchiseId = 12;
    const store = { name: "Downtown" };
    const createdStore = { id: 32, franchiseId, name: store.name };

    mockDB.getFranchise.mockResolvedValue({
      id: franchiseId,
      admins: [{ id: franchisee.id }],
    });
    mockDB.createStore.mockResolvedValue(createdStore);

    await createStore(
      {
        user: franchisee,
        params: { franchiseId: String(franchiseId) },
        body: store,
      },
      response,
      next,
    );

    expect(mockDB.createStore).toHaveBeenCalledWith(franchiseId, store);
    expect(response.send).toHaveBeenCalledWith(createdStore);
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards a 403 StatusCodeError when the user is neither admin nor franchise admin", async () => {
    const user = createDiner((id, roles) => createAuthenticatedUser(id, roles));
    const franchiseId = 12;

    mockDB.getFranchise.mockResolvedValue({
      id: franchiseId,
      admins: [{ id: 24 }],
    });

    await createStore(
      {
        user,
        params: { franchiseId: String(franchiseId) },
        body: { name: "Downtown" },
      },
      response,
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
    expect(mockDB.createStore).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
  });

  test("forwards createStore errors to next", async () => {
    const admin = createAdmin();
    const franchiseId = 12;
    const error = new Error("store creation failed");

    mockDB.getFranchise.mockResolvedValue({
      id: franchiseId,
      admins: [],
    });
    mockDB.createStore.mockRejectedValue(error);

    await createStore(
      {
        user: admin,
        params: { franchiseId: String(franchiseId) },
        body: { name: "Downtown" },
      },
      response,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
    expect(response.send).not.toHaveBeenCalled();
  });
});

describe("DELETE /:franchiseId/store/:storeId deleteStore", () => {
  test("allows an admin to delete a store and returns success", async () => {
    const admin = createAdmin();
    const franchiseId = 12;
    const storeId = 32;

    mockDB.getFranchise.mockResolvedValue({
      id: franchiseId,
      admins: [],
    });
    mockDB.deleteStore.mockResolvedValue(undefined);

    await deleteStore(
      {
        user: admin,
        params: {
          franchiseId: String(franchiseId),
          storeId: String(storeId),
        },
      },
      response,
      next,
    );

    expect(mockDB.deleteStore).toHaveBeenCalledWith(franchiseId, storeId);
    expect(response.json).toHaveBeenCalledWith({ message: "store deleted" });
    expect(next).not.toHaveBeenCalled();
  });

  test("allows a franchise admin to delete a store in their franchise", async () => {
    const owner = createFranchisee();
    const franchiseId = 12;
    const storeId = 32;

    mockDB.getFranchise.mockResolvedValue({
      id: franchiseId,
      admins: [{ id: owner.id }],
    });
    mockDB.deleteStore.mockResolvedValue(undefined);

    await deleteStore(
      {
        user: owner,
        params: {
          franchiseId: String(franchiseId),
          storeId: String(storeId),
        },
      },
      response,
      next,
    );

    expect(mockDB.deleteStore).toHaveBeenCalledWith(franchiseId, storeId);
    expect(response.json).toHaveBeenCalledWith({ message: "store deleted" });
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards a 404 StatusCodeError when the franchise does not exist", async () => {
    const admin = createAdmin();
    const error = Object.assign(new Error("Franchise not found"), {
      statusCode: 404,
    });

    mockDB.getFranchise.mockRejectedValue(error);

    await deleteStore(
      {
        user: admin,
        params: { franchiseId: "12", storeId: "32" },
      },
      response,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
    expect(mockDB.deleteStore).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });

  test("forwards a 403 StatusCodeError when the user is neither admin nor franchise admin", async () => {
    const user = createDiner((id, roles) => createAuthenticatedUser(id, roles));
    const franchiseId = 12;

    mockDB.getFranchise.mockResolvedValue({
      id: franchiseId,
      admins: [{ id: 24 }],
    });

    await deleteStore(
      {
        user,
        params: { franchiseId: String(franchiseId), storeId: "32" },
      },
      response,
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
    expect(mockDB.deleteStore).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });

  test("forwards deleteStore errors to next without returning success", async () => {
    const admin = createAdmin();
    const franchiseId = 12;
    const storeId = 32;
    const error = new Error("store deletion failed");

    mockDB.getFranchise.mockResolvedValue({
      id: franchiseId,
      admins: [],
    });
    mockDB.deleteStore.mockRejectedValue(error);

    await deleteStore(
      {
        user: admin,
        params: {
          franchiseId: String(franchiseId),
          storeId: String(storeId),
        },
      },
      response,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});
