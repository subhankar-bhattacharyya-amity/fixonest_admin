import { Suspense, useEffect } from "react";
import AppRoutes from "../routes/index.jsx";
import { PageLoader } from "@/components/common/loader/index.js";
import { useAuth, ROLES } from "@/features/auth/index.js";

function getTabTitle(role) {
  if (role === ROLES.SUPER_ADMIN) return "Fixonest Super Admin";
  if (role === ROLES.PROVIDER) return "Fixonest Provider";
  if (role === ROLES.ADMIN) return "Fixonest Admin";
  return "Fixonest Admin";
}

// App stays small; navigation decisions belong in the routes folder.
// One Suspense boundary here covers every lazy-loaded page route, so
// individual routes never need to wrap themselves in <Suspense>.
function App() {
  const { role } = useAuth();

  useEffect(() => {
    document.title = getTabTitle(role);
  }, [role]);

  return (
    <Suspense fallback={<PageLoader />}>
      <AppRoutes />
    </Suspense>
  );
}

export default App;
