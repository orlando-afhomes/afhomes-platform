"use client";

import { EMPTY } from "@/shared/lib/empty-value";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { notify } from "@/shared/components/modern/app-toaster";
import { KeyRound, Upload } from "lucide-react";
import type { LinkedAccountSummary } from "@/modules/accounts/types";
import { composeDisplayName, splitDisplayName } from "@/modules/organization/name";
import type { StaffMember } from "@/modules/organization/types";
import {
  useDepartments,
  useEffectiveModuleIds,
  useMembers,
  useMyProfile,
  useRequestPasswordReset,
  useRoleOptions,
  useUpdateStaff,
  useUploadStaffAvatar,
} from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/identity-provider";
import { PageContainer } from "@/shared/components/modern/page-container";
import { Breadcrumbs } from "@/shared/components/modern/breadcrumbs";
import { AppAlert } from "@/shared/components/modern/app-alert";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { PageHeader } from "@/shared/components/modern/page-header";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { CardSection } from "@/shared/components/modern/card-section";
import { Card } from "@/shared/ui/card";
import { DetailList, DetailRow } from "@/shared/components/modern/detail-list";
import { ErrorState } from "@/shared/components/modern/error-state";
import { FormGrid } from "@/shared/components/modern/form-layout";
import {
  EmailField,
  MiddleNameField,
  PersonNameField,
  PrefixField,
  SuffixField,
  TakePictureButton,
} from "@/shared/forms/modern";
import { useFormDirty } from "@/shared/forms/modern/use-form-dirty";
import { validateMiddleName, validatePersonName, validatePrefix, validateSuffix } from "@/shared/forms/validation/person-name";
import { cleanEmailInput, isValidEmail } from "@/shared/utils/input-sanitizers";
import { validateProfileImageFile } from "@/shared/forms/validation/image";
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
        <PageHeader title="Access Restricted" description="This account does not have access to My Account." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "My Account" }]} />
      <PageHeader title="My Account" />
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
    <CardSection title="My Referral Code">
      <DetailList>
        <DetailRow term="Code">{currentMember.referralCode ?? "—"}</DetailRow>
        <DetailRow term="Status">{currentMember.referralCode ? "Existing code" : EMPTY}</DetailRow>
      </DetailList>
    </CardSection>
  );
}

function MyAccountForm() {
  const profileQuery = useMyProfile();
  if (profileQuery.isLoading) return <div role="status" aria-busy="true" className="tw:mt-3"><span className="tw:sr-only">Loading…</span><FormSkeleton fields={4} /></div>;
  // A failed profile load reads as a retryable error, never as a missing record.
  if (profileQuery.error) {
    return <ErrorState text={profileQuery.error instanceof Error ? profileQuery.error.message : undefined} onRetry={() => void profileQuery.refetch()} />;
  }
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

type FieldErrors = {
  prefix?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  email?: string;
};


/**
 * Personal profile only. Department, role, permissions, and account status
 * are read-only here: they cannot be self-modified (S3-04) and are not sent.
 */
function MyAccountProfileForm({ staff, linkedAccount }: { staff: StaffMember; linkedAccount: LinkedAccountSummary | null }) {
  const granted = useEffectiveModuleIds();
  const departmentsQuery = useDepartments();
  const rolesQuery = useRoleOptions();
  const updateStaff = useUpdateStaff();
  const uploadAvatar = useUploadStaffAvatar();
  const requestPasswordReset = useRequestPasswordReset();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEditProfile = granted.has("staff");
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);

  const split = splitDisplayName(staff.displayName);
  const [prefix, setPrefix] = useState(staff.prefix ?? "");
  const [firstName, setFirstName] = useState(staff.firstName ?? split.first);
  const [middleName, setMiddleName] = useState(staff.middleName ?? split.middle);
  const [noMiddleName, setNoMiddleName] = useState(!(staff.middleName ?? split.middle).trim());
  const [lastName, setLastName] = useState(staff.lastName ?? split.last);
  const [suffix, setSuffix] = useState(staff.suffix ?? "");
  const [email, setEmail] = useState(staff.email);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(staff.avatarUrl ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmSave, setConfirmSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const displayName = composeDisplayName({ firstName, middleName, noMiddleName, lastName, suffix });
  const { dirty, reset } = useFormDirty({
    prefix: prefix || null,
    firstName,
    middleName: noMiddleName ? null : middleName,
    noMiddleName,
    lastName,
    suffix: suffix || null,
    email,
    avatarUrl,
  });

  const sendPasswordReset = async () => {
    if (!linkedAccount) return;
    try {
      const { message } = await requestPasswordReset.mutateAsync(linkedAccount.id);
      setResetNotice(message);
    } catch (err) {
      notify.actionError(err, "Password reset failed.");
    }
  };

  const clearError = (key: keyof FieldErrors) => {
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleAvatarFile = (file: File) => {
    setAvatarError(null);
    const imageError = validateProfileImageFile(file);
    if (imageError) {
      setAvatarError(imageError);
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const prefixError = validatePrefix(prefix);
    if (prefixError) next.prefix = prefixError;
    const firstNameError = validatePersonName(firstName, "First name");
    if (firstNameError) next.firstName = firstNameError;
    const middleError = validateMiddleName(middleName, noMiddleName);
    if (middleError) next.middleName = middleError;
    const lastNameError = validatePersonName(lastName, "Last name");
    if (lastNameError) next.lastName = lastNameError;
    const suffixError = validateSuffix(suffix);
    if (suffixError) next.suffix = suffixError;
    if (email.trim() && !isValidEmail(email)) next.email = "Enter a valid email address.";
    return next;
  };

  const save = async () => {
    setSubmitting(true);
    try {
      if (canEditProfile) {
        let nextAvatarUrl = avatarUrl;
        if (avatarFile) {
          const uploaded = await uploadAvatar.mutateAsync({ id: staff.id, file: avatarFile });
          nextAvatarUrl = uploaded.avatarUrl;
          setAvatarUrl(nextAvatarUrl);
          setAvatarFile(null);
        }
        // Profile fields only. The repository checks email uniqueness and keeps
        // the linked account's name and email in step with the staff record.
        await updateStaff.mutateAsync({
          id: staff.id,
          displayName,
          email: email.trim() || staff.email,
          avatarUrl: nextAvatarUrl,
          prefix: prefix || null,
          firstName: firstName.trim(),
          middleName: noMiddleName ? null : middleName.trim(),
          lastName: lastName.trim(),
          suffix: suffix || null,
        });
      }
      reset();
      setConfirmSave(false);
      toast.success("Account updated successfully.", { description: "Your profile has been saved." });
    } catch (err) {
      setConfirmSave(false);
      notify.actionError(err, "Update failed.");
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
      <CardSection title="Profile Information">
        <div className="tw:flex tw:flex-col tw:gap-1.5">
          <span className="tw:text-sm tw:font-medium">Profile picture</span>
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-4">
            <Avatar className="tw:size-16 tw:text-lg">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile picture preview" /> : null}
              <AvatarFallback>{initials(displayName || "Staff")}</AvatarFallback>
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
                    <Upload aria-hidden="true" /> Select Image
                  </Button>
                  <TakePictureButton onCapture={handleAvatarFile} facingMode="user" className="tw:min-h-11 tw:sm:min-h-8" />
                  {avatarUrl ? (
                    <Button type="button" variant="destructive" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => { setAvatarUrl(null); setAvatarFile(null); }}>
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
        <FormGrid>
          <PrefixField
            id="account-prefix"
            value={prefix || undefined}
            onChange={(value) => { setPrefix(value); clearError("prefix"); }}
            disabled={!canEditProfile}
            error={errors.prefix}
          />
          <PersonNameField
            id="account-first-name"
            label="First Name"
            required
            value={firstName}
            onChange={(value) => { setFirstName(value); clearError("firstName"); }}
            placeholder="First Name"
            disabled={!canEditProfile}
            error={errors.firstName}
          />
          <PersonNameField
            id="account-last-name"
            label="Last Name"
            required
            value={lastName}
            onChange={(value) => { setLastName(value); clearError("lastName"); }}
            placeholder="Last Name"
            disabled={!canEditProfile}
            error={errors.lastName}
          />
          <MiddleNameField
            id="account-middle-name"
            label="Middle Name"
            required
            value={middleName}
            onChange={(value) => { setMiddleName(value); clearError("middleName"); }}
            noMiddleName={noMiddleName}
            onNoMiddleNameChange={setNoMiddleName}
            placeholder="Middle Name"
            disabled={!canEditProfile}
            error={errors.middleName}
          />
          <SuffixField
            id="account-suffix"
            value={suffix || undefined}
            onChange={(value) => { setSuffix(value); clearError("suffix"); }}
            disabled={!canEditProfile}
            error={errors.suffix}
          />
        </FormGrid>
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

      <CardSection title="Change Password">
        <p className="tw:text-sm tw:text-muted-foreground">
          Send a secure reset link to your email. Your current password keeps working until you use the link.
        </p>
        <div className="tw:flex tw:justify-end">
          <Button
            type="button"
            variant="outline"
            loading={requestPasswordReset.isPending}
            disabled={!linkedAccount}
            onClick={() => void sendPasswordReset()}
            className="tw:min-h-11 tw:sm:min-h-8"
          >
            <KeyRound aria-hidden="true" /> Send password reset email
          </Button>
        </div>
        <AppAlert
          open={resetNotice !== null}
          title="Password reset requested"
          description={resetNotice ?? ""}
          confirmText="Done"
          onConfirm={() => setResetNotice(null)}
          onClose={() => setResetNotice(null)}
        />
      </CardSection>

      <CardSection title="Employment and Access">
        <DetailList>
          <DetailRow term="Department">{departments.find((item) => item.id === staff.departmentId)?.name ?? "—"}</DetailRow>
          <DetailRow term="Role">{roles.find((item) => item.id === staff.departmentRoleId)?.name ?? "—"}</DetailRow>
        </DetailList>
        <p className="tw:text-xs tw:text-muted-foreground">Your department, role, and account status are managed by an authorized administrator.</p>
      </CardSection>

      <div className="tw:flex tw:justify-end">
        <Button type="submit" loading={submitting} disabled={!canEditProfile || !dirty} className="tw:min-h-11 tw:w-full tw:sm:min-h-8 tw:sm:w-auto">
          Save Changes
        </Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        title="Save Changes to Your Account?"
        description="Your profile information will be updated."
        confirmText="Save"
        pending={submitting}
        onConfirm={() => void save()}
        onClose={() => setConfirmSave(false)}
      />
    </form>
  );
}
