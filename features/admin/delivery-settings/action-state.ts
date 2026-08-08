export type DeliverySettingsActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<{
    storePostalCode: string;
    ratePerKm: string;
    multiplier: string;
    minAmount: string;
    maxRadiusKm: string;
    deliveryEnabled: string;
  }>;
};

export const initialDeliverySettingsActionState: DeliverySettingsActionState =
  {};
