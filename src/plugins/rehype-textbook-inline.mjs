import { visit } from 'unist-util-visit';

/**
 * Recursively parses text for !!underline!! and __italic__ markers.
 * Returns an array of HAST nodes.
 */
function parseTextbookMarkers(text) {
    if (!text) return [];

    // Find the first occurrence of either marker
    const match = text.match(/(!!.+?!!|__.+?__)/);
    if (!match) {
        return [{ type: 'text', value: text }];
    }

    const marker = match[0];
    const index = match.index;
    const prefix = text.slice(0, index);
    const suffix = text.slice(index + marker.length);
    const content = marker.slice(2, -2);

    const nodes = [];

    // Add text before the marker
    if (prefix) {
        nodes.push({ type: 'text', value: prefix });
    }

    // Add the styled element, recursing on its content
    const isUnderline = marker.startsWith('!!');
    nodes.push({
        type: 'element',
        tagName: 'span',
        properties: {
            style: isUnderline
                ? 'text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px;'
                : 'font-style: italic;'
        },
        children: parseTextbookMarkers(content)
    });

    // Recurse on the remaining text
    if (suffix) {
        nodes.push(...parseTextbookMarkers(suffix));
    }

    return nodes;
}

export function rehypeTextbookInline() {
    return (tree) => {
        visit(tree, 'element', (node) => {
            // Look for code elements
            if (node.tagName === 'code') {
                // Only process inline code (not markers added by Shiki)
                const isInline = !node.properties?.className?.includes('astro-code');

                if (isInline && node.children.length > 0) {
                    // Iterate backwards to allow splicing
                    for (let i = node.children.length - 1; i >= 0; i--) {
                        const child = node.children[i];
                        if (child.type === 'text') {
                            if (child.value.includes('!!') || child.value.includes('__')) {
                                const newNodes = parseTextbookMarkers(child.value);
                                node.children.splice(i, 1, ...newNodes);
                            }
                        }
                    }
                }
            }
        });
    };
}
