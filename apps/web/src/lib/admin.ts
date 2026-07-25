export const ADMIN_ADDRESS = "0xC965CDBf5FCb445aD9B01219BD4a23574B8d4041" as const;

export function isAdminAddress(address: string | undefined): boolean {
  if (!address) return false;
  return address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
}
