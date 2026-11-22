import { useContracts } from "@/data/business-queries";
import { createMockRepositories } from "@/data/mock/repositories";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { QueryProvider } from "@/shared/providers/query-provider";
import { AdminPage } from "@/shared/components/admin/admin-page";
import * as asyncOptions from "@/data/contracts/async-options";
import { useAccessSnapshot } from "./access-snapshot";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { createMockStore } from "@/data/mock/seed";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { DevIdentityProvider, useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useEffectiveModuleIds } from "./queries";
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it("refreshes mounted grants after the linked account is suspended", async () => {
 const store = createMockStore(); const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
 const staff = store.staff.find(x=>x.id === "staff-admin")!;
 const account = store.accounts.find(x=>x.id === staff.accountId)!;
 function View(){const grants=useEffectiveModuleIds();return <p>{grants.has("customers") ? "allowed" : "denied"}</p>;}
 const view = <QueryClientProvider client={client}><MockStoreProvider store={store}><DevIdentityProvider initialIdentityId="dev-admin"><View /></DevIdentityProvider></MockStoreProvider></QueryClientProvider>;
 const mounted=render(view); await screen.findByText("allowed");
 await act(async()=>{account.status="suspended"; await client.invalidateQueries();});
 mounted.rerender(<QueryClientProvider client={client}><MockStoreProvider store={store}><DevIdentityProvider initialIdentityId="dev-admin"><View /></DevIdentityProvider></MockStoreProvider></QueryClientProvider>);
 await waitFor(()=>expect(screen.getByText("denied")).toBeTruthy());
 client.clear();
});

it("hides cached grants during delayed revalidation and after a failed refresh", async () => {
 const client = new QueryClient({defaultOptions:{queries:{retry:false}}}); const store=createMockStore();
 function View(){const snapshot=useAccessSnapshot();return <p>{snapshot.modules.has("customers")?"allowed":"denied"}</p>;}
 render(<QueryClientProvider client={client}><MockStoreProvider store={store}><DevIdentityProvider initialIdentityId="dev-admin"><View /></DevIdentityProvider></MockStoreProvider></QueryClientProvider>);
 await screen.findByText("allowed");
 const pending = vi.spyOn(asyncOptions,"simulateAsync").mockImplementationOnce(()=>new Promise<void>(()=>{}));
 act(()=>{void client.invalidateQueries({queryKey:["access-snapshot"]});});
 await screen.findByText("denied");
 await act(async()=>{await client.cancelQueries({queryKey:["access-snapshot"]});});
 pending.mockRestore();
 vi.spyOn(asyncOptions,"simulateAsync").mockRejectedValueOnce(new Error("Refresh failed"));
 await act(async()=>{await client.invalidateQueries({queryKey:["access-snapshot"]});});
 expect(screen.getByText("denied")).toBeTruthy();
 vi.restoreAllMocks(); client.clear();
});

it("refreshes genealogy scope after a team member moves", async()=>{
 const store=createMockStore(); const client=new QueryClient();
 const child=store.members.find(x=>x.parentId==="mem-sm-a")!;
 function View(){const snapshot=useAccessSnapshot(); return <p>{snapshot.genealogyIds.has(child.id)?"visible":"hidden"}</p>;}
 render(<QueryClientProvider client={client}><MockStoreProvider store={store}><DevIdentityProvider initialIdentityId="dev-sm-a"><View /></DevIdentityProvider></MockStoreProvider></QueryClientProvider>);
 await screen.findByText("visible");
 await act(async()=>{child.parentId="mem-svd-b"; await client.invalidateQueries({queryKey:["access-snapshot"]});});
 await screen.findByText("hidden");client.clear();
});

it("refreshes department-role grants and removes them when its department is archived", async()=>{
 const store=createMockStore(); const client=new QueryClient();
 const role=store.roles.find(x=>x.id==="role-hr-staff")!;
 const department=store.departments.find(x=>x.id===role.departmentId)!;
 function View(){const modules=useEffectiveModuleIds();return <p>{modules.has("roles")?"role allowed":"role denied"}</p>;}
 render(<QueryClientProvider client={client}><MockStoreProvider store={store}><DevIdentityProvider initialIdentityId="dev-hr"><View /></DevIdentityProvider></MockStoreProvider></QueryClientProvider>);
 await waitFor(()=>expect(client.getQueryCache().find({queryKey:["access-snapshot"],exact:false})?.state.status).toBe("success"));
 expect(screen.getByText("role denied")).toBeTruthy();
 await act(async()=>{role.moduleIds.push("roles"); await client.invalidateQueries({queryKey:["access-snapshot"]});});
 await screen.findByText("role allowed");
 await act(async()=>{department.status="deactivated"; await client.invalidateQueries({queryKey:["access-snapshot"]});});
 await screen.findByText("role denied");client.clear();
});

it("does not reuse grants when the development identity changes", async()=>{
 const store=createMockStore();const client=new QueryClient();
 function View(){const {setIdentityId}=useDevIdentity();const snapshot=useAccessSnapshot();return <><p>{snapshot.modules.has("accounts")?"admin grants":"restricted"}</p><button onClick={()=>setIdentityId("dev-ost-a1")}>Switch identity</button></>;}
 render(<QueryClientProvider client={client}><MockStoreProvider store={store}><DevIdentityProvider initialIdentityId="dev-super-admin"><View /></DevIdentityProvider></MockStoreProvider></QueryClientProvider>);
 await screen.findByText("admin grants");
 act(()=>screen.getByRole("button",{name:"Switch identity"}).click());
 await screen.findByText("restricted");expect(screen.queryByText("admin grants")).toBeNull();client.clear();
});

it("unmounts protected forms during access revalidation",async()=>{
 const store=createMockStore();const client=new QueryClient();
 render(<QueryClientProvider client={client}><MockStoreProvider store={store}><DevIdentityProvider initialIdentityId="dev-admin"><AdminPage anyOf={["customers"]} title="Customers" crumbs={[]}><label>Draft<input defaultValue="Unsaved draft" /></label></AdminPage></DevIdentityProvider></MockStoreProvider></QueryClientProvider>);
 const input=await screen.findByLabelText("Draft");
 let finish!:()=>void;
 vi.spyOn(asyncOptions,"simulateAsync").mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve;}));
 act(()=>{void client.invalidateQueries({queryKey:["access-snapshot"]});});
 await screen.findByText("Checking access…");
 expect(screen.queryByLabelText("Draft")).toBeNull();
 await act(async()=>{finish();});
 await screen.findByLabelText("Draft");
 expect(screen.getByLabelText("Draft")).not.toBe(input);client.clear();
});

it("retains an entered draft after a rejected access-affecting command",async()=>{
 function Form(){const command=useMutation({meta:{affectsAccess:true},mutationFn:async()=>{throw new Error("Rejected");}});return <><label>Draft<input defaultValue="Keep me" /></label><button onClick={()=>command.mutate()}>Save invalid</button>{command.isError?<p>Command rejected</p>:null}</>;}
 render(<QueryProvider><MockStoreProvider><DevIdentityProvider initialIdentityId="dev-admin"><AdminPage anyOf={["customers"]} title="Customers" crumbs={[]}><Form /></AdminPage></DevIdentityProvider></MockStoreProvider></QueryProvider>);
 const input=await screen.findByLabelText("Draft");
 act(()=>screen.getByRole("button",{name:"Save invalid"}).click());
 await screen.findByText("Command rejected");expect(screen.getByLabelText("Draft")).toBe(input);
});

it("automatically refreshes mounted access after an authorized suspension command",async()=>{
 const store=createMockStore();const admin=createMockRepositories(store,()=>getDevIdentity("dev-super-admin"));
 function View(){const grants=useEffectiveModuleIds();const command=useMutation({meta:{affectsAccess:true},mutationFn:()=>admin.staff.updateLinkedAccountStatus("staff-admin","suspended")});return <><p>{grants.has("customers")?"allowed":"denied"}</p><button onClick={()=>command.mutate()}>Suspend linked account</button></>;}
 render(<QueryProvider><MockStoreProvider store={store}><DevIdentityProvider initialIdentityId="dev-admin"><View /></DevIdentityProvider></MockStoreProvider></QueryProvider>);
 await screen.findByText("allowed");act(()=>screen.getByRole("button",{name:"Suspend linked account"}).click());await screen.findByText("denied");
});

it("revokes live linked system roles in both mounted grants and repository operations",async()=>{
 const store=createMockStore();const superAdmin=createMockRepositories(store,()=>getDevIdentity("dev-super-admin"));const admin=createMockRepositories(store,()=>getDevIdentity("dev-admin"));
 function View(){const grants=useEffectiveModuleIds();const command=useMutation({meta:{affectsAccess:true},mutationFn:()=>superAdmin.accounts.revokeRole("acct-admin","admin")});return <><p>{grants.has("customers")?"admin allowed":"admin revoked"}</p><button onClick={()=>command.mutate()}>Revoke administrator</button></>;}
 render(<QueryProvider><MockStoreProvider store={store}><DevIdentityProvider initialIdentityId="dev-admin"><View /></DevIdentityProvider></MockStoreProvider></QueryProvider>);
 await screen.findByText("admin allowed");act(()=>screen.getByRole("button",{name:"Revoke administrator"}).click());await screen.findByText("admin revoked");
 await expect(admin.products.update("B1",{description:"Must never be saved"},"Role revoked")).rejects.toThrow(/not allowed/);
});

it("does not reuse broad cached contracts after a role downgrade and identity round trip",async()=>{
 const store=createMockStore();const superAdmin=createMockRepositories(store,()=>getDevIdentity("dev-super-admin"));
 function View(){const {identity,setIdentityId}=useDevIdentity();const contracts=useContracts();const command=useMutation({meta:{affectsAccess:true},mutationFn:async()=>{await superAdmin.accounts.assignRole("acct-admin","ost");await superAdmin.accounts.revokeRole("acct-admin","admin");}});return <><p>{identity.id}</p><p data-testid="contract-count">{contracts.data?.length??"loading"}</p><button onClick={()=>setIdentityId("dev-super-admin")}>Act as Super Admin</button><button onClick={()=>command.mutate()}>Downgrade admin</button><button onClick={()=>setIdentityId("dev-admin")}>Return to admin</button>{command.isSuccess?<p>Downgrade complete</p>:null}</>;}
 render(<QueryProvider><MockStoreProvider store={store}><DevIdentityProvider initialIdentityId="dev-admin"><View /></DevIdentityProvider></MockStoreProvider></QueryProvider>);
 await waitFor(()=>expect(Number(screen.getByTestId("contract-count").textContent)).toBeGreaterThan(0));
 act(()=>screen.getByRole("button",{name:"Act as Super Admin"}).click());
 act(()=>screen.getByRole("button",{name:"Downgrade admin"}).click());
 await screen.findByText("Downgrade complete");
 act(()=>screen.getByRole("button",{name:"Return to admin"}).click());
 expect(Number(screen.getByTestId("contract-count").textContent)||0).toBe(0);
 await waitFor(()=>expect(screen.getByTestId("contract-count").textContent).toBe("0"));
});
