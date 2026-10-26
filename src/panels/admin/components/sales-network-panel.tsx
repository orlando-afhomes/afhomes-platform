"use client";

import { useQuery } from "@tanstack/react-query";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMembers, useCustomers, useMockRepositories } from "@/data/queries";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { countVisibleCustomers, countVisibleMembers, countUplines } from "../dashboard-metrics";

function roleTitle(roles: string[]) {
  if (roles.includes("svd")) return "Senior Vice Director";
  if (roles.includes("ssm")) return "Senior Sales Manager";
  if (roles.includes("sm")) return "Sales Manager";
  if (roles.includes("ist")) return "Internal Sales";
  if (roles.includes("ost")) return "Outside Sales";
  return "Sales Network";
}

export function SalesNetworkPanel() {
  const { identity } = useDevIdentity();
  const membersQuery = useMembers();
  const customersQuery = useCustomers();
  const repositories = useMockRepositories();
  const uplinesQuery = useQuery({
    queryKey: ["uplines", identity.id],
    queryFn: () => repositories.members.listUplineSummaries(),
  });

  const members = membersQuery.data ?? [];
  const uplines = uplinesQuery.data ?? [];
  const currentMember = members.find((member) => member.id === identity.memberId) ?? null;
  const loading = membersQuery.isLoading || uplinesQuery.isLoading;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <PageHeader title={roleTitle(identity.roles)} description="Authorized Sales Network account context." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Visible team members</CardTitle>
          </CardHeader>
          <CardContent>
            {membersQuery.isLoading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-semibold">{countVisibleMembers(members)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Visible customers</CardTitle>
          </CardHeader>
          <CardContent>
            {customersQuery.isLoading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-semibold">{countVisibleCustomers(customersQuery.data ?? [])}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Authorized uplines</CardTitle>
          </CardHeader>
          <CardContent>
            {uplinesQuery.isLoading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-semibold">{countUplines(uplines)}</p>}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Account context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {currentMember ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{currentMember.displayName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Designation</span>
                    <Badge variant="secondary">{currentMember.designation}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Branch</span>
                    <span>{currentMember.branchId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span>{currentMember.status}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No account context available.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authorized upline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {uplines.length === 0 ? (
                <p className="text-muted-foreground">No upline members.</p>
              ) : (
                <ul className="space-y-1">
                  {uplines.map((upline) => (
                    <li key={upline.id} className="flex items-center justify-between">
                      <span>{upline.displayName}</span>
                      <Badge variant="outline">{upline.designation}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Authorized team members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {members.length === 0 ? (
                <p className="text-muted-foreground">No authorized members found.</p>
              ) : (
                <>
                  <p className="text-muted-foreground">{members.length} visible member(s)</p>
                  <ul className="space-y-1">
                    {members.map((member) => (
                      <li key={member.id} className="flex items-center justify-between">
                        <span>{member.displayName}</span>
                        <Badge variant="outline">{member.designation}</Badge>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
