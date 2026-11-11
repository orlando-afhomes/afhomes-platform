import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MoneyField, PointsField, PasswordField, PhilippineAddressFields, PhilippineLandlineField, PhilippineMobileField, SelectField, SuffixField, TextField, TIN_DISPLAY_LENGTH, TinField } from ".";
import { GovernmentIdFields, OfficeAddressFields } from "./structured-fields";
import { validateTinNumber } from "@/shared/forms/validation/identification";

afterEach(cleanup);

function MaskHarness({ kind }: { kind: "phone" | "tin" }) {
  const [value, setValue] = useState(kind === "phone" ? "0917-123-4567" : "123-456-789");
  return kind === "phone" ? (
    <PhilippineMobileField id="field" label="Phone" value={value} onChange={setValue} />
  ) : (
    <TinField id="field" label="TIN" value={value} onChange={setValue} />
  );
}

/** Mimics a browser edit: the value changes and the caret sits right after the typed text. */
function insertInMiddle(input: HTMLInputElement, at: number, text: string) {
  const next = input.value.slice(0, at) + text + input.value.slice(at);
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  fireEvent.focus(input);
  setValue.call(input, next);
  input.setSelectionRange(at + text.length, at + text.length);
  fireEvent(input, new Event("input", { bubbles: true }));
}

describe("modern masked fields", () => {
  it("keeps the caret after a digit inserted in the middle of a phone number", async () => {
    render(<MaskHarness kind="phone" />);
    const input = screen.getByLabelText("Phone") as HTMLInputElement;
    insertInMiddle(input, 2, "9");
    await waitFor(() => expect(input.value).toBe("0991-712-3456"));
    await waitFor(() => expect(input.selectionStart).toBe(3));
  });

  it("keeps the caret after a digit inserted in the middle of a TIN", async () => {
    render(<MaskHarness kind="tin" />);
    const input = screen.getByLabelText("TIN") as HTMLInputElement;
    insertInMiddle(input, 5, "0");
    await waitFor(() => expect(input.value).toBe("123-405-678-9"));
    await waitFor(() => expect(input.selectionStart).toBe(6));
  });
});

describe("modern text, password and select fields", () => {
  it("links the inline error to the input", () => {
    render(<TextField id="n" label="Name" required value="" onChange={() => {}} error="Name is required." />);
    const input = screen.getByLabelText(/Name/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Name is required.");
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("toggles password visibility with an accessible button", async () => {
    const user = userEvent.setup();
    render(<PasswordField id="p" label="Password" value="secret" onChange={() => {}} />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
  });

  it("selects an option and reports its value", async () => {
    const user = userEvent.setup();
    let picked = "";
    render(<SelectField id="g" label="Gender" value={undefined} options={[{ value: "Male", label: "Male" }]} onChange={(value) => (picked = value)} placeholder="Select gender" />);
    await user.click(screen.getByRole("combobox", { name: "Gender" }));
    await user.click(await screen.findByRole("option", { name: "Male" }));
    expect(picked).toBe("Male");
  });

  it("clears an optional suffix through the No suffix item", async () => {
    const user = userEvent.setup();
    const picked: string[] = [];
    render(<SuffixField value="Jr." onChange={(value) => picked.push(value)} />);
    await user.click(screen.getByRole("combobox", { name: "Suffix" }));
    await user.click(await screen.findByRole("option", { name: "No suffix" }));
    expect(picked).toEqual([""]);
  });
});

describe("government ID type and number pair", () => {
  function GovIdHarness() {
    const [idType, setIdType] = useState<string | undefined>(undefined);
    const [idNumber, setIdNumber] = useState("");
    return (
      <GovernmentIdFields
        idType={idType}
        onIdTypeChange={setIdType}
        idNumber={idNumber}
        onIdNumberChange={setIdNumber}
        idTypeOptions={[
          { value: "Passport", label: "Passport" },
          { value: "UMID", label: "UMID" },
          { value: "Digital National ID", label: "Digital National ID" },
          { value: "Philippine National ID", label: "Philippine National ID" },
        ]}
      />
    );
  }

  async function pickIdType(user: ReturnType<typeof userEvent.setup>, label: string) {
    await user.click(screen.getByRole("combobox", { name: "Government ID" }));
    await user.click(await screen.findByRole("option", { name: label }));
  }

  const idNumberInput = () => screen.getByLabelText("ID Number") as HTMLInputElement;

  it("uppercases lowercase input as it is typed with the Passport policy", async () => {
    const user = userEvent.setup();
    render(<GovIdHarness />);
    await pickIdType(user, "Passport");
    await user.type(idNumberInput(), "p1234567a");
    expect(idNumberInput().value).toBe("P1234567A");
    expect(idNumberInput()).toHaveAttribute("maxlength", "12");
    expect(idNumberInput()).toHaveAttribute("inputmode", "text");
  });

  it("keeps only digits after selecting UMID and uses the numeric input mode", async () => {
    const user = userEvent.setup();
    render(<GovIdHarness />);
    await pickIdType(user, "UMID");
    expect(idNumberInput()).toHaveAttribute("maxlength", "14");
    expect(idNumberInput()).toHaveAttribute("inputmode", "numeric");
    await user.type(idNumberInput(), "ab12cd34");
    expect(idNumberInput().value).toBe("1234");
  });

  it("caps the Digital National ID at six uppercase alphanumeric characters", async () => {
    const user = userEvent.setup();
    render(<GovIdHarness />);
    await pickIdType(user, "Digital National ID");
    expect(idNumberInput()).toHaveAttribute("maxlength", "6");
    expect(idNumberInput()).toHaveAttribute("inputmode", "text");
    await user.type(idNumberInput(), "ab12cd");
    expect(idNumberInput().value).toBe("AB12CD");
  });

  it("uses the 16-digit National ID cap and the 40-character fallback with no type", async () => {
    const user = userEvent.setup();
    render(<GovIdHarness />);
    expect(idNumberInput()).toHaveAttribute("maxlength", "40");
    await pickIdType(user, "Philippine National ID");
    expect(idNumberInput()).toHaveAttribute("maxlength", "16");
    expect(idNumberInput()).toHaveAttribute("inputmode", "numeric");
  });
});

describe("SelectField showSearch", () => {
  it("filters options by typing and selects one", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectField
        label="Recommender"
        value={undefined}
        options={[{ value: "a", label: "Ana Mendoza" }, { value: "b", label: "Mark Villanueva" }]}
        onChange={onChange}
      />,
    );
    await user.type(screen.getByRole("combobox", { name: /recommender/i }), "mark");
    expect(screen.queryByRole("option", { name: "Ana Mendoza" })).toBeNull();
    await user.click(await screen.findByRole("option", { name: "Mark Villanueva" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});

function AmountHarness({ points = false }: { points?: boolean }) {
  const [value, setValue] = useState("");
  const Field = points ? PointsField : MoneyField;
  return <Field id="amount" label="Amount" value={value} onChange={setValue} />;
}

describe("grouped number fields", () => {
  it("shows commas while typing a peso amount and keeps the decimals", async () => {
    render(<AmountHarness />);
    const input = screen.getByLabelText("Amount") as HTMLInputElement;
    await userEvent.type(input, "1000000.5");
    expect(input.value).toBe("1,000,000.5");
    await userEvent.clear(input);
    await userEvent.type(input, "abc12.345");
    expect(input.value).toBe("12.34");
  });

  it("keeps the caret in place when editing in the middle of a grouped number", () => {
    render(<AmountHarness points />);
    const input = screen.getByLabelText("Amount") as HTMLInputElement;
    input.focus(); // a real edit happens in the focused input; the caret is only restored there
    insertInMiddle(input, 0, "25000");
    expect(input.value).toBe("25,000");
    insertInMiddle(input, 3, "9"); // "25," + "9" + "000" -> 259,000 with the caret after the 9
    expect(input.value).toBe("259,000");
    expect(input.selectionStart).toBe(3); // right after the typed 9, before the comma
  });
});

describe("tin, landline and office address fields", () => {
  function TinHarness() {
    const [value, setValue] = useState("");
    return <TinField id="tin-optional" label="TIN number" value={value} onChange={setValue} />;
  }

  function LandlineHarness() {
    const [value, setValue] = useState("");
    return <PhilippineLandlineField id="landline-optional" label="Landline" value={value} onChange={setValue} />;
  }

  function OfficeHarness() {
    const [value, setValue] = useState({ street: "", municipality: "", province: "", postalCode: "" });
    return <OfficeAddressFields value={value} onChange={setValue} />;
  }

  it("renders the TIN field with its label and groups digits when filled", async () => {
    render(<TinHarness />);
    const input = screen.getByLabelText("TIN number") as HTMLInputElement;
    await userEvent.type(input, "123456789");
    expect(input.value).toBe("123-456-789");
  });

  it("types a full 12-digit TIN into the 15-character display width", async () => {
    render(<TinHarness />);
    const input = screen.getByLabelText("TIN number") as HTMLInputElement;
    // Regression guard: the old 14-character cap truncated the branch code.
    expect(TIN_DISPLAY_LENGTH).toBe(15);
    expect(input).toHaveAttribute("maxlength", "15");
    await userEvent.type(input, "091235467860");
    expect(input.value).toBe("091-235-467-860");
    expect(input.value).toHaveLength(15);
    expect(validateTinNumber(input.value)).toBeNull();
  });

  it("keeps a 9-digit TIN valid and rejects 11 digits with the exact message", async () => {
    render(<TinHarness />);
    const input = screen.getByLabelText("TIN number") as HTMLInputElement;
    await userEvent.type(input, "123456789");
    expect(input.value).toBe("123-456-789");
    expect(validateTinNumber(input.value)).toBeNull();
    await userEvent.clear(input);
    await userEvent.type(input, "09123546786");
    expect(input.value).toBe("091-235-467-86");
    expect(validateTinNumber(input.value)).toBe("TIN must be 9 or 12 digits.");
  });

  it("renders the landline field with its label and keeps typed digits", async () => {
    render(<LandlineHarness />);
    const input = screen.getByLabelText("Landline") as HTMLInputElement;
    await userEvent.type(input, "028123456");
    expect(input.value).toBe("028123456");
  });

  it("renders office address fields with No./Street/Subdivision, Province, Municipality and ZIP Code", async () => {
    render(<OfficeHarness />);
    expect(screen.getByLabelText("No./Street/Subdivision")).toBeInTheDocument();
    expect(screen.getByLabelText("Municipality")).toBeInTheDocument();
    expect(screen.getByLabelText("Province")).toBeInTheDocument();
    expect(screen.getByLabelText("ZIP Code")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("No./Street/Subdivision"), "123 Mabini St");
    expect((screen.getByLabelText("No./Street/Subdivision") as HTMLInputElement).value).toBe("123 Mabini St");
    // ZIP is always derived and locked, never typed by the user.
    const zip = screen.getByLabelText("ZIP Code") as HTMLInputElement;
    expect(zip).toBeDisabled();
    expect(zip.value).toBe("");
  });
});

describe("province-first residential address completion", () => {
  const EMPTY_RESIDENTIAL = { street: "", province: "", city: "", barangay: "", postalCode: "" };

  function ResidentialHarness({ initial = EMPTY_RESIDENTIAL }: { initial?: typeof EMPTY_RESIDENTIAL }) {
    const [value, setValue] = useState(initial);
    return <PhilippineAddressFields value={value} onChange={setValue} />;
  }

  /** Types into a searchable combobox and clicks the exact option. */
  async function pickFilteredOption(
    user: ReturnType<typeof userEvent.setup>,
    combo: HTMLElement,
    filter: string,
    name: string | RegExp,
  ) {
    await user.click(combo);
    if ((combo as HTMLInputElement).value) await user.clear(combo);
    await user.type(combo, filter);
    await user.click(await screen.findByRole("option", { name }));
  }

  const provinceCombo = () => screen.getByRole("combobox", { name: "Province" }) as HTMLInputElement;
  const cityCombo = () => screen.getByRole("combobox", { name: "City/Municipality" }) as HTMLInputElement;
  const barangayCombo = () => screen.getByRole("combobox", { name: "Barangay" }) as HTMLInputElement;
  const zip = () => screen.getByRole("textbox", { name: "ZIP Code" }) as HTMLInputElement;

  it("orders residential fields No./Street/Subdivision, Province, City/Municipality, Barangay, ZIP", () => {
    render(<ResidentialHarness />);
    const controls = [screen.getByRole("textbox", { name: "No./Street/Subdivision" }), provinceCombo(), cityCombo(), barangayCombo(), zip()];
    for (let index = 0; index + 1 < controls.length; index += 1) {
      const position = controls[index].compareDocumentPosition(controls[index + 1]);
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    // The subdivision is typed inline in the street line; there is no separate
    // subdivision field, so the street textbox is the only match.
    expect(screen.getByRole("textbox", { name: /subdivision/i })).toBe(controls[0]);
    // ZIP is derived and locked, and never carries the required marker.
    expect(zip()).toBeDisabled();
    expect(zip()).not.toHaveAttribute("aria-required");
  });

  it("keeps city and barangay disabled until their parent selection exists", async () => {
    const user = userEvent.setup();
    render(<ResidentialHarness />);
    expect(provinceCombo().value).toBe("");
    expect(cityCombo()).toBeDisabled();
    expect(cityCombo()).toHaveAttribute("placeholder", "Select a province first");
    expect(barangayCombo()).toBeDisabled();
    expect(barangayCombo()).toHaveAttribute("placeholder", "Select a city first");
    expect(zip()).toBeDisabled();
    expect(zip().value).toBe("");

    // Choosing the province enables the city list and scopes it to that province.
    await pickFilteredOption(user, provinceCombo(), "Cebu", /^cebu$/i);
    await waitFor(() => expect(provinceCombo().value).toBe("Cebu"));
    expect(cityCombo()).toBeEnabled();
    expect(barangayCombo()).toBeDisabled();
    await user.click(cityCombo());
    expect(await screen.findByRole("option", { name: "Lapu-Lapu City" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Quezon City" })).toBeNull();
  });

  it("walks province → city → barangay and locks the derived single ZIP", async () => {
    const user = userEvent.setup();
    render(<ResidentialHarness />);
    await pickFilteredOption(user, provinceCombo(), "Cebu", /^cebu$/i);
    await waitFor(() => expect(cityCombo()).toBeEnabled());
    await pickFilteredOption(user, cityCombo(), "Lapu-Lapu City", /^lapu-lapu city$/i);
    await waitFor(() => expect(cityCombo().value).toBe("Lapu-Lapu City"));
    await waitFor(() => expect(barangayCombo()).toBeEnabled());
    await pickFilteredOption(user, barangayCombo(), "Pajo", /^pajo$/i);
    await waitFor(() => expect(barangayCombo().value).toBe("Pajo"));
    await waitFor(() => expect(zip().value).toBe("6015"));
    expect(zip()).toBeDisabled();
    expect(screen.getByText("Principal ZIP for the selected city.")).toBeInTheDocument();

    // Changing the city clears the barangay and refills the ZIP from postalFor.
    await pickFilteredOption(user, cityCombo(), "Mandaue City", /^mandaue city$/i);
    await waitFor(() => expect(cityCombo().value).toBe("Mandaue City"));
    await waitFor(() => expect(barangayCombo().value).toBe(""));
    await waitFor(() => expect(zip().value).toBe("6014"));
    expect(zip()).toBeDisabled();
  });

  it("resets city, barangay, and ZIP when the province changes", async () => {
    const user = userEvent.setup();
    render(<ResidentialHarness />);
    await pickFilteredOption(user, provinceCombo(), "Cebu", /^cebu$/i);
    await pickFilteredOption(user, cityCombo(), "Lapu-Lapu City", /^lapu-lapu city$/i);
    await pickFilteredOption(user, barangayCombo(), "Pajo", /^pajo$/i);
    await waitFor(() => expect(zip().value).toBe("6015"));

    await pickFilteredOption(user, provinceCombo(), "Metro Manila", /^metro manila$/i);
    await waitFor(() => expect(provinceCombo().value).toBe("Metro Manila"));
    await waitFor(() => expect(cityCombo().value).toBe(""));
    expect(barangayCombo().value).toBe("");
    expect(zip().value).toBe("");
    expect(zip()).toBeDisabled();
    // The new province scopes the city list again.
    await user.click(cityCombo());
    expect(await screen.findByRole("option", { name: "Quezon City" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^lapu-lapu city$/i })).toBeNull();
  });

  it("locks the principal ZIP for a multi-ZIP city", async () => {
    const user = userEvent.setup();
    render(<ResidentialHarness />);
    // Quezon City spans several ZIPs; the field shows the municipality's
    // principal ZIP (1100) and stays derived and locked.
    await pickFilteredOption(user, provinceCombo(), "Metro Manila", /^metro manila$/i);
    await pickFilteredOption(user, cityCombo(), "Quezon City", /^quezon city$/i);
    await waitFor(() => expect(cityCombo().value).toBe("Quezon City"));
    expect(zip()).toBeDisabled();
    await waitFor(() => expect(zip().value).toBe("1100"));
    expect(screen.getByText("Principal ZIP for the selected city.")).toBeInTheDocument();
    // The field stays derived and locked: a typed value never replaces it.
    fireEvent.change(zip(), { target: { value: "1101" } });
    expect(zip().value).toBe("1100");
  });
});

describe("province-first office address completion", () => {
  function OfficeCityHarness() {
    const [value, setValue] = useState({ street: "", municipality: "", province: "", postalCode: "" });
    return <OfficeAddressFields value={value} onChange={setValue} />;
  }

  async function pickFilteredOption(
    user: ReturnType<typeof userEvent.setup>,
    combo: HTMLElement,
    filter: string,
    name: string | RegExp,
  ) {
    await user.click(combo);
    if ((combo as HTMLInputElement).value) await user.clear(combo);
    await user.type(combo, filter);
    await user.click(await screen.findByRole("option", { name }));
  }

  const provinceCombo = () => screen.getByRole("combobox", { name: "Province" }) as HTMLInputElement;
  const municipalityCombo = () => screen.getByRole("combobox", { name: "Municipality" }) as HTMLInputElement;
  const zip = () => screen.getByRole("textbox", { name: "ZIP Code" }) as HTMLInputElement;

  it("orders office fields No./Street/Subdivision, Province, Municipality, ZIP with no barangay", () => {
    render(<OfficeCityHarness />);
    const controls = [screen.getByRole("textbox", { name: "No./Street/Subdivision" }), provinceCombo(), municipalityCombo(), zip()];
    for (let index = 0; index + 1 < controls.length; index += 1) {
      const position = controls[index].compareDocumentPosition(controls[index + 1]);
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    // The office address carries no barangay by contract, and its subdivision
    // is typed inline in the street line rather than in a separate field.
    expect(screen.queryByRole("combobox", { name: /barangay/i })).toBeNull();
    expect(screen.getByRole("textbox", { name: /subdivision/i })).toBe(controls[0]);
  });

  it("keeps the municipality disabled until a province is chosen and locks the single ZIP", async () => {
    const user = userEvent.setup();
    render(<OfficeCityHarness />);
    expect(provinceCombo().value).toBe("");
    expect(municipalityCombo()).toBeDisabled();
    expect(municipalityCombo()).toHaveAttribute("placeholder", "Select a province first");

    await pickFilteredOption(user, provinceCombo(), "Cebu", /^cebu$/i);
    await waitFor(() => expect(municipalityCombo()).toBeEnabled());
    expect(municipalityCombo()).toHaveAttribute("placeholder", "Select municipality");
    await pickFilteredOption(user, municipalityCombo(), "Mandaue City", /^mandaue city$/i);
    await waitFor(() => expect(zip().value).toBe("6014"));
    expect(zip()).toBeDisabled();
    expect(screen.getByText("Principal ZIP for the selected municipality.")).toBeInTheDocument();
  });

  it("locks the principal ZIP for a multi-ZIP municipality", async () => {
    const user = userEvent.setup();
    render(<OfficeCityHarness />);
    await pickFilteredOption(user, provinceCombo(), "Metro Manila", /^metro manila$/i);
    await pickFilteredOption(user, municipalityCombo(), "Quezon City", /^quezon city$/i);
    await waitFor(() => expect(municipalityCombo().value).toBe("Quezon City"));
    expect(zip()).toBeDisabled();
    await waitFor(() => expect(zip().value).toBe("1100"));
    expect(screen.getByText("Principal ZIP for the selected municipality.")).toBeInTheDocument();
    fireEvent.change(zip(), { target: { value: "ab1103" } });
    expect(zip().value).toBe("1100");
  });
});

describe("landline prefix per city area code", () => {
  function LandlineHarness({ areaCode }: { areaCode?: string }) {
    const [value, setValue] = useState("");
    return <PhilippineLandlineField id="landline-area" label="Landline" value={value} onChange={setValue} areaCode={areaCode} />;
  }

  it("shows +63 alone with no area code and +63 (032) once the city is selected", async () => {
    const user = userEvent.setup();
    const first = render(<LandlineHarness />);
    const bare = screen.getByLabelText("Landline") as HTMLInputElement;
    expect(bare.parentElement?.querySelector('[aria-hidden="true"]')?.textContent).toBe("+63");
    first.unmount();
    render(<LandlineHarness areaCode="032" />);
    const input = screen.getByLabelText("Landline") as HTMLInputElement;
    expect(input.parentElement?.querySelector('[aria-hidden="true"]')?.textContent).toBe("+63 (032)");
    await user.type(input, "8123456");
    expect(input.value).toBe("8123456");
    expect(input.value).not.toContain("+63");
  });
});
describe("address field shells", () => {
  const EMPTY_RESIDENTIAL = { street: "", province: "", city: "", barangay: "", postalCode: "" };

  it("renders residential province, city, and barangay selects with street and ZIP as text", () => {
    render(<PhilippineAddressFields value={EMPTY_RESIDENTIAL} onChange={() => {}} />);
    // Selects are addressed by role like the other showSearch fields in this file.
    expect(screen.getByRole("combobox", { name: "Province" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "City/Municipality" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Barangay" })).toBeInTheDocument();
    // Street stays editable text and carries the subdivision inline; ZIP is derived and locked.
    const street = screen.getByRole("textbox", { name: "No./Street/Subdivision" });
    expect(street).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /subdivision/i })).toBe(street);
    expect(screen.getByRole("textbox", { name: "ZIP Code" })).toBeDisabled();
  });

  it("renders office municipality and province selects with street and ZIP as text", () => {
    render(<OfficeAddressFields value={{ street: "", municipality: "", province: "", postalCode: "" }} onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Municipality" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Province" })).toBeInTheDocument();
    // The subdivision is typed inline in the street line, never a separate field.
    const street = screen.getByRole("textbox", { name: "No./Street/Subdivision" });
    expect(street).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /subdivision/i })).toBe(street);
    expect(screen.getByRole("textbox", { name: "ZIP Code" })).toBeDisabled();
  });
});
