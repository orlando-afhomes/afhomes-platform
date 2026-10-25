export type VipTierCode = "B1" | "S1" | "G1";

export type VipProduct = {
  code: VipTierCode;
  name: string;
  tier: "Bronze" | "Silver" | "Gold";
};
