import { describe, it, expect } from 'vitest';
import { AnnotationLayoutManager, MarginAnnotation } from './layout-manager';

function annotation(id: string, anchorMessageId: string): MarginAnnotation {
  return { id, type: 'tag-label', anchorMessageId, priority: 0, minHeight: 40, data: {} };
}

// messagePositions is normally populated from live DOM measurements; seeding it
// directly lets us exercise the pure collision math without a DOM. (TS `private`
// is erased at runtime, so the bracket access is valid here.)
function seed(mgr: AnnotationLayoutManager, positions: Record<string, { top: number; height: number }>) {
  const map = (mgr as any).messagePositions as Map<string, { top: number; height: number }>;
  for (const [id, pos] of Object.entries(positions)) map.set(id, pos);
}

describe('AnnotationLayoutManager.layoutAnnotations', () => {
  it('pushes a colliding annotation below the previous one (actualTop + height + 8px gap)', () => {
    const mgr = new AnnotationLayoutManager();
    seed(mgr, { m1: { top: 0, height: 100 }, m2: { top: 20, height: 100 } });

    const positions = mgr.layoutAnnotations([annotation('a1', 'm1'), annotation('a2', 'm2')]);

    expect(positions).toHaveLength(2);
    expect(positions[0].actualTop).toBe(0);
    // a2 ideal top 20 overlaps a1 (0 + 40 + 8 = 48), so it is pushed to 48.
    expect(positions[1].actualTop).toBe(48);
  });

  it('skips annotations whose anchor message has no measured position', () => {
    const mgr = new AnnotationLayoutManager();
    seed(mgr, { m1: { top: 0, height: 100 } });

    const positions = mgr.layoutAnnotations([annotation('a1', 'm1'), annotation('aX', 'missing')]);

    expect(positions).toHaveLength(1);
    expect(positions[0].annotationId).toBe('a1');
  });
});
