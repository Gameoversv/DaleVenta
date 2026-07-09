export interface CategoryResponse {
  id: string;
  name: string;
  active: boolean;
}

export interface CreateCategoryRequest {
  name: string;
}

export interface ProductResponse {
  id: string;
  categoryId: string;
  internalCode: string;
  barcode: string | null;
  description: string;
  unit: string;
  cost: string | null;
  salePrice: string | null;
  wholesalePrice: string | null;
  taxRate: string;
  tracksInventory: boolean;
  rentable: boolean;
  active: boolean;
}

export interface CreateProductRequest {
  categoryId: string;
  internalCode: string;
  barcode: string | null;
  description: string;
  unit: string;
  cost: string;
  salePrice: string;
  wholesalePrice: string;
  taxRate: string;
  tracksInventory: boolean;
  rentable: boolean;
}

export interface UpdateProductRequest {
  categoryId: string;
  description: string;
  unit: string;
  cost: string;
  salePrice: string;
  wholesalePrice: string;
  taxRate: string;
  tracksInventory: boolean;
  rentable: boolean;
  active: boolean;
}

export interface BranchInventoryResponse {
  productId: string;
  currentStock: number;
  minStock: number | null;
  maxStock: number | null;
}

export type InventoryMovementType = "ENTRY" | "EXIT" | "ADJUSTMENT";

export interface CreateInventoryMovementRequest {
  branchId: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
}
