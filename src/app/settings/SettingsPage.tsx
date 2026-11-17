import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, RefreshCw, RotateCcw, Server } from "lucide-react";
import { toast } from "sonner";
import { useDataStore } from "@/src/hooks/useDataStore";
import { getApiBaseUrl, setCustomApiBaseUrl } from "@/src/lib/env";
import { checkBackendHealth } from "@/src/services";
import {
  accountSettingsSchema,
  businessSettingsSchema,
  type AccountSettingsFormValues,
  type BusinessSettingsFormValues,
} from "@/src/schemas";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";

export function SettingsPage() {
  const {
    user,
    settings,
    connectionMode,
    updateBusinessSettings,
    updateAccountSettings,
    resetDevWorkspace,
  } = useDataStore();

  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [healthStatus, setHealthStatus] = useState<{
    checked: boolean;
    reachable: boolean;
    url: string;
  } | null>(null);
  const [testingHealth, setTestingHealth] = useState(false);

  const bizForm = useForm<BusinessSettingsFormValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: settings,
  });

  const accForm = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
    },
  });

  const selectedCurrency = bizForm.watch("currency");

  async function onBusinessSubmit(values: BusinessSettingsFormValues) {
    try {
      await updateBusinessSettings(values);
      toast.success("Business and tax settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    }
  }

  async function onAccountSubmit(values: AccountSettingsFormValues) {
    try {
      await updateAccountSettings(values);
      toast.success("Account details updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update account");
    }
  }

  async function handleTestBackend() {
    setCustomApiBaseUrl(apiUrl);
    setTestingHealth(true);
    const res = await checkBackendHealth();
    setHealthStatus({ checked: true, ...res });
    setTestingHealth(false);
    if (res.reachable) {
      toast.success(`Connected to FastAPI at ${res.url}`);
    } else {
      toast.error(`FastAPI backend not reachable at ${res.url}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Settings
        </h2>
        <p className="text-sm text-slate-500">
          Configure business profile, currency and tax defaults, and backend API integration.
        </p>
      </div>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business & Tax</TabsTrigger>
          <TabsTrigger value="account">Account & API</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <form
            onSubmit={bizForm.handleSubmit(onBusinessSubmit)}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            noValidate
          >
            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>
                  Displayed on customer invoices, PDFs, and AI-drafted correspondence.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-name">Business Name</Label>
                    <Input id="biz-name" {...bizForm.register("businessName")} />
                    {bizForm.formState.errors.businessName && (
                      <p className="text-xs text-red-600">
                        {bizForm.formState.errors.businessName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-email">Business Email</Label>
                    <Input
                      id="biz-email"
                      type="email"
                      {...bizForm.register("businessEmail")}
                    />
                    {bizForm.formState.errors.businessEmail && (
                      <p className="text-xs text-red-600">
                        {bizForm.formState.errors.businessEmail.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-phone">Phone Number</Label>
                    <Input id="biz-phone" {...bizForm.register("phone")} />
                    {bizForm.formState.errors.phone && (
                      <p className="text-xs text-red-600">
                        {bizForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-web">Website</Label>
                    <Input id="biz-web" {...bizForm.register("website")} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-addr">Street Address</Label>
                  <Input id="biz-addr" {...bizForm.register("address")} />
                  {bizForm.formState.errors.address && (
                    <p className="text-xs text-red-600">
                      {bizForm.formState.errors.address.message}
                    </p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-city">City / State</Label>
                    <Input id="biz-city" {...bizForm.register("city")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-country">Country</Label>
                    <Input id="biz-country" {...bizForm.register("country")} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <CardHeader>
                  <CardTitle>Currency & Tax Settings</CardTitle>
                  <CardDescription>
                    Applied automatically when creating orders and invoices.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Default Currency</Label>
                    <Select
                      value={selectedCurrency}
                      onValueChange={(val) =>
                        bizForm.setValue(
                          "currency",
                          val as BusinessSettingsFormValues["currency"]
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($) — US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR (€) — Euro</SelectItem>
                        <SelectItem value="GBP">GBP (£) — British Pound</SelectItem>
                        <SelectItem value="CAD">CAD ($) — Canadian Dollar</SelectItem>
                        <SelectItem value="AUD">AUD ($) — Australian Dollar</SelectItem>
                        <SelectItem value="INR">INR (₹) — Indian Rupee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="tax-label">Tax Label</Label>
                      <Input id="tax-label" {...bizForm.register("taxLabel")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                      <Input
                        id="tax-rate"
                        type="number"
                        step="0.1"
                        className="font-mono-tabular"
                        {...bizForm.register("taxRate", { valueAsNumber: true })}
                      />
                      {bizForm.formState.errors.taxRate && (
                        <p className="text-xs text-red-600">
                          {bizForm.formState.errors.taxRate.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-prefix">Invoice Prefix</Label>
                      <Input
                        id="inv-prefix"
                        className="font-mono-tabular"
                        {...bizForm.register("invoicePrefix")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-terms">Payment Terms (Days)</Label>
                      <Input
                        id="inv-terms"
                        type="number"
                        className="font-mono-tabular"
                        {...bizForm.register("invoicePaymentTermsDays", {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="border-t border-slate-100 p-5 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={bizForm.formState.isSubmitting}
                >
                  {bizForm.formState.isSubmitting
                    ? "Saving..."
                    : "Save Business Settings"}
                </Button>
              </div>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="account">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-6">
              <CardHeader>
                <CardTitle>Owner Account</CardTitle>
                <CardDescription>
                  Manage your display name and login email address.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={accForm.handleSubmit(onAccountSubmit)}
                  className="space-y-4"
                  noValidate
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="acc-name">Full Name</Label>
                    <Input id="acc-name" {...accForm.register("fullName")} />
                    {accForm.formState.errors.fullName && (
                      <p className="text-xs text-red-600">
                        {accForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="acc-email">Email Address</Label>
                    <Input
                      id="acc-email"
                      type="email"
                      {...accForm.register("email")}
                    />
                    {accForm.formState.errors.email && (
                      <p className="text-xs text-red-600">
                        {accForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={accForm.formState.isSubmitting}
                  >
                    Update Account
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-6">
              <CardHeader>
                <CardTitle>FastAPI Backend Connection</CardTitle>
                <CardDescription>
                  Active session mode:{" "}
                  <span className="font-semibold text-slate-900">
                    {connectionMode === "fastapi"
                      ? "Connected to FastAPI"
                      : "Development Demo Workspace"}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="api-url">Backend Base URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-url"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="http://localhost:8000"
                      className="font-mono-tabular"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestBackend}
                      disabled={testingHealth}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          testingHealth ? "animate-spin" : ""
                        }`}
                      />
                      Test
                    </Button>
                  </div>
                </div>

                {healthStatus?.checked && (
                  <div
                    className={`flex items-center gap-2 rounded-md border p-3 text-xs ${
                      healthStatus.reachable
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {healthStatus.reachable ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Server className="h-4 w-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      {healthStatus.reachable
                        ? `FastAPI server responded at ${healthStatus.url}/health.`
                        : `Could not reach ${healthStatus.url}/health. Ensure FastAPI is running with CORS enabled.`}
                    </span>
                  </div>
                )}

                {connectionMode === "dev_demo" && (
                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Reset Development Demo Data
                      </div>
                      <p className="text-xs text-slate-500">
                        Restore initial demo customers, products, orders, and invoices.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetDevWorkspace();
                        toast.success("Development demo data restored");
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
