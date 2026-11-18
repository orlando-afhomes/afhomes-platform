import type { ComponentType } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import HomeLoading from "../../app/(public)/loading";
import AboutLoading from "../../app/(public)/about/loading";
import BlogLoading from "../../app/(public)/blog/loading";
import BlogPostLoading from "../../app/(public)/blog/[slug]/loading";
import ComplianceLoading from "../../app/(public)/compliance/loading";
import ContactLoading from "../../app/(public)/contact/loading";
import ResortLoading from "../../app/(public)/experiences/hotspring-ecofarm-resort/loading";
import HotelLoading from "../../app/(public)/experiences/smart-wellness-hotel/loading";
import RestaurantLoading from "../../app/(public)/experiences/alm-japanese-restaurant/loading";
import FaqLoading from "../../app/(public)/faq/loading";
import OstLoading from "../../app/(public)/register/ost/loading";
import OstCorrectionLoading from "../../app/(public)/register/ost/correct/[token]/loading";
import VerifyLoading from "../../app/(public)/verify/loading";
import VipLoading from "../../app/(public)/vip-privilege/loading";
import LoginLoading from "../../app/login/loading";
import SalesLoginLoading from "../../app/login/sales/loading";

const CASES: Array<[string, ComponentType]> = [
  ["/", HomeLoading],
  ["/about", AboutLoading],
  ["/blog", BlogLoading],
  ["/blog/[slug]", BlogPostLoading],
  ["/compliance", ComplianceLoading],
  ["/contact", ContactLoading],
  ["/experiences/hotspring-ecofarm-resort", ResortLoading],
  ["/experiences/smart-wellness-hotel", HotelLoading],
  ["/experiences/alm-japanese-restaurant", RestaurantLoading],
  ["/faq", FaqLoading],
  ["/register/ost", OstLoading],
  ["/register/ost/correct/[token]", OstCorrectionLoading],
  ["/verify", VerifyLoading],
  ["/vip-privilege", VipLoading],
  ["/login", LoginLoading],
  ["/login/sales", SalesLoginLoading],
];

afterEach(cleanup);

describe("public route loading UI", () => {
  it.each(CASES)("%s renders a loading region with skeleton blocks", (_route, Loading) => {
    const { container } = render(<Loading />);
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });
});
