"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExperienceInput } from "@/data/contracts/experience-repository";
import { useMockRepositories } from "@/data/queries";
import { queryKeys } from "@/data/query-keys";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";

/** Public Experiences list; no identity partition because only published content is returned. */
export { usePublicExperiences } from "./public-content-queries";

export function useExperiences() {
  const { experiences } = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({ queryKey: queryKeys.business.list("experiences", identity.id), queryFn: ({ signal }) => experiences.list({ signal }) });
}

function useInvalidateExperiences() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.business.all });
    void queryClient.invalidateQueries({ queryKey: ["public-experiences"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
  };
}

export function useSaveExperience() {
  const { experiences } = useMockRepositories();
  const invalidate = useInvalidateExperiences();
  return useMutation({
    mutationFn: (input: { id?: string; experience: ExperienceInput }) =>
      input.id ? experiences.update(input.id, input.experience) : experiences.create(input.experience),
    onSuccess: invalidate,
  });
}

export function useSetExperiencePublished() {
  const { experiences } = useMockRepositories();
  const invalidate = useInvalidateExperiences();
  return useMutation({
    mutationFn: (input: { id: string; published: boolean }) => experiences.setPublished(input.id, input.published),
    onSuccess: invalidate,
  });
}
