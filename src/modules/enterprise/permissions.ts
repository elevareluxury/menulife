import type { OrgRole } from './enterpriseTypes'

export interface PermissionSet {
  // Visibility
  canViewAllLocations:  boolean
  canSwitchLocations:   boolean
  // Settings & Team
  canManageSettings:    boolean
  canManageTeam:        boolean
  canManageOrganization:boolean
  // Data — read
  canViewAnalytics:     boolean
  canExportData:        boolean
  // Data — write
  canManageClients:     boolean
  canManageBookings:    boolean
  canManageSales:       boolean
  canManageMemberships: boolean
  canManagePackages:    boolean
  canManageDocuments:   boolean
  canManageForms:       boolean
  canManageQuotes:      boolean
  // Portal
  canViewPortalConfig:  boolean
}

export const PERMISSION_MAP: Record<OrgRole, PermissionSet> = {
  owner: {
    canViewAllLocations:   true,
    canSwitchLocations:    true,
    canManageSettings:     true,
    canManageTeam:         true,
    canManageOrganization: true,
    canViewAnalytics:      true,
    canExportData:         true,
    canManageClients:      true,
    canManageBookings:     true,
    canManageSales:        true,
    canManageMemberships:  true,
    canManagePackages:     true,
    canManageDocuments:    true,
    canManageForms:        true,
    canManageQuotes:       true,
    canViewPortalConfig:   true,
  },
  admin: {
    canViewAllLocations:   true,
    canSwitchLocations:    true,
    canManageSettings:     true,
    canManageTeam:         false,
    canManageOrganization: false,
    canViewAnalytics:      true,
    canExportData:         true,
    canManageClients:      true,
    canManageBookings:     true,
    canManageSales:        true,
    canManageMemberships:  true,
    canManagePackages:     true,
    canManageDocuments:    true,
    canManageForms:        true,
    canManageQuotes:       true,
    canViewPortalConfig:   true,
  },
  manager: {
    canViewAllLocations:   false,
    canSwitchLocations:    false,
    canManageSettings:     false,
    canManageTeam:         false,
    canManageOrganization: false,
    canViewAnalytics:      true,
    canExportData:         false,
    canManageClients:      true,
    canManageBookings:     true,
    canManageSales:        true,
    canManageMemberships:  true,
    canManagePackages:     true,
    canManageDocuments:    true,
    canManageForms:        true,
    canManageQuotes:       true,
    canViewPortalConfig:   false,
  },
  staff: {
    canViewAllLocations:   false,
    canSwitchLocations:    false,
    canManageSettings:     false,
    canManageTeam:         false,
    canManageOrganization: false,
    canViewAnalytics:      false,
    canExportData:         false,
    canManageClients:      true,
    canManageBookings:     true,
    canManageSales:        false,
    canManageMemberships:  false,
    canManagePackages:     false,
    canManageDocuments:    false,
    canManageForms:        true,
    canManageQuotes:       false,
    canViewPortalConfig:   false,
  },
}

export function getPermissions(role: OrgRole | null | undefined): PermissionSet {
  return PERMISSION_MAP[role ?? 'staff'] ?? PERMISSION_MAP.staff
}
