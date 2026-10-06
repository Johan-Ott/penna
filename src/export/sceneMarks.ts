// Bookmarks in a Word manuscript that Word keeps through an editor's changes; they say which
// text is which scene when the file comes back.
export const sceneStartMark = (sceneId: string) => `penna_${sceneId}`;
export const sceneEndMark = (sceneId: string) => `pennaend_${sceneId}`;
