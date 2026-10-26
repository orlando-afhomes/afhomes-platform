export function countVisibleMembers(members: readonly { id: string }[]) {
  return members.length;
}

export function countVisibleCustomers(customers: readonly { id: string }[]) {
  return customers.length;
}

export function countUplines(uplines: readonly { id: string }[]) {
  return uplines.length;
}
