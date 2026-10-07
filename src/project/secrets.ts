import type { SceneSummary } from "./sceneSummaries.js";
import { manuscriptSceneIds, SECRETS_ID, sceneIdsIn, type TreeNode, findNode } from "./tree.js";

/** A note in Hemligheter: when the reader learns it, and who learns it in which scene. */
export interface Secret {
  id: string;
  name: string;
  /** The scene where the reader learns it; null while it is not decided. */
  reveal: string | null;
  knownBy: Record<string, string>;
}

export function secretsOf(tree: TreeNode[], summaries: Record<string, SceneSummary>): Secret[] {
  return sceneIdsIn(tree, SECRETS_ID).map((id) => {
    const node = findNode(tree, id)?.node;
    return {
      id,
      name: summaries[id]?.title ?? "",
      reveal: node?.reveal ?? null,
      knownBy: node?.knownBy ?? {},
    };
  });
}

/** Where a scene stands in the book's reading order; -1 for anything outside the manuscript. */
export const readingPlace = (tree: TreeNode[]) => {
  const order = manuscriptSceneIds(tree);
  return (sceneId: string) => order.indexOf(sceneId);
};

/** What a person learns, and from which scene, in reading order. */
export function secretsKnownBy(tree: TreeNode[], secrets: Secret[], personId: string) {
  const place = readingPlace(tree);
  return secrets
    .filter((secret) => secret.knownBy[personId])
    .map((secret) => ({ secret, from: secret.knownBy[personId] as string }))
    .sort((one, other) => place(one.from) - place(other.from));
}

/** The scenes that name the secret before the reader is meant to learn it. */
export function earlyMentions(tree: TreeNode[], secret: Secret, mentionedIn: string[]) {
  if (!secret.reveal) return [];
  const place = readingPlace(tree);
  const revealAt = place(secret.reveal);
  return mentionedIn.filter((sceneId) => {
    const where = place(sceneId);
    return where !== -1 && where < revealAt;
  });
}
