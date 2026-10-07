export interface MerchantVerificationInput {
  name:boolean;
  description:boolean;
  contact:boolean;
  hours:boolean;
  catalog:boolean;
  locationVerified:boolean;
  ownerMembershipVerified:boolean;
}

export interface MerchantVerificationState {
  readyForReview:boolean;
  verified:boolean;
  completed:number;
  total:number;
  missing:string[];
}

export function assessMerchantVerification(
  input:MerchantVerificationInput
):MerchantVerificationState{
  const checks=[
    ["Nombre",input.name],
    ["Descripción",input.description],
    ["Contacto",input.contact],
    ["Horario",input.hours],
    ["Catálogo",input.catalog],
    ["Ubicación",input.locationVerified],
    ["Titularidad",input.ownerMembershipVerified]
  ] as const;

  const missing=checks.filter(([,ok])=>!ok).map(([label])=>label);
  const completed=checks.length-missing.length;
  const operational=
    input.name &&
    input.description &&
    input.contact &&
    input.hours &&
    input.catalog;

  return {
    readyForReview: operational,
    verified: operational && input.locationVerified && input.ownerMembershipVerified,
    completed,
    total:checks.length,
    missing
  };
}
