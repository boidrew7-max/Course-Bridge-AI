/**
 * Twitter/X uses the same card. Without this file Next emits no twitter:image
 * and the platforms that read only that tag fall back to no preview at all.
 */
export { default, alt, size, contentType } from "./opengraph-image";
