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
import type { RecruiterDictionary } from "@/i18n/dictionary";
import { useLocale } from "@/i18n/client";
import { localizeInternalPath } from "@/i18n/paths";

type DialogAction = {
  label: string;
  pendingLabel: string;
  title: string;
  description: string;
  variant?: "default" | "destructive";
  icon: React.ComponentType<React.ComponentProps<"svg">>;
  run: () => Promise<CompanyTeamActionResult>;
};

function ConfirmAction({
  action,
  cancelLabel,
}: {
  action: DialogAction;
  cancelLabel: string;
}) {
  const router = useRouter();
  const locale = useLocale();
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
        if (nextResult.redirectTo) {
          router.push(localizeInternalPath(nextResult.redirectTo, locale));
        } else router.refresh();
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
            <AlertDialogCancel disabled={pending}>
              {cancelLabel}
            </AlertDialogCancel>
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
  labels,
}: {
  invitationId: string;
  labels: {
    invitation: RecruiterDictionary["invitations"];
    cancel: string;
  };
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmAction
        cancelLabel={labels.cancel}
        action={{
          label: labels.invitation.accept,
          pendingLabel: labels.invitation.accepting,
          title: labels.invitation.acceptTitle,
          description: labels.invitation.acceptDescription,
          icon: Crown,
          run: () => acceptCompanyInvitationAction(invitationId),
        }}
      />
      <ConfirmAction
        cancelLabel={labels.cancel}
        action={{
          label: labels.invitation.decline,
          pendingLabel: labels.invitation.declining,
          title: labels.invitation.declineTitle,
          description: labels.invitation.declineDescription,
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
  labels,
}: {
  companyId: string;
  invitationId: string;
  labels: RecruiterDictionary["team"];
}) {
  return (
    <ConfirmAction
      cancelLabel={labels.cancel}
      action={{
        label: labels.revoke,
        pendingLabel: labels.revoking,
        title: labels.revokeTitle,
        description: labels.revokeDescription,
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
  labels,
}: {
  companyId: string;
  membershipId: string;
  role: CompanyMembershipRole;
  isCurrentUser: boolean;
  ownerCount: number;
  labels: RecruiterDictionary["team"];
}) {
  if (isCurrentUser) {
    return role === "OWNER" && ownerCount > 1 ? (
      <ConfirmAction
        cancelLabel={labels.cancel}
        action={{
          label: labels.demoteSelf,
          pendingLabel: labels.demoting,
          title: labels.demoteSelfTitle,
          description: labels.demoteSelfDescription,
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
      <span className="text-muted-foreground text-xs">
        {labels.currentUser}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {role === "MEMBER" ? (
        <>
          <ConfirmAction
            cancelLabel={labels.cancel}
            action={{
              label: labels.promote,
              pendingLabel: labels.promoting,
              title: labels.promoteTitle,
              description: labels.promoteDescription,
              icon: Crown,
              run: () => promoteCompanyMemberAction(companyId, membershipId),
            }}
          />
          <ConfirmAction
            cancelLabel={labels.cancel}
            action={{
              label: labels.transfer,
              pendingLabel: labels.transferring,
              title: labels.transferTitle,
              description: labels.transferDescription,
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
          cancelLabel={labels.cancel}
          action={{
            label: labels.demote,
            pendingLabel: labels.demoting,
            title: labels.demoteTitle,
            description: labels.demoteDescription,
            variant: "destructive",
            icon: ShieldMinus,
            run: () => demoteCompanyOwnerAction(companyId, membershipId),
          }}
        />
      )}
      <ConfirmAction
        cancelLabel={labels.cancel}
        action={{
          label: labels.remove,
          pendingLabel: labels.removing,
          title: labels.removeTitle,
          description: labels.removeDescription,
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
  labels,
}: {
  companyId: string;
  isFinalOwner: boolean;
  labels: RecruiterDictionary["team"];
}) {
  if (isFinalOwner) {
    return (
      <div className="grid gap-2">
        <Button type="button" variant="destructive" disabled>
          <LogOut aria-hidden="true" />
          {labels.leave}
        </Button>
        <p className="text-muted-foreground text-xs leading-5">
          {labels.finalOwner}
        </p>
      </div>
    );
  }

  return (
    <ConfirmAction
      cancelLabel={labels.cancel}
      action={{
        label: labels.leave,
        pendingLabel: labels.leaving,
        title: labels.leaveTitle,
        description: labels.leaveDescription,
        variant: "destructive",
        icon: LogOut,
        run: () => leaveCompanyAction(companyId),
      }}
    />
  );
}
