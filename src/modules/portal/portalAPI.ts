import { supabase } from '@/lib/supabase'
import type {
  PortalHome,
  PortalBooking,
  PortalMembership,
  PortalPackage,
  PortalDocument,
  PortalForm,
  PortalQuote,
} from './portalTypes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function apiGetHome(token: string): Promise<PortalHome | null> {
  const { data } = await db.rpc('portal_get_home', { p_token: token })
  if (!data?.success) return null
  return data as PortalHome
}

export async function apiGetBookings(
  token:  string,
  filter: 'upcoming' | 'past' | 'cancelled' = 'upcoming',
  limit  = 20,
  offset = 0,
): Promise<PortalBooking[]> {
  const { data } = await db.rpc('portal_get_bookings', {
    p_token: token, p_filter: filter, p_limit: limit, p_offset: offset,
  })
  return (data?.data ?? []) as PortalBooking[]
}

export async function apiCancelBooking(
  token:     string,
  bookingId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await db.rpc('portal_cancel_booking', {
    p_token: token, p_booking_id: bookingId,
  })
  if (error) return { success: false, error: 'Error de conexión' }
  return data ?? { success: false }
}

export async function apiGetMemberships(token: string): Promise<PortalMembership[]> {
  const { data } = await db.rpc('portal_get_memberships', { p_token: token })
  return (data?.data ?? []) as PortalMembership[]
}

export async function apiGetPackages(token: string): Promise<PortalPackage[]> {
  const { data } = await db.rpc('portal_get_packages', { p_token: token })
  return (data?.data ?? []) as PortalPackage[]
}

export async function apiGetDocuments(token: string): Promise<PortalDocument[]> {
  const { data } = await db.rpc('portal_get_documents', { p_token: token })
  return (data?.data ?? []) as PortalDocument[]
}

export async function apiGetForms(token: string): Promise<PortalForm[]> {
  const { data } = await db.rpc('portal_get_forms', { p_token: token })
  return (data?.data ?? []) as PortalForm[]
}

export async function apiGetQuotes(token: string): Promise<PortalQuote[]> {
  const { data } = await db.rpc('portal_get_quotes', { p_token: token })
  return (data?.data ?? []) as PortalQuote[]
}

export async function apiRespondQuote(
  token:   string,
  quoteId: string,
  action:  'accept' | 'reject',
): Promise<{ success: boolean; new_status?: string; error?: string }> {
  const { data, error } = await db.rpc('portal_respond_quote', {
    p_token: token, p_quote_id: quoteId, p_action: action,
  })
  if (error) return { success: false, error: 'Error de conexión' }
  return data ?? { success: false }
}

export async function apiUpdateProfile(
  token:     string,
  full_name: string,
  phone:     string,
  email:     string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await db.rpc('portal_update_profile', {
    p_token: token, p_full_name: full_name, p_phone: phone, p_email: email,
  })
  if (error) return { success: false, error: 'Error de conexión' }
  return data ?? { success: false }
}

export function apiLogEvent(
  token:       string,
  event_type:  string,
  entity_type?: string,
  entity_id?:   string,
): void {
  db.rpc('portal_log_event', {
    p_token:       token,
    p_event_type:  event_type,
    p_entity_type: entity_type ?? null,
    p_entity_id:   entity_id ?? null,
  }).then(() => {})
}
