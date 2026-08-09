"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreditProfileResponse, UpdateCreditProfileRequest } from "@/types/credit";

interface CreditProfileDraft {
  creditEnabled: boolean;
  creditLimit: string;
}

interface CreditProfileSectionProps {
  customerId: string;
  profile: CreditProfileResponse | undefined;
  /** Only a user who can authorise credit may change the terms; everyone else reads them. */
  canAuthorize: boolean;
}

/** The credit terms, in the one sentence a cashier needs when they cannot change them. */
function profileSummary(profile: CreditProfileResponse | undefined): string {
  if (!profile?.creditEnabled) return "Credito no habilitado";
  if (profile.creditLimit == null) return "Habilitado, credito abierto (sin limite)";
  return `Habilitado, limite RD$${profile.creditLimit}`;
}

/**
 * Whether this customer may buy on credit, and up to how much.
 *
 * The draft starts as null so the fields read straight from the fetched profile. Copying the
 * profile into state from an effect meant a background refetch could overwrite whatever the user
 * was in the middle of typing; an untouched form still follows the server either way.
 */
export function CreditProfileSection({ customerId, profile, canAuthorize }: Readonly<CreditProfileSectionProps>) {
  const [draft, setDraft] = useState<CreditProfileDraft | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: UpdateCreditProfileRequest) =>
      api.put(`/api/customers/${customerId}/credit-profile`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-profile", customerId] });
      // Hand the fields back to the server copy now that it holds what was just saved.
      setDraft(null);
      toast.success("Perfil de credito actualizado");
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Error al guardar")),
  });

  const form: CreditProfileDraft = draft ?? {
    creditEnabled: profile?.creditEnabled ?? false,
    creditLimit: profile?.creditLimit ?? "",
  };
  const patch = (values: Partial<CreditProfileDraft>) => setDraft({ ...form, ...values });

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Perfil</h3>
      {canAuthorize ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({
              creditEnabled: form.creditEnabled,
              creditLimit: form.creditLimit.trim() === "" ? null : form.creditLimit,
            });
          }}
        >
          <div className="flex items-center gap-2">
            <input
              id="credit-enabled"
              type="checkbox"
              checked={form.creditEnabled}
              onChange={(event) => patch({ creditEnabled: event.target.checked })}
            />
            <Label htmlFor="credit-enabled">Credito habilitado</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="credit-limit">Limite de credito (vacio = credito abierto, sin limite)</Label>
            <Input
              id="credit-limit"
              placeholder="Sin limite"
              value={form.creditLimit}
              onChange={(event) => patch({ creditLimit: event.target.value })}
            />
          </div>
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando..." : "Guardar perfil"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">{profileSummary(profile)}</p>
      )}
    </section>
  );
}
