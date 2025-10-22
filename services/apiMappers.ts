import { PaymentMethod, ProductType, PurchaseOrderStatus } from '../types';

// PaymentMethod mapping between UI (FR labels) and API (enum keys)
const paymentUiToApi: Record<string, string> = {
  [PaymentMethod.CASH]: 'CASH',
  [PaymentMethod.CARD]: 'CARD',
  [PaymentMethod.MOBILE_MONEY]: 'MOBILE_MONEY',
};

const paymentApiToUi: Record<string, PaymentMethod> = {
  CASH: PaymentMethod.CASH,
  CARD: PaymentMethod.CARD,
  MOBILE_MONEY: PaymentMethod.MOBILE_MONEY,
};

export function toApiPaymentMethod(method: PaymentMethod): 'CASH' | 'CARD' | 'MOBILE_MONEY' {
  return (paymentUiToApi[method] || 'CASH') as any;
}

export function fromApiPaymentMethod(method: string): PaymentMethod {
  return paymentApiToUi[method] ?? PaymentMethod.CASH;
}

// ProductType mapping UI (FR) <-> API (enum keys)
const productTypeUiToApi: Record<string, string> = {
  [ProductType.STANDARD]: 'STANDARD',
  [ProductType.VARIABLE]: 'VARIABLE',
  [ProductType.BUNDLE]: 'BUNDLE',
};

const productTypeApiToUi: Record<string, ProductType> = {
  STANDARD: ProductType.STANDARD,
  VARIABLE: ProductType.VARIABLE,
  BUNDLE: ProductType.BUNDLE,
};

export function toApiProductType(t: ProductType): 'STANDARD' | 'VARIABLE' | 'BUNDLE' {
  return (productTypeUiToApi[t] || 'STANDARD') as any;
}

export function fromApiProductType(t: string): ProductType {
  return productTypeApiToUi[t] ?? ProductType.STANDARD;
}

// PurchaseOrderStatus mapping UI (FR) <-> API (enum keys)
const poStatusUiToApi: Record<string, string> = {
  [PurchaseOrderStatus.DRAFT]: 'DRAFT',
  [PurchaseOrderStatus.PENDING]: 'PENDING',
  [PurchaseOrderStatus.ORDERED]: 'ORDERED',
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'PARTIALLY_RECEIVED',
  [PurchaseOrderStatus.RECEIVED]: 'RECEIVED',
  [PurchaseOrderStatus.CANCELLED]: 'CANCELLED',
};

const poStatusApiToUi: Record<string, PurchaseOrderStatus> = {
  DRAFT: PurchaseOrderStatus.DRAFT,
  PENDING: PurchaseOrderStatus.PENDING,
  ORDERED: PurchaseOrderStatus.ORDERED,
  PARTIALLY_RECEIVED: PurchaseOrderStatus.PARTIALLY_RECEIVED,
  RECEIVED: PurchaseOrderStatus.RECEIVED,
  CANCELLED: PurchaseOrderStatus.CANCELLED,
};

export function toApiPurchaseOrderStatus(s: PurchaseOrderStatus): 'DRAFT' | 'PENDING' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED' {
  return (poStatusUiToApi[s] || 'DRAFT') as any;
}

export function fromApiPurchaseOrderStatus(s: string): PurchaseOrderStatus {
  return poStatusApiToUi[s] ?? PurchaseOrderStatus.DRAFT;
}

