import { useLayoutEffect } from "react";
import { useLocation } from "react-router";

import { LearnHome } from "./LearnHome";
import { LearnNavigation } from "./LearnNavigation";
import {
  ActivityModule,
  CleanSafelyModule,
  CleanupsModule,
  FindProblemsModule,
  TwoMinuteModule,
  UnderstandDataModule,
  VersionsModule,
} from "./LearnModules";
import { sectionIdFromHash, topicIdForSection } from "./learn-topics";

export function LearnPage() {
  const location = useLocation();
  const sectionId = sectionIdFromHash(location.hash);
  const activeTopicId = topicIdForSection(sectionId);

  useLayoutEffect(() => {
    const raw = location.hash.replace(/^#/, "");
    if (!raw) {
      return;
    }
    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }
    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "start" });
    }
    const heading = target.querySelector("h1, h2, h3");
    const focusTarget = heading instanceof HTMLElement ? heading : target;
    if (!focusTarget.hasAttribute("tabindex")) {
      focusTarget.tabIndex = -1;
    }
    focusTarget.focus({ preventScroll: true });
  }, [location.hash, sectionId]);

  return (
    <div className="page-enter mx-auto max-w-6xl">
      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <LearnNavigation activeTopicId={activeTopicId} />
        </aside>
        <div className="min-w-0 space-y-16">
          <LearnHome />
          <TwoMinuteModule />
          <UnderstandDataModule />
          <FindProblemsModule />
          <CleanSafelyModule />
          <VersionsModule />
          <CleanupsModule />
          <ActivityModule />
        </div>
      </div>
    </div>
  );
}
