"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import type { BranchResponse } from "@/types/branch";

interface DeactivateBranchDialogProps {
  branch: BranchResponse;
  trigger: React.ReactNode;
}

export function DeactivateBranchDialog({ branch, trigger }: DeactivateBranchDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.delete(`/api/branches/${branch.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setOpen(false);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al desactivar";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desactivar {branch.name}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Esta sucursal dejara de aparecer en la lista. Esta accion no se puede deshacer desde aqui.
        </p>
        <DialogFooter>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Desactivando..." : "Confirmar desactivacion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
