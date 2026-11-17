import React, { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bot,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { useDataStore } from "@/src/hooks/useDataStore";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/enquiries", label: "Enquiries", icon: Inbox },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const ROUTE_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: "/dashboard", title: "Dashboard" },
  { prefix: "/customers/", title: "Customer Profile" },
  { prefix: "/customers", title: "Customers" },
  { prefix: "/enquiries", title: "Enquiries" },
  { prefix: "/orders", title: "Orders" },
  { prefix: "/products", title: "Products & Inventory" },
  { prefix: "/invoices", title: "Invoices" },
  { prefix: "/assistant", title: "AI Business Assistant" },
  { prefix: "/reports", title: "Reports" },
  { prefix: "/settings", title: "Settings" },
];

export function AppShell() {
  const { user, settings, logout } = useDataStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const currentPageTitle =
    ROUTE_TITLES.find((r) => location.pathname.startsWith(r.prefix))?.title ??
    "Workspace";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const sidebarContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      <div
        className={cn(
          "flex h-14 items-center border-b border-slate-200 px-4",
          !isMobile && collapsed ? "justify-center" : "justify-between"
        )}
      >
        <button
          type="button"
          onClick={() => {
            navigate("/dashboard");
            if (isMobile) setMobileOpen(false);
          }}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md cursor-pointer"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-900 text-white">
            <Compass className="h-4 w-4" />
          </div>
          {(isMobile || !collapsed) && (
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              BizPilot AI
            </span>
          )}
        </button>

        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          !collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (isMobile) setMobileOpen(false);
              }}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-blue-50 text-blue-900 font-semibold"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                  !isMobile && collapsed && "justify-center px-0"
                )
              }
              title={!isMobile && collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {(isMobile || !collapsed) && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {!isMobile && collapsed && (
        <div className="border-t border-slate-200 p-2.5 flex justify-center">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {(isMobile || !collapsed) && (
        <div className="border-t border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-900 truncate">
            {settings.businessName}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 truncate">
            {settings.currency} · {settings.taxLabel} {settings.taxRate}%
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:block shrink-0 transition-[width] duration-150",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        <div className="sticky top-0 h-screen">{sidebarContent(false)}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full">
            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400 whitespace-nowrap">
                {settings.businessName}
              </span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate">
                {currentPageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/assistant")}
              className="hidden sm:inline-flex"
            >
              <Bot className="h-3.5 w-3.5 text-blue-700" />
              Ask Assistant
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-md border border-slate-200 bg-white py-1 pl-1.5 pr-2.5 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                >
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      referrerPolicy="no-referrer"
                      className="h-7 w-7 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-900 text-xs font-semibold text-white">
                      {(user?.fullName || "O").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden md:inline text-xs font-medium text-slate-800 whitespace-nowrap">
                    {user?.fullName || "Owner"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {user?.fullName}
                  </div>
                  <div className="text-xs font-normal text-slate-500 truncate">
                    {user?.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="h-4 w-4 text-slate-500" />
                  Workspace Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-700 focus:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
