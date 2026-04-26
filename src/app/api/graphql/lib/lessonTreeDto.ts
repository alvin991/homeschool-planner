import { Types } from 'mongoose';

export function toIdString(id: unknown): string {
  if (id != null && typeof id === 'object' && 'toString' in id) {
    return (id as { toString(): string }).toString();
  }
  return String(id);
}

export type LessonTreeNodeDTO = {
  _id: string;
  kind: 'lesson' | 'folder';
  title?: string;
  order: number;
  content?: string | null;
  note?: string | null;
  children: LessonTreeNodeDTO[];
};

export function toLessonTreeNodeDTOs(
  nodes: unknown[] | undefined | null,
): LessonTreeNodeDTO[] {
  if (!Array.isArray(nodes) || !nodes.length) return [];
  return nodes.map((raw) => {
    const n = raw as {
      _id: unknown;
      kind?: string;
      title?: string;
      order?: number;
      content?: string;
      note?: string;
      children?: unknown[];
    };
    const id = toIdString(n._id);
    if (n.kind === 'folder') {
      return {
        _id: id,
        kind: 'folder',
        title: n.title,
        order: n.order ?? 0,
        children: toLessonTreeNodeDTOs(n.children as unknown[]),
      };
    }
    return {
      _id: id,
      kind: 'lesson',
      title: n.title,
      order: n.order ?? 0,
      content: n.content ?? null,
      note: n.note ?? null,
      children: [],
    };
  });
}

const OBJECT_ID_HEX = /^[a-f\d]{24}$/i;

export function lessonTreeInputToMongo(nodes: unknown): unknown[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((raw, index) => {
    const n = raw as {
      kind?: string;
      id?: string;
      _id?: string;
      title?: string;
      order?: number;
      content?: string;
      note?: string;
      children?: unknown[];
    };
    const order = n.order ?? index;
    const kind = typeof n.kind === 'string' ? n.kind.toLowerCase() : '';
    if (kind === 'folder') {
      const base: Record<string, unknown> = {
        kind: 'folder',
        title: n.title,
        order,
        children: lessonTreeInputToMongo(n.children ?? []),
      };
      const oid = n.id ?? n._id;
      if (oid && OBJECT_ID_HEX.test(String(oid))) {
        base._id = new Types.ObjectId(String(oid));
      }
      return base;
    }
    const base: Record<string, unknown> = {
      kind: 'lesson',
      title: n.title,
      order,
      content: n.content ?? undefined,
      note: n.note ?? undefined,
    };
    const oid = n.id ?? n._id;
    if (oid && OBJECT_ID_HEX.test(String(oid))) {
      base._id = new Types.ObjectId(String(oid));
    }
    return base;
  });
}
