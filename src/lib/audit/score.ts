import type { AuditMessages } from '@/i18n/audit/en';
import { CATEGORIES } from './types';
import type { AuditReport, CategoryScore, CheckResult, Grade, Impact } from './types';

const IMPACT_ORDER: Record<Impact, number> = {
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

function verdictFor(score: number, criticalCount: number, t: AuditMessages): string {
  if (criticalCount === 1) return t.verdicts.criticalOne;
  if (criticalCount > 1) return t.verdicts.criticalMany(criticalCount);
  if (score >= 90) return t.verdicts.a;
  if (score >= 75) return t.verdicts.b;
  if (score >= 60) return t.verdicts.c;
  if (score >= 40) return t.verdicts.d;
  return t.verdicts.f;
}

function groupByCategory(checks: CheckResult[], t: AuditMessages): CategoryScore[] {
  return CATEGORIES.map((category) => {
    const own = checks.filter((check) => check.category === category.id);
    const totalWeight = own.reduce((sum, check) => sum + check.weight, 0);
    const earned = own.reduce((sum, check) => sum + check.score * check.weight, 0);
    return {
      id: category.id,
      label: t.categories[category.id].label,
      description: t.categories[category.id].description,
      weight: category.weight,
      score: totalWeight === 0 ? 100 : Math.round((earned / totalWeight) * 100),
      checks: own,
    };
  });
}

export function scoreChecks(
  checks: CheckResult[],
  t: AuditMessages,
): {
  score: number;
  grade: Grade;
  verdict: string;
  categories: CategoryScore[];
  priorityFixes: CheckResult[];
} {
  const categories = groupByCategory(checks, t);

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
    verdict: verdictFor(score, criticalCount, t),
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

  const lockedIds = new Set<string>();
  const redact = (check: CheckResult): CheckResult => {
    if (unlockedIds.has(check.id) || !check.fix) return check;
    lockedIds.add(check.id);
    return { ...check, fix: undefined, evidence: undefined, locked: true };
  };

  const categories = report.categories.map((category) => ({
    ...category,
    checks: category.checks.map(redact),
  }));
  const priorityFixes = report.priorityFixes.map(redact);

  return {
    ...report,
    categories,
    priorityFixes,
    // The corrected robots.txt stays free; the llms.txt and JSON-LD drafts are paid.
    generated: { robotsTxt: report.generated.robotsTxt, llmsTxt: null, jsonLd: null },
    truncated: lockedIds.size > 0 || report.generated.llmsTxt !== null || report.generated.jsonLd !== null,
    lockedCount: lockedIds.size,
  };
}
