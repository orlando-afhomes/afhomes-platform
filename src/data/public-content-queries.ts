"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPublicContentRepository } from "@/data/mock/public-content-repository";
import { useMockStore } from "@/shared/providers/mock-store-provider";

/** Public reads share the browser store but never construct staff repositories. */
function usePublicContent() {
  const store = useMockStore();
  const delayMs = Number(process.env.NEXT_PUBLIC_MOCK_DELAY_MS) || 0;
  return useMemo(() => createPublicContentRepository(store, { delayMs }), [store, delayMs]);
}

export function usePublicExperiences() {
  const repository = usePublicContent();
  return useQuery({ queryKey: ["public-experiences"], queryFn: ({ signal }) => repository.experiences({ signal }) });
}

export function usePublicOffers() {
  const repository = usePublicContent();
  return useQuery({ queryKey: ["public-offers"], queryFn: ({ signal }) => repository.offers({ signal }) });
}

export function usePublicVipProducts() {
  const repository = usePublicContent();
  return useQuery({ queryKey: ["public-vip-products"], queryFn: ({ signal }) => repository.vipProducts({ signal }) });
}
