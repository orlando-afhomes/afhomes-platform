export type CardHolder = "primary" | "supplementary";

export type HolderVerification = { holder: CardHolder; identityChecked: boolean; scannedCode?: string };

export type MemberQrHolder = {
  membershipId: string;
  holder: CardHolder;
  holderName: string;
  vipNumber: string;
  status: string;
  financialHold: boolean;
  /** The primary cardholder's own profile picture (data URL) so staff can match the face; never set for a supplementary holder. */
  photoUrl?: string | null;
  scannedCode?: string;
};

export type MemberQrCode = MemberQrHolder & { code: string };

export interface MemberQrRepository {
  identify(membershipId: string): Promise<MemberQrHolder[]>;
  holders(membershipId: string): Promise<MemberQrCode[]>;
  resolve(code: string): Promise<MemberQrHolder>;
  replace(membershipId: string, holder: CardHolder): Promise<MemberQrCode>;
}
