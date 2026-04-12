import type { CourseTreeNodeType, CourseType, LessonType } from './types';
import type { TreeData, TreeItem } from './components/lessons-tree/types';

const OBJECT_ID_HEX = /^[a-f\d]{24}$/i;

/** Find a lesson leaf anywhere in the API tree (depth-first). */
export function findLessonInTree(
  nodes: CourseTreeNodeType[] | undefined,
  id: string,
): LessonType | null {
  if (!nodes?.length) return null;
  for (const n of nodes) {
    if (n.kind === 'lesson' && String(n._id) === id) {
      return {
        _id: String(n._id),
        title: n.title,
        content: n.content ?? '',
        note: n.note ?? '',
        order: n.order ?? 0,
      };
    }
    if (n.kind === 'folder' && n.children?.length) {
      const found = findLessonInTree(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function countLessonLeaves(
  nodes: unknown[] | CourseTreeNodeType[] | null | undefined,
): number {
  if (!nodes?.length) return 0;
  let count = 0;
  for (const raw of nodes) {
    const n = raw as { kind?: string; children?: unknown[] };
    if (n.kind === 'lesson') count += 1;
    if (n.children?.length) count += countLessonLeaves(n.children);
  }
  return count;
}

/** API / Mongo tree → UI tree for dnd-kit. */
export function apiTreeToTreeData(nodes: CourseTreeNodeType[] | undefined): TreeData {
  if (!nodes?.length) return [];
  return nodes.map((n) => {
    if (n.kind === 'folder') {
      return {
        id: String(n._id),
        type: 'folder' as const,
        title: n.title,
        children: apiTreeToTreeData(n.children),
      };
    }
    return {
      id: String(n._id),
      type: 'lesson' as const,
      title: n.title,
    };
  });
}

export type LessonFieldOverrides = Record<
  string,
  { title?: string; content?: string; note?: string }
>;

/**
 * UI tree → plain JSON for `updateCourseLessonTree` (GraphQL LessonTreeNodeInput).
 * Pulls `content` / `note` from `course.lessonTree` for persisted lesson ids.
 * Optional `overrides` (e.g. from LessonForm) wins for that lesson id.
 */
export function treeDataToLessonTreeJson(
  tree: TreeData,
  course: CourseType,
  overrides?: LessonFieldOverrides,
): unknown[] {
  return tree.map((node, index) => mapTreeItem(node, index, course, overrides));
}

function mapTreeItem(
  node: TreeItem,
  index: number,
  course: CourseType,
  overrides?: LessonFieldOverrides,
): Record<string, unknown> {
  const order = index;
  if (node.type === 'folder') {
    const o = overrides?.[node.id];
    const title = o?.title ?? node.title;
    const base: Record<string, unknown> = {
      kind: 'folder',
      title,
      order,
      children: (node.children ?? []).map((c, i) =>
        mapTreeItem(c, i, course, overrides),
      ),
    };
    if (OBJECT_ID_HEX.test(node.id)) {
      base._id = node.id;
    }
    return base;
  }
  const fromCourse = findLessonInTree(course.lessonTree, node.id);
  const o = overrides?.[node.id];
  const title = o?.title ?? node.title;
  const content = o?.content ?? fromCourse?.content ?? '';
  const note = o?.note ?? fromCourse?.note ?? '';
  const base: Record<string, unknown> = {
    kind: 'lesson',
    title,
    order,
    content,
    note,
  };
  if (OBJECT_ID_HEX.test(node.id)) {
    base._id = node.id;
  }
  return base;
}
