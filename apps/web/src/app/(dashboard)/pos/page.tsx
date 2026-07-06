"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PosWorkspace } from "@/components/pos/PosWorkspace";
import { useSoleBranch } from "@/hooks/useSoleBranch";
import type { RegisterResponse } from "@/types/branch";

async function fetchRegisters(branchId: string): Promise<RegisterResponse[]> {
  const res = await api.get<{ data: RegisterResponse[] }>("/api/registers", { params: { branchId } });
  return res.data.data;
}

export default function PosPage() {
  const [manualBranchId, setManualBranchId] = useState("");
  const [registerId, setRegisterId] = useState("");
  const { branches, hasMultiple, soleBranchId } = useSoleBranch();
  const branchId = hasMultiple ? manualBranchId : soleBranchId;

  const { data: registers } = useQuery({
    queryKey: ["registers", branchId],
    queryFn: () => fetchRegisters(branchId),
    enabled: !!branchId,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">POS</h1>
      <div className="flex gap-4">
        {hasMultiple && (
          <div className="max-w-xs flex-1 space-y-2">
            <label htmlFor="pos-branch" className="text-sm font-medium">
              Sucursal
            </label>
            <select
              id="pos-branch"
              value={manualBranchId}
              onChange={(e) => {
                setManualBranchId(e.target.value);
                setRegisterId("");
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecciona una sucursal</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="max-w-xs flex-1 space-y-2">
          <label htmlFor="pos-register" className="text-sm font-medium">
            Caja
          </label>
          <select
            id="pos-register"
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            disabled={!branchId}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Selecciona una caja</option>
            {registers?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {registerId && <PosWorkspace registerId={registerId} />}
    </div>
  );
}
