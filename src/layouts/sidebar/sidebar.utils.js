// Pure helpers that turn sidebar.data.js's tree into what one logged-in role
// actually sees. Kept out of Sidebar.jsx so the rules live in one place.

// Drops every node the role can't see (a nested node without `roles`
// inherits its parent's), drops accordions left with no visible children,
// and turns each leaf's relative `path` into an absolute one under basePath.
export function resolveMenuForRole(nodes, role, basePath, inheritedRoles = null) {
  return nodes.flatMap((node) => {
    const roles = node.roles ?? inheritedRoles;
    if (!roles?.includes(role)) return [];

    if (node.children) {
      const children = resolveMenuForRole(node.children, role, basePath, roles);
      return children.length ? [{ ...node, children }] : [];
    }

    return [{ ...node, path: node.path ? `${basePath}/${node.path}` : basePath }];
  });
}

// True when pathname is this exact link or one of its sub-pages. The
// dashboard itself only matches exactly, since every page sits below it.
export function isPathActive(itemPath, pathname, basePath) {
  if (itemPath === basePath) return pathname === basePath;
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

// True when any leaf under node (at any depth) is the current page - used to
// highlight an accordion and open it by default.
export function isBranchActive(node, pathname, basePath) {
  if (!node.children) return isPathActive(node.path, pathname, basePath);
  return node.children.some((child) => isBranchActive(child, pathname, basePath));
}
