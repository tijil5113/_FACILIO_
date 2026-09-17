import { useLayoutEffect, type ComponentType } from "react";
import { useLocation } from "react-router";

import { LearnHome } from "./LearnHome";
import { LearnNavigation } from "./LearnNavigation";
import { ActivityModule } from "./modules/ActivityModule";
import { BringDataModule } from "./modules/BringDataModule";
import { CleaningModule } from "./modules/CleaningModule";
import { CleanupsModule } from "./modules/CleanupsModule";
import { MinuteModule } from "./modules/MinuteModule";
import { ProblemsModule } from "./modules/ProblemsModule";
import { QualityModule } from "./modules/QualityModule";
import { UnderstandDatasetModule } from "./modules/UnderstandDatasetModule";
import { VersionsModule } from "./modules/VersionsModule";
import { sectionIdFromHash, topicIdForSection } from "./learn-topics";

const MODULES: Record<string, ComponentType> = {
  start: MinuteModule,
  bring: BringDataModule,
  data: UnderstandDatasetModule,
  quality: QualityModule,
  problems: ProblemsModule,
  cleaning: CleaningModule,
  versions: VersionsModule,
  cleanups: CleanupsModule,
  activity: ActivityModule,
};

export function LearnPage() {
  const location = useLocation();
  const sectionId = sectionIdFromHash(location.hash);
  const activeTopicId = topicIdForSection(sectionId);
  const Module = sectionId === "home" ? null : MODULES[sectionId];

  useLayoutEffect(() => {
    if (sectionId === "home") {
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
        <div className="min-w-0">{Module ? <Module /> : <LearnHome />}</div>
      </div>
    </div>
  );
}
