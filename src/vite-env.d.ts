/// <reference types="vite/client" />

interface Window {
  CARE_API_URL: string;
  __CORE_ENV__?: {
    paymentLocationRequired?: boolean;
    defaultPaymentMethod?: string;
  };
}
