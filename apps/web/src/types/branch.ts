export interface BranchResponse {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  createdAt: string;
}

export interface RegisterResponse {
  id: string;
  name: string;
  branchId: string;
  active: boolean;
}

export interface CreateBranchRequest {
  name: string;
  address: string;
}

export interface UpdateBranchRequest {
  name: string;
  address: string;
}

export interface CreateRegisterRequest {
  name: string;
  branchId: string;
}

export interface UpdateRegisterRequest {
  name: string;
}
