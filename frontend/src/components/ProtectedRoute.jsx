import { Navigate, useLocation } from "react-router-dom";

function getLoggedInUser() {
  try {
    const user = localStorage.getItem("cropp_user");

    if (!user) {
      return null;
    }

    return JSON.parse(user);
  } catch (error) {
    console.error("Invalid CROPP user session:", error);
    return null;
  }
}

function getHomeRoute(role) {
  switch (role) {
    case "ADMIN":
      return "/";

    case "FARMER":
      return "/farmer";

    case "CONSUMER":
      return "/consumer";

    default:
      return "/login";
  }
}

function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const user = getLoggedInUser();

  // No login session
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // User does not have permission for this route
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  // Access allowed
  return children;
}

export default ProtectedRoute;