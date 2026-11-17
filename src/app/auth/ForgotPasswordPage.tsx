import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, CheckCircle2, Compass, Loader2 } from "lucide-react";
import { authService } from "@/src/services";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/src/schemas";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";

export function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null);
    try {
      await authService.forgotPassword(values.email);
      setSubmittedEmail(values.email);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Unable to send reset link. Verify your FastAPI backend is reachable."
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-900 text-white">
            <Compass className="h-4 w-4" />
          </div>
          <span className="text-base font-bold text-slate-900">BizPilot AI</span>
        </div>

        {submittedEmail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <h1 className="text-lg font-semibold text-slate-900">
                Check your inbox
              </h1>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              If an account exists for{" "}
              <span className="font-medium text-slate-900">{submittedEmail}</span>,
              we sent password reset instructions to that address.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Reset your password
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Enter your work email and we will send a password reset link.
              </p>
            </div>

            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Work Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="owner@company.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
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
                    Sending instructions...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
