import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useDataStore } from "@/src/hooks/useDataStore";
import { Skeleton } from "@/src/components/ui/skeleton";

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useDataStore();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
