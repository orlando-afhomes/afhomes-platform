import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import {
  areaCodeForCity,
  dialingPrefixFor,
  listCities,
  listProvinces,
  postalFor,
} from "@/shared/data/philippine-locations";
import { PhilippineLandlineField } from "./masked-fields";

afterEach(cleanup);

function LandlineHarness({ areaCode }: { areaCode?: string }) {
  const [value, setValue] = useState("");
  return <PhilippineLandlineField id="landline-prefix" label="Landline" value={value} onChange={setValue} areaCode={areaCode} />;
}

describe("landline prefix adornment", () => {
  it("always shows at least the +63 country code as a hidden-from-AT adornment", () => {
    render(<LandlineHarness />);
    const input = screen.getByLabelText("Landline") as HTMLInputElement;
    expect(input.value).not.toContain("+63");
    const adornment = input.parentElement?.querySelector('[aria-hidden="true"]');
    expect(adornment?.textContent).toBe("+63");
  });

  it("combines country code and area code when areaCode is provided", () => {
    render(<LandlineHarness areaCode="02" />);
    const input = screen.getByLabelText("Landline") as HTMLInputElement;
    const adornment = input.parentElement?.querySelector('[aria-hidden="true"]');
    expect(adornment?.textContent).toBe("+63 (02)");
    expect(input.value).not.toContain("+63");
  });

  it("keeps the prefix out of the canonical value when typing", () => {
    render(<LandlineHarness areaCode="02" />);
    const input = screen.getByLabelText("Landline") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "81234567" } });
    expect(input.value).toBe("81234567");
    expect(input.value).not.toContain("+63");
  });
});

describe("location reference coverage", () => {
  it("resolves a ZIP and an area code for representative cities across regions", () => {
    const cases = [
      { province: "Ilocos Norte", city: "Laoag City", zip: "2900", areaCode: "077" },
      { province: "Metro Manila", city: "Makati City", zip: "1200", areaCode: "02" },
      { province: "Metro Manila", city: "Marikina City", zip: "1807", areaCode: "02" },
      { province: "Cebu", city: "Cebu City", zip: "6000", areaCode: "032" },
      { province: "Negros Oriental", city: "Dumaguete City", zip: "6200", areaCode: "035" },
      { province: "Davao Del Sur", city: "Davao City", zip: "8000", areaCode: "082" },
      { province: "Benguet", city: "Baguio City", zip: "2600", areaCode: "074" },
    ];
    for (const item of cases) {
      expect(postalFor(item.province, item.city), `${item.province}/${item.city} ZIP`).toBe(item.zip);
      expect(areaCodeForCity(item.province, item.city), `${item.province}/${item.city} area code`).toBe(item.areaCode);
      expect(dialingPrefixFor(item.province, item.city)).toEqual({ countryCode: "+63", areaCode: item.areaCode });
    }
  });

  it("never leaves a valid province/city without a ZIP or an area code", () => {
    const gaps: string[] = [];
    for (const province of listProvinces()) {
      for (const city of listCities(province)) {
        if (!postalFor(province, city)) gaps.push(`ZIP:${province}/${city}`);
        if (!areaCodeForCity(province, city)) gaps.push(`area:${province}/${city}`);
      }
    }
    expect(gaps).toEqual([]);
  });
});
