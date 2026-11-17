import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bot,
  Copy,
  Inbox,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useDataStore } from "@/src/hooks/useDataStore";
import { enquirySchema, type EnquiryFormValues } from "@/src/schemas";
import { formatDateTime } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Pagination } from "@/src/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { StatusIndicator } from "@/src/components/ui/status-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Textarea } from "@/src/components/ui/textarea";
import type { Enquiry, EnquiryStatus } from "@/src/types";

const PAGE_SIZE = 6;
const STATUS_OPTIONS: Array<"All" | EnquiryStatus> = [
  "All",
  "New",
  "In Progress",
  "Converted",
  "Closed",
];

export function EnquiriesPage() {
  const { enquiries, createEnquiry, updateEnquiryStatus, suggestEnquiryReply } =
    useDataStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | EnquiryStatus>("All");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);
  const [draftReply, setDraftReply] = useState("");
  const [replyTone, setReplyTone] = useState("professional");
  const [isDrafting, setIsDrafting] = useState(false);

  useEffect(() => {
    const paramId = searchParams.get("enquiry");
    if (paramId && enquiries.some((e) => e.id === paramId)) {
      setSelectedEnquiryId(paramId);
      const found = enquiries.find((e) => e.id === paramId);
      setDraftReply(found?.aiDraftReply || "");
    }
  }, [searchParams, enquiries]);

  const selectedEnquiry: Enquiry | null = useMemo(
    () => enquiries.find((e) => e.id === selectedEnquiryId) || null,
    [enquiries, selectedEnquiryId]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryFormValues>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      subject: "",
      message: "",
      status: "New",
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enquiries.filter((e) => {
      const matchesStatus = statusFilter === "All" || e.status === statusFilter;
      const matchesQuery =
        !q ||
        e.customerName.toLowerCase().includes(q) ||
        e.customerEmail.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [enquiries, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openDetail(enq: Enquiry) {
    setSelectedEnquiryId(enq.id);
    setDraftReply(enq.aiDraftReply || "");
  }

  function closeDetail() {
    setSelectedEnquiryId(null);
    if (searchParams.has("enquiry")) {
      searchParams.delete("enquiry");
      setSearchParams(searchParams);
    }
  }

  async function onCreateSubmit(values: EnquiryFormValues) {
    try {
      await createEnquiry(values);
      toast.success("Enquiry logged");
      reset();
      setCreateOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create enquiry");
    }
  }

  async function handleStatusChange(id: string, status: EnquiryStatus) {
    try {
      await updateEnquiryStatus(id, status);
      toast.success(`Status updated to ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleGenerateAiReply() {
    if (!selectedEnquiry) return;
    setIsDrafting(true);
    try {
      const draft = await suggestEnquiryReply(selectedEnquiry.id, replyTone);
      setDraftReply(draft);
      toast.success("AI reply suggestion ready");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to generate AI reply"
      );
    } finally {
      setIsDrafting(false);
    }
  }

  async function handleCopyDraft() {
    if (!draftReply.trim()) return;
    await navigator.clipboard.writeText(draftReply);
    toast.success("Reply copied to clipboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Enquiries
          </h2>
          <p className="text-sm text-slate-500">
            Track inbound customer requests, update lead stages, and draft AI replies.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            reset();
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New Enquiry
        </Button>
      </div>

      <Card>
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100">
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search customer, subject, message..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1 self-start lg:self-auto">
            {STATUS_OPTIONS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {paginated.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Inbox}
              title="No enquiries found"
              description="Log a customer enquiry manually or adjust your active filters."
              actionLabel="New Enquiry"
              onAction={() => setCreateOpen(true)}
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject & Message</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((enq) => (
                  <TableRow
                    key={enq.id}
                    onClick={() => openDetail(enq)}
                    className="cursor-pointer"
                  >
                    <TableCell className="max-w-md">
                      <div className="font-medium text-slate-900 truncate">
                        {enq.subject}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 truncate">
                        {enq.message}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-800">
                        {enq.customerName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {enq.customerEmail}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusIndicator status={enq.status} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(enq.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(enq);
                        }}
                      >
                        Review & Reply
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Create Enquiry Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Customer Enquiry</DialogTitle>
            <DialogDescription>
              Log a new inbound question or wholesale request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4" noValidate>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="enq-name">Customer Name</Label>
                <Input id="enq-name" {...register("customerName")} />
                {errors.customerName && (
                  <p className="text-xs text-red-600">
                    {errors.customerName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enq-email">Customer Email</Label>
                <Input id="enq-email" type="email" {...register("customerEmail")} />
                {errors.customerEmail && (
                  <p className="text-xs text-red-600">
                    {errors.customerEmail.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="enq-phone">Phone (Optional)</Label>
                <Input id="enq-phone" {...register("customerPhone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enq-subject">Subject</Label>
                <Input id="enq-subject" {...register("subject")} />
                {errors.subject && (
                  <p className="text-xs text-red-600">{errors.subject.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enq-message">Enquiry Message</Label>
              <Textarea id="enq-message" rows={4} {...register("message")} />
              {errors.message && (
                <p className="text-xs text-red-600">{errors.message.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Enquiry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enquiry Detail + AI Reply Dialog */}
      <Dialog
        open={Boolean(selectedEnquiry)}
        onOpenChange={(open) => !open && closeDetail()}
      >
        <DialogContent className="max-w-2xl">
          {selectedEnquiry && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEnquiry.subject}</DialogTitle>
                <DialogDescription>
                  Received {formatDateTime(selectedEnquiry.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                {/* Customer & Status Bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-sm text-slate-900">
                      {selectedEnquiry.customerName}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {selectedEnquiry.customerEmail}
                      </span>
                      {selectedEnquiry.customerPhone && (
                        <span className="inline-flex items-center gap-1 font-mono-tabular">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {selectedEnquiry.customerPhone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full sm:w-44">
                    <Select
                      value={selectedEnquiry.status}
                      onValueChange={(val) =>
                        handleStatusChange(selectedEnquiry.id, val as EnquiryStatus)
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Converted">Converted</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Customer Message */}
                <div className="space-y-1.5">
                  <Label>Customer Message</Label>
                  <div className="rounded-md border border-slate-200 bg-white p-3.5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedEnquiry.message}
                  </div>
                </div>

                {/* AI Reply Generator */}
                <div className="space-y-2.5 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="ai-reply-box">Reply Draft</Label>
                    <div className="flex items-center gap-2">
                      <Select value={replyTone} onValueChange={setReplyTone}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="warm">Warm & Friendly</SelectItem>
                          <SelectItem value="concise">Concise Direct</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleGenerateAiReply}
                        disabled={isDrafting}
                      >
                        {isDrafting ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Drafting...
                          </>
                        ) : (
                          <>
                            <Bot className="h-3.5 w-3.5" />
                            Suggest AI Reply
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    id="ai-reply-box"
                    rows={6}
                    value={draftReply}
                    onChange={(e) => setDraftReply(e.target.value)}
                    placeholder="Click 'Suggest AI Reply' to generate a response grounded in this enquiry, or type your own reply..."
                  />
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/orders?new=1")}
                >
                  Convert to Order
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyDraft}
                    disabled={!draftReply.trim()}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Reply
                  </Button>
                  <Button type="button" variant="default" onClick={closeDetail}>
                    Done
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
