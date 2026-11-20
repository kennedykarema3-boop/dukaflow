"use server";

import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  role: z.enum(["manager", "cashier", "staff"]),
});

export type TeamInviteState = {
  error?: string;
  success?: string;
  inviteLink?: string;
};

export async function createTeamInvitation(
  _previousState: TeamInviteState,
  formData: FormData
): Promise<TeamInviteState> {
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Please sign in again." };
  }

  const { data: businesses, error: businessError } =
    await supabase.rpc("get_my_business");

  const business = businesses?.[0];

  if (businessError || !business) {
    return { error: "Could not find your business workspace." };
  }

  if (business.role !== "owner") {
    return { error: "Only the business owner can invite team members." };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const { error: insertError } = await supabase
    .from("business_invitations")
    .insert({
      business_id: business.business_id,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "There is already a pending invitation for this email." };
    }

    return { error: insertError.message };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return { error: "The application URL is not configured." };
  }

  return {
    success: "Invitation created. Share this link with the team member.",
    inviteLink: `${appUrl}/invite/${rawToken}`,
  };
}
export async function regenerateInvitationLink(
  _previousState: TeamInviteState,
  formData: FormData
): Promise<TeamInviteState> {
  const invitationId = formData.get("invitationId");

  if (typeof invitationId !== "string" || !invitationId) {
    return { error: "Invalid invitation." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Please sign in again." };
  }

  const { data: businesses, error: businessError } =
    await supabase.rpc("get_my_business");

  const business = businesses?.[0];

  if (businessError || !business || business.role !== "owner") {
    return { error: "Only the business owner can manage invitations." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return { error: "Application URL is not configured." };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const { data, error } = await supabase
    .from("business_invitations")
    .update({
      token_hash: tokenHash,
      expires_at: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .eq("id", invitationId)
    .eq("business_id", business.business_id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Invitation not found or no longer pending." };
  }

  return {
    success: "A new invitation link has been generated.",
    inviteLink: `${appUrl}/invite/${rawToken}`,
  };
}
export async function revokeTeamInvitation(
  _previousState: TeamInviteState,
  formData: FormData
): Promise<TeamInviteState> {
  const invitationId = formData.get("invitationId");

  if (typeof invitationId !== "string" || !invitationId) {
    return { error: "Invalid invitation." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Please sign in again." };
  }

  const { data: businesses, error: businessError } =
    await supabase.rpc("get_my_business");

  const business = businesses?.[0];

  if (businessError || !business || business.role !== "owner") {
    return { error: "Only the business owner can revoke invitations." };
  }

  const { data, error } = await supabase
    .from("business_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("business_id", business.business_id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Invitation not found or no longer pending." };
  }

  return { success: "Invitation revoked successfully." };
}