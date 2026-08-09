"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Pushes this tenant's trial out by a chosen number of days. */
export function ExtendTrialDialog({ tenantId }: Readonly<{ tenantId: string }>) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("30");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.post(`/api/super-admin/tenants/${tenantId}/extend-trial`, null, { params: { days } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-tenant", tenantId] });
      setOpen(false);
      toast.success("Trial extendido");
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Extender trial
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extender trial</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="extend-days">Dias</Label>
          <Input id="extend-days" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Extendiendo..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
