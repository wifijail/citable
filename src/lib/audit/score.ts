import { CATEGORIES } from './types';
import type { AuditReport, CategoryScore, CheckResult, Grade } from './types';

const IMPACT_ORDER: Record<CheckResult['impact'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Number of fully detailed fixes a free scan reveals before the paywall. */
export const FREE_FIX_ALLOWANCE = 3;

export function gradeFor(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function verdictFor(score: number, criticalCount: number): string {
  if (criticalCount > 0) {
    return criticalCount === 1
      ? 'One critical issue blocks this page from being cited by AI assistants. Fix it first — everything else is secondary.'
      : `${criticalCount} critical issues block this page from being cited by AI assistants. Fix those first — everything else is secondary.`;
  }
  if (score >= 90) return 'This page is in excellent shape for AI search. Keep freshness signals current and monitor for regressions.';
  if (score >= 75) return 'Solid foundation. A handful of targeted fixes would put this page ahead of most competitors in its niche.';
  if (score >= 60) return 'Readable by AI crawlers, but not shaped to be quoted. The answerability and structured-data gaps are costing you citations.';
  if (score >= 40) return 'Significant gaps. Assistants can reach this page but struggle to extract a confident answer from it.';
  return 'This page is effectively invisible to AI search. The failures below are foundational, not cosmetic.';
}

function groupByCategory(checks: CheckResult[]): CategoryScore[] {
  return CATEGORIES.map((category) => {
    const own = checks.filter((check) => check.category === category.id);
    const totalWeight = own.reduce((sum, check) => sum + check.weight, 0);
    const earned = own.reduce((sum, check) => sum + check.score * check.weight, 0);
    return {
      id: category.id,
      label: category.label,
      weight: category.weight,
      score: totalWeight === 0 ? 100 : Math.round((earned / totalWeight) * 100),
      checks: own,
    };
  });
}

export function scoreChecks(checks: CheckResult[]): {
  score: number;
  grade: Grade;
  verdict: string;
  categories: CategoryScore[];
  priorityFixes: CheckResult[];
} {
  const categories = groupByCategory(checks);

  const totalWeight = categories.reduce((sum, category) => sum + category.weight, 0);
  const weighted = categories.reduce(
    (sum, category) => sum + (category.score / 100) * category.weight,
    0,
  );
  const score = Math.round((weighted / totalWeight) * 100);

  const priorityFixes = checks
    .filter((check) => check.status === 'fail' || check.status === 'warn')
    .sort((a, b) => {
      const byImpact = IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact];
      if (byImpact !== 0) return byImpact;
      // Within an impact tier, surface the biggest lost-points gap first.
      return (1 - b.score) * b.weight - (1 - a.score) * a.weight;
    });

  const criticalCount = checks.filter(
    (check) => check.impact === 'critical' && check.status === 'fail',
  ).length;

  return {
    score,
    grade: gradeFor(score),
    verdict: verdictFor(score, criticalCount),
    categories,
    priorityFixes,
  };
}

/**
 * Free scans show the full score and category breakdown — that is the hook —
 * but only the first few remediation steps. Gating happens on the server so the
 * locked content is never sent to the client.
 */
export function applyPlanGating(report: AuditReport): AuditReport {
  if (report.plan !== 'free') {
    return { ...report, truncated: false, lockedCount: 0 };
  }

  const unlockedIds = new Set(
    report.priorityFixes.slice(0, FREE_FIX_ALLOWANCE).map((check) => check.id),
  );

  let lockedCount = 0;
  const redact = (check: CheckResult): CheckResult => {
    if (unlockedIds.has(check.id) || !check.fix) return check;
    lockedCount++;
    return { ...check, fix: undefined, evidence: undefined, locked: true };
  };

  return {
    ...report,
    categories: report.categories.map((category) => ({
      ...category,
      checks: category.checks.map(redact),
    })),
    priorityFixes: report.priorityFixes.map(redact),
    truncated: lockedCount > 0,
    lockedCount,
  };
}
