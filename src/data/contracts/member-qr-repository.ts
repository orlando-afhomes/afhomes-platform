export type CardHolder = "primary" | "supplementary";

export type HolderVerification = { holder: CardHolder; identityChecked: boolean; scannedCode?: string };

export type MemberQrHolder = {
  membershipId: string;
  holder: CardHolder;
  holderName: string;
  vipNumber: string;
  status: string;
  financialHold: boolean;
  scannedCode?: string;
};

export type MemberQrCode = MemberQrHolder & { code: string };

export interface MemberQrRepository {
  identify(membershipId: string): Promise<MemberQrHolder[]>;
  holders(membershipId: string): Promise<MemberQrCode[]>;
  resolve(code: string): Promise<MemberQrHolder>;
  replace(membershipId: string, holder: CardHolder): Promise<MemberQrCode>;
}
