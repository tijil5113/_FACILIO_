import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import {
  dismissOnboarding,
  isOnboardingDismissed,
  type OnboardingCue,
} from "@/lib/onboarding";

interface FirstUseCueProps {
  cue: OnboardingCue;
  title: string;
  children: string;
}

export function FirstUseCue({ cue, title, children }: FirstUseCueProps) {
  const [visible, setVisible] = useState(() => !isOnboardingDismissed(cue));
  if (!visible) {
    return null;
  }
  return (
    <Callout
      tone="info"
      title={title}
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            dismissOnboarding(cue);
            setVisible(false);
          }}
        >
          Got it
        </Button>
      }
    >
      {children}
    </Callout>
  );
}
