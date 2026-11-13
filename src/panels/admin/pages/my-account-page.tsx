"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import type { LinkedAccountSummary } from "@/modules/accounts/types";
import type { StaffMember } from "@/modules/organization/types";
import {
  useDepartments,
  useEffectiveModuleIds,
  useMembers,
  useMyProfile,
  useRoleOptions,
  useUpdateStaff,
} from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { PageContainer } from "@/shared/components/modern/page-container";
import { Breadcrumbs } from "@/shared/components/modern/breadcrumbs";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { PageHeader } from "@/shared/components/modern/page-header";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { CardSection } from "@/shared/components/modern/card-section";
import { Card } from "@/shared/ui/card";
import { DetailList, DetailRow } from "@/shared/components/modern/detail-list";
import { EmailField, TextField } from "@/shared/forms/modern";
import {
  cleanEmailInput,
  cleanTitleInput,
  isValidEmail,
  isValidName,
} from "@/shared/utils/input-sanitizers";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { FormSkeleton } from "@/shared/components/modern/skeletons";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

/** Self-service profile page: name, email, avatar, and password for the
 *  signed-in identity; department and role are read-only. */
export function MyAccountPage() {
  const { identity } = useDevIdentity();

  if (identity.status !== "active") {
    return (
      <PageContainer>
        <PageHeader title="Access restricted" description="This account does not have access to My Account." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "My Account" }]} />
      <PageHeader title="My Account" description="View and update your profile information." />
      <MyAccountForm key={identity.id} />
      <MyReferralCodeCard />
    </PageContainer>
  );
}

/** Read-only referral code of the signed-in sales member. Renders nothing for identities without a member record. */
function MyReferralCodeCard() {
  const { identity } = useDevIdentity();
  const membersQuery = useMembers();
  const currentMember = (membersQuery.data ?? []).find((member) => member.id === identity.memberId) ?? null;
  if (!identity.memberId || !currentMember) return null;
  return (
    <CardSection title="My referral code">
      <DetailList>
        <DetailRow term="Code">{currentMember.referralCode ?? "—"}</DetailRow>
        <DetailRow term="Status">{currentMember.referralCode ? "Existing code" : "No code assigned"}</DetailRow>
      </DetailList>
    </CardSection>
  );
}

function MyAccountForm() {
  const profileQuery = useMyProfile();
  if (profileQuery.isLoading) return <div role="status" aria-busy="true" className="tw:mt-3"><span className="tw:sr-only">Loading…</span><FormSkeleton fields={4} /></div>;
  const profile = profileQuery.data ?? null;
  if (!profile) {
    return (
      <Card className="tw:mt-6 tw:p-8 tw:text-center tw:text-muted-foreground">
        No linked staff or account record found for this identity.
      </Card>
    );
  }
  return <MyAccountProfileForm key={profile.staff.id} staff={profile.staff} linkedAccount={profile.linkedAccount} />;
}

type FieldErrors = { name?: string; email?: string };


/**
 * Personal profile only. Department, role, permissions, and account status
 * are read-only here: they cannot be self-modified (S3-04) and are not sent.
 */
function MyAccountProfileForm({ staff, linkedAccount }: { staff: StaffMember; linkedAccount: LinkedAccountSummary | null }) {
  const granted = useEffectiveModuleIds();
  const departmentsQuery = useDepartments();
  const rolesQuery = useRoleOptions();
  const updateStaff = useUpdateStaff();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEditProfile = granted.has("staff");
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);

  const [name, setName] = useState(staff.displayName);
  const [email, setEmail] = useState(staff.email);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(staff.avatarUrl ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmSave, setConfirmSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const clearError = (key: keyof FieldErrors) => {
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleAvatarFile = (file: File) => {
    setAvatarError(null);
    if (!file.type.startsWith("image/")) {
      setAvatarError("Unsupported image format.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be 2MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Full name is required.";
    else if (!isValidName(name)) next.name = "Full name must contain letters only.";
    if (email.trim() && !isValidEmail(email)) next.email = "Enter a valid email address.";
    return next;
  };

  const save = async () => {
    setSubmitting(true);
    try {
      if (canEditProfile) {
        // Profile fields only. The repository checks email uniqueness and keeps
        // the linked account's name and email in step with the staff record.
        await updateStaff.mutateAsync({ id: staff.id, displayName: name.trim(), email: email.trim() || staff.email, avatarUrl });
      }
      setConfirmSave(false);
      toast.success("Account updated successfully.", { description: "Your profile has been saved." });
    } catch (err) {
      setConfirmSave(false);
      toast.error("Update failed.", { description: err instanceof Error ? err.message : "Failed to update account." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setConfirmSave(true);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="tw:mt-3 tw:flex tw:max-w-2xl tw:flex-col tw:gap-4">
      <CardSection title="Profile information">
        <div className="tw:flex tw:flex-col tw:gap-1.5">
          <span className="tw:text-sm tw:font-medium">Profile picture</span>
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-4">
            <Avatar className="tw:size-16 tw:text-lg">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile picture preview" /> : null}
              <AvatarFallback>{initials(name || "Staff")}</AvatarFallback>
            </Avatar>
            {canEditProfile ? (
              <div className="tw:flex tw:flex-col tw:gap-2">
                <div className="tw:flex tw:flex-wrap tw:gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="tw:sr-only"
                    tabIndex={-1}
                    aria-label="Profile picture file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleAvatarFile(file);
                      event.target.value = "";
                    }}
                  />
                  <Button type="button" variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => fileInputRef.current?.click()}>
                    <Upload aria-hidden="true" /> Select image
                  </Button>
                  {avatarUrl ? (
                    <Button type="button" variant="destructive" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setAvatarUrl(null)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
                {avatarError ? (
                  <p role="alert" className="tw:text-sm tw:text-destructive">
                    {avatarError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <TextField
          label="Full Name"
          required
          placeholder="Full Name"
          value={name}
          maxLength={80}
          disabled={!canEditProfile}
          error={errors.name}
          onChange={(value) => {
            setName(cleanTitleInput(value));
            clearError("name");
          }}
        />
        <EmailField
          label="Email"
          placeholder="Email"
          value={email}
          maxLength={120}
          disabled={!canEditProfile}
          error={errors.email}
          onChange={(value) => {
            setEmail(cleanEmailInput(value));
            clearError("email");
          }}
        />
        <DetailList>
          <DetailRow term="Status">
            <StatusBadge status={linkedAccount?.status ?? staff.status} />
          </DetailRow>
          <DetailRow term="Linked account">{linkedAccount?.email ?? "—"}</DetailRow>
        </DetailList>
      </CardSection>

      <CardSection title="Change password">
        <p className="tw:text-sm tw:text-muted-foreground">To change your password, ask an Administrator to reset it for you.</p>
      </CardSection>

      <CardSection title="Employment and access">
        <DetailList>
          <DetailRow term="Department">{departments.find((item) => item.id === staff.departmentId)?.name ?? "—"}</DetailRow>
          <DetailRow term="Role">{roles.find((item) => item.id === staff.departmentRoleId)?.name ?? "—"}</DetailRow>
        </DetailList>
        <p className="tw:text-xs tw:text-muted-foreground">Your department, role, and account status are managed by an authorized administrator.</p>
      </CardSection>

      <div className="tw:flex tw:justify-end">
        <Button type="submit" loading={submitting} disabled={!canEditProfile} className="tw:min-h-11 tw:w-full tw:sm:min-h-8 tw:sm:w-auto">
          Save changes
        </Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        title="Save changes to your account?"
        description="Your profile information will be updated."
        confirmText="Save"
        pending={submitting}
        onConfirm={() => void save()}
        onClose={() => setConfirmSave(false)}
      />
    </form>
  );
}
