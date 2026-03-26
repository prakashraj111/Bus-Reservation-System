import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAuthToken } from "../utils/auth";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = getAuthToken();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

export default ProtectedRoute;
