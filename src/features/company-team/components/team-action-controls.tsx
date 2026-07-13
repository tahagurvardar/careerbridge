"use client";

import { useState, useTransition } from "react";
import {
  ArrowRightLeft,
  CircleX,
  Crown,
  LoaderCircle,
  LogOut,
  ShieldMinus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/features/candidate-profile/components/form-field";
import {
  acceptCompanyInvitationAction,
  type CompanyTeamActionResult,
  declineCompanyInvitationAction,
  demoteCompanyOwnerAction,
  leaveCompanyAction,
  promoteCompanyMemberAction,
  removeCompanyMemberAction,
  revokeCompanyInvitationAction,
  transferCompanyOwnershipAction,
} from "@/features/company-team/server/actions";
import type { CompanyMembershipRole } from "@/generated/prisma/enums";

type DialogAction = {
  label: string;
  pendingLabel: string;
  title: string;
  description: string;
  variant?: "default" | "destructive";
  icon: React.ComponentType<React.ComponentProps<"svg">>;
  run: () => Promise<CompanyTeamActionResult>;
};

function ConfirmAction({ action }: { action: DialogAction }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CompanyTeamActionResult | null>(null);
  const Icon = action.icon;

  function confirm() {
    setResult(null);
    startTransition(async () => {
      const nextResult = await action.run();
      setResult(nextResult);
      if (nextResult.success) {
        setOpen(false);
        if (nextResult.redirectTo) router.push(nextResult.redirectTo);
        else router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-1.5">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant={
              action.variant === "destructive" ? "destructive" : "outline"
            }
            disabled={pending}
          >
            <Icon aria-hidden="true" />
            {action.label}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{action.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {action.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {result && !result.success ? (
            <FormStatus message={result.message} />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={action.variant}
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                confirm();
              }}
            >
              {pending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Icon aria-hidden="true" />
              )}
              {pending ? action.pendingLabel : action.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {result?.success ? <FormStatus message={result.message} success /> : null}
    </div>
  );
}

export function InvitationResponseControls({
  invitationId,
}: {
  invitationId: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmAction
        action={{
          label: "Accept",
          pendingLabel: "Accepting…",
          title: "Accept this invitation?",
          description:
            "You will join this company as a member. Company owners can then manage your membership.",
          icon: Crown,
          run: () => acceptCompanyInvitationAction(invitationId),
        }}
      />
      <ConfirmAction
        action={{
          label: "Decline",
          pendingLabel: "Declining…",
          title: "Decline this invitation?",
          description:
            "The invitation will close and cannot be accepted afterwards.",
          variant: "destructive",
          icon: CircleX,
          run: () => declineCompanyInvitationAction(invitationId),
        }}
      />
    </div>
  );
}

export function RevokeInvitationControl({
  companyId,
  invitationId,
}: {
  companyId: string;
  invitationId: string;
}) {
  return (
    <ConfirmAction
      action={{
        label: "Revoke",
        pendingLabel: "Revoking…",
        title: "Revoke this invitation?",
        description: "The recruiter will no longer be able to accept it.",
        variant: "destructive",
        icon: CircleX,
        run: () => revokeCompanyInvitationAction(companyId, invitationId),
      }}
    />
  );
}

export function MemberAdministrationControls({
  companyId,
  membershipId,
  role,
  isCurrentUser,
  ownerCount,
}: {
  companyId: string;
  membershipId: string;
  role: CompanyMembershipRole;
  isCurrentUser: boolean;
  ownerCount: number;
}) {
  if (isCurrentUser) {
    return role === "OWNER" && ownerCount > 1 ? (
      <ConfirmAction
        action={{
          label: "Demote self",
          pendingLabel: "Demoting…",
          title: "Demote yourself to member?",
          description:
            "You will immediately lose team administration access. Another owner will remain.",
          variant: "destructive",
          icon: ShieldMinus,
          run: async () => {
            const result = await demoteCompanyOwnerAction(
              companyId,
              membershipId,
            );
            return result.success
              ? {
                  ...result,
                  redirectTo: `/recruiter/companies/${companyId}`,
                }
              : result;
          },
        }}
      />
    ) : (
      <span className="text-muted-foreground text-xs">Current user</span>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {role === "MEMBER" ? (
        <>
          <ConfirmAction
            action={{
              label: "Promote",
              pendingLabel: "Promoting…",
              title: "Promote this member to owner?",
              description:
                "Owners can manage the company profile, jobs, applications, and team membership.",
              icon: Crown,
              run: () => promoteCompanyMemberAction(companyId, membershipId),
            }}
          />
          <ConfirmAction
            action={{
              label: "Transfer ownership",
              pendingLabel: "Transferring…",
              title: "Transfer ownership to this member?",
              description:
                "They will become an owner and you will become a member, immediately losing team administration access.",
              variant: "destructive",
              icon: ArrowRightLeft,
              run: async () => {
                const result = await transferCompanyOwnershipAction(
                  companyId,
                  membershipId,
                );
                return result.success
                  ? {
                      ...result,
                      redirectTo: `/recruiter/companies/${companyId}`,
                    }
                  : result;
              },
            }}
          />
        </>
      ) : (
        <ConfirmAction
          action={{
            label: "Demote",
            pendingLabel: "Demoting…",
            title: "Demote this owner to member?",
            description:
              "They will lose company and team administration access. At least one owner must remain.",
            variant: "destructive",
            icon: ShieldMinus,
            run: () => demoteCompanyOwnerAction(companyId, membershipId),
          }}
        />
      )}
      <ConfirmAction
        action={{
          label: "Remove",
          pendingLabel: "Removing…",
          title: "Remove this person from the company?",
          description:
            "They will immediately lose access to the private company workspace. Their audit history is retained.",
          variant: "destructive",
          icon: Trash2,
          run: () => removeCompanyMemberAction(companyId, membershipId),
        }}
      />
    </div>
  );
}

export function LeaveCompanyControl({
  companyId,
  isFinalOwner,
}: {
  companyId: string;
  isFinalOwner: boolean;
}) {
  if (isFinalOwner) {
    return (
      <div className="grid gap-2">
        <Button type="button" variant="destructive" disabled>
          <LogOut aria-hidden="true" />
          Leave company
        </Button>
        <p className="text-muted-foreground text-xs leading-5">
          A company must keep at least one owner. Promote or transfer ownership
          first.
        </p>
      </div>
    );
  }

  return (
    <ConfirmAction
      action={{
        label: "Leave company",
        pendingLabel: "Leaving…",
        title: "Leave this company?",
        description:
          "You will immediately lose access to this private workspace. A company owner must invite you again to restore membership.",
        variant: "destructive",
        icon: LogOut,
        run: () => leaveCompanyAction(companyId),
      }}
    />
  );
}
