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
  active: boolean;
}
