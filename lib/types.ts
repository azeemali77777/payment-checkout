// Cart and Product Types
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

// Payment Types
export interface PaymentFormData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface PaymentRequest {
  cart: Cart;
  payment: Omit<PaymentFormData, 'cvv'> & { 
    cardNumberLast4: string;
    cardType: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  message: string;
  error?: string;
}

// Form Validation Types
export interface FormErrors {
  [key: string]: string | undefined;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FormErrors;
}

// UI State Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface CheckoutState {
  loadingState: LoadingState;
  error: string | null;
  paymentData: Partial<PaymentFormData>;
  cart: Cart;
}

