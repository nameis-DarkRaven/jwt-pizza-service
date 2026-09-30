function createResponse() {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.send = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
}

function createUser(id, roles = [{ role: "diner" }]) {
  return {
    id: id,
    name: `user-${id}`,
    email: `user-${id}@jwt.com`,
    roles: roles,
  };
}

function createAuthenticatedUser(id, role = [{ role: "diner" }]) {
  const user = createUser(id, role);
  user.isRole = (roleToCheck) =>
    user.roles.some((userRole) => userRole.role === roleToCheck);
  return user;
}

function createDiner(createUserFn = createUser) {
  return createUserFn(7);
}

function createAdmin() {
  return createAuthenticatedUser(1, [{ role: "admin" }]);
}

function createFranchisee(createUserFn = createUser) {
  return createUserFn(2, [{ role: "franchisee" }]);
}

function getRouteHandler(router, method, path) {
  const layer = router.stack.find(
    (stackLayer) =>
      stackLayer.route?.methods[method] &&
      (path === undefined || stackLayer.route.path === path),
  );
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function getRouteHandlers(router, method, path) {
  const layer = router.stack.find(
    (stackLayer) =>
      stackLayer.route?.path === path && stackLayer.route.methods[method],
  );

  return layer.route.stack.map((routeLayer) => routeLayer.handle);
}

module.exports = {
  createResponse,
  createUser,
  createAuthenticatedUser,
  createDiner,
  createAdmin,
  createFranchisee,
  getRouteHandler,
  getRouteHandlers,
};
