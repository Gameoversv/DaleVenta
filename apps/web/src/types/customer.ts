export interface CustomerResponse {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  documentId: string | null;
  active: boolean;
  createdAt: string;
}

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  documentId?: string;
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;
