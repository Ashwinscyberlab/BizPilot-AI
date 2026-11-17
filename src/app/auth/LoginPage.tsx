import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Compass, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDataStore } from "@/src/hooks/useDataStore";
import { loginSchema, type LoginFormValues } from "@/src/schemas";
import { getApiBaseUrl } from "@/src/lib/env";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";

export function LoginPage() {
  const { loginWithBackend, enterDevDemo } = useDataStore();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await loginWithBackend(values);
      toast.success("Signed in to BizPilot AI");
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to sign in. Check your FastAPI server connection.";
      setServerError(msg);
    }
  }

  function handleOpenDevDemo() {
    enterDevDemo();
    toast.success("Loaded development demo workspace");
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left Structural Navy Column */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-12 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-700 text-white">
            <Compass className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">BizPilot AI</span>
        </div>

        <div className="max-w-md space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight leading-tight text-white">
            Run orders, inventory, invoicing, and customer enquiries from one operational console.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Built for small business owners who need clear numbers, fast invoice generation, and an AI assistant grounded in real store data.
          </p>
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-800">
            <div>
              <div className="text-sm font-semibold text-white">Live Stock Tracking</div>
              <p className="mt-1 text-xs text-slate-400">
                Automatic order deductions and reorder alerts.
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Instant PDF Invoices</div>
              <p className="mt-1 text-xs text-slate-400">
                Convert fulfilled orders into tax-ready invoices.
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          FastAPI Endpoint: <span className="font-mono text-slate-300">{getApiBaseUrl()}</span>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-7">
          <div className="lg:hidden flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-900 text-white">
              <Compass className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-slate-900">BizPilot AI</span>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Sign in to your workspace
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Enter your credentials to connect to your BizPilot backend.
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <div>
                <div className="font-semibold">Authentication failed</div>
                <p className="mt-0.5 text-red-700">{serverError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@company.com"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400">
                Or preview without FastAPI running
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleOpenDevDemo}
          >
            Open Development Demo Workspace
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-center text-xs text-slate-500">
            Do not have an account?{" "}
            <Link to="/register" className="font-semibold text-blue-700 hover:underline">
              Create workspace account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
