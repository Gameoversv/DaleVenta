"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ProductSearchPanel } from "./ProductSearchPanel";
import { SaleCart, resolveCart } from "./SaleCart";
import { CustomerPicker } from "./CustomerPicker";
import { CheckoutPanel } from "./CheckoutPanel";
import { SaleConfirmation } from "./SaleConfirmation";
import type { CartLine } from "./cart";
import type { ProductResponse } from "@/types/product";
import type { CustomerResponse } from "@/types/customer";
import type { CreateSaleRequest, PaymentRequest, RentalDetailsRequest, SaleResponse } from "@/types/sale";
import type { FiscalReceiptSequence, FiscalReceiptType } from "@/types/fiscal";
import type { TenantFeatures } from "@/types/auth";

async function fetchProducts(): Promise<ProductResponse[]> {
  const res = await api.get<{ data: ProductResponse[] }>("/api/products");
  return res.data.data;
}

async function fetchFiscalStatus(): Promise<TenantFeatures> {
  const res = await api.get<{ data: TenantFeatures }>("/api/fiscal/status");
  return res.data.data;
}

async function fetchFiscalSequences(): Promise<FiscalReceiptSequence[]> {
  const res = await api.get<{ data: FiscalReceiptSequence[] }>("/api/fiscal/sequences");
  return res.data.data ?? [];
}

interface SaleWorkspaceProps {
  registerId: string;
  cashShiftId: string;
}

export function SaleWorkspace({ registerId, cashShiftId }: SaleWorkspaceProps) {
  const { tenantFeatures } = useAuth();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [confirmedSale, setConfirmedSale] = useState<SaleResponse | null>(null);

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: fiscalStatus } = useQuery({ queryKey: ["fiscal-status"], queryFn: fetchFiscalStatus });
  const fiscalModuleEnabled = fiscalStatus?.fiscalModuleEnabled === true;
  const { data: fiscalSequences = [] } = useQuery({
    queryKey: ["fiscal-sequences"],
    queryFn: fetchFiscalSequences,
    enabled: fiscalModuleEnabled,
  });

  const createSale = useMutation({
    mutationFn: (request: CreateSaleRequest) => api.post<{ data: SaleResponse }>("/api/sales", request),
    onSuccess: (res) => {
      setConfirmedSale(res.data.data);
      queryClient.invalidateQueries({ queryKey: ["cash-shift-current", registerId] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al procesar la venta";
      toast.error(message);
    },
  });

  const addProduct = (product: ProductResponse) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId: product.id, quantity: 1, useWholesalePrice: false }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)));
  };

  const toggleWholesale = (productId: string) => {
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, useWholesalePrice: !l.useWholesalePrice } : l)));
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  const resetWorkspace = () => {
    setCart([]);
    setCustomer(null);
    setConfirmedSale(null);
  };

  if (confirmedSale) {
    return (
      <SaleConfirmation
        sale={confirmedSale}
        products={products ?? []}
        registerId={registerId}
        onNewSale={resetWorkspace}
      />
    );
  }

  const resolved = resolveCart(cart, products ?? []);
  const preDiscountTotal = resolved.reduce((sum, r) => sum + r.lineTotal, 0);
  const productById = new Map((products ?? []).map((product) => [product.id, product]));
  const hasRentalItems = cart.some((line) => productById.get(line.productId)?.rentable);

  const handleConfirm = (
    payments: PaymentRequest[],
    discountAmount: number,
    fiscalReceiptType?: FiscalReceiptType | null,
    rentalDetails?: RentalDetailsRequest
  ) => {
    const request: CreateSaleRequest = {
      registerId,
      cashShiftId,
      customerId: customer?.id ?? null,
      fiscalReceiptType: fiscalReceiptType ?? null,
      discountAmount: discountAmount > 0 ? discountAmount.toFixed(2) : undefined,
      rentalDetails,
      items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, useWholesalePrice: l.useWholesalePrice })),
      payments,
    };
    createSale.mutate(request);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <ProductSearchPanel products={products ?? []} onSelect={addProduct} />
        <SaleCart
          cart={cart}
          products={products ?? []}
          discountAmount={0}
          onUpdateQuantity={updateQuantity}
          onToggleWholesale={toggleWholesale}
          onRemove={removeLine}
        />
      </div>
      <div className="space-y-6">
        <CustomerPicker customer={customer} onChange={setCustomer} />
        <CheckoutPanel
          registerId={registerId}
          customer={customer}
          preDiscountTotal={preDiscountTotal}
          disabled={cart.length === 0}
          isSubmitting={createSale.isPending}
          fiscalModuleEnabled={fiscalModuleEnabled}
          fiscalSequences={fiscalSequences}
          cashDenominationsEnabled={fiscalStatus?.cashDenominationsEnabled ?? tenantFeatures.cashDenominationsEnabled}
          hasRentalItems={hasRentalItems}
          onConfirm={handleConfirm}
        />
      </div>
    </div>
  );
}
