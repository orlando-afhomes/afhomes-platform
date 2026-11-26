"use client";

import { useQuery } from "@tanstack/react-query";
import { PUBLIC_EXPERIENCES, PUBLIC_OFFERS, PUBLIC_VIP_PRODUCTS } from "@/data/public-content";

/** Public reads use the confirmed catalog snapshot; no staff records or repositories. */
export function usePublicExperiences() {
  return useQuery({ queryKey: ["public-experiences"], queryFn: async () => PUBLIC_EXPERIENCES });
}

export function usePublicOffers() {
  return useQuery({ queryKey: ["public-offers"], queryFn: async () => PUBLIC_OFFERS });
}

export function usePublicVipProducts() {
  return useQuery({ queryKey: ["public-vip-products"], queryFn: async () => PUBLIC_VIP_PRODUCTS });
}
