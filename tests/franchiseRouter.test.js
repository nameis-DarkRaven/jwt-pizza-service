describe("GET / getFranchises", () => {
  test.todo("returns franchises and more flag using the supplied filters");
  test.todo("forwards getFranchises errors to next");
});

describe("GET /:userId getUserFranchises", () => {
  test.todo(
    "returns franchises when the authenticated user requests their own",
  );
  test.todo("allows an admin to retrieve another user's franchises");
  test.todo(
    "returns an empty list without querying the database if a non-admin user attempts to get another user's franchises",
  );
  test.todo("forwards getUserFranchises errors to next");
});

describe("POST / createFranchise", () => {
  test.todo(
    "allows an admin to create a franchise and returns the created franchise",
  );
  test.todo(
    "forwards a 403 StatusCodeError when a non-admin tries to create a franchise",
  );
  test.todo("forwards createFranchise errors to next");
});

describe("DELETE /:franchiseId deleteFranchise", () => {
  test.todo("allows an admin to delete a franchise");
  test.todo("allows a franchise owner to delete their franchise");
  test.todo(
    "forwards a 403 StatusCodeError when a non-owner non-admin tries to delete a franchise",
  );
  test.todo("forwards a 404 StatusCodeError when the franchise does not exist");
  test.todo(
    "forwards deleteFranchise errors to next without returning success",
  );
  test.todo("requires authentication before deleting a franchise");
});

describe("POST /:franchiseId/store createStore", () => {
  test.todo("allows an admin to create a store for an existing franchise");
  test.todo("allows a franchise admin to create a store for their franchise");
  test.todo("forwards a 404 StatusCodeError when the franchise does not exist");
  test.todo(
    "forwards a 403 StatusCodeError when the user is neither admin nor franchise admin",
  );
  test.todo("forwards createStore errors to next");
});

describe("DELETE /:franchiseId/store/:storeId deleteStore", () => {
  test.todo("allows an admin to delete a store and returns success");
  test.todo("allows a franchise admin to delete a store in their franchise");
  test.todo("forwards a 404 StatusCodeError when the franchise does not exist");
  test.todo(
    "forwards a 403 StatusCodeError when the user is neither admin nor franchise admin",
  );
  test.todo("forwards deleteStore errors to next without returning success");
});
