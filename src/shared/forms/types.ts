/** Shared building blocks for AFHomes form fields (Ant Design 6). */

export type FieldOption<T extends string = string> = {
  value: T;
  label: string;
};

export type BaseFieldProps = {
  id?: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "search";
  className?: string;
};

export type AddressValue = {
  street: string;
  province: string;
  city: string;
  barangay: string;
  subdivision: string;
  postalCode: string;
};

export type AddressFieldKey = keyof AddressValue;
