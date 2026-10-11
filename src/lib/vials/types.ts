// A vial as the user mixed it. Everything here is entered by the user;
// Monarch only does unit arithmetic on it.

export type VialAmountUnit = 'mg' | 'mcg' | 'IU';

export type Vial = {
  id: string;
  /** Usually the compound or blend name, matched against record names. */
  label: string;
  /** Total in the vial, in mcg (for mg/mcg) or IU. */
  total: number;
  base: 'mcg' | 'IU';
  /** The unit the user typed the total in, for display. */
  enteredUnit: VialAmountUnit;
  diluentMl: number;
  openedAt: string;
  expiresAt?: string;
  /** The inventory item this vial was taken from, if any. */
  inventoryItemId?: string;
  status: 'active' | 'empty';
  createdAt: string;
  updatedAt: string;
};
