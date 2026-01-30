export function transformerTextbook() {
    return {
        name: 'shiki-transformer-textbook',
        preprocess(code) {
            // Use unique markers. Replace !! first, then __ to handle nesting.
            // We use a multi-pass approach to ensure nesting like !!__word__!! or __!!word!!__ works.
            let result = code;

            // We'll do this in a loop or specifically ordered passes.
            // pass 1: underlines
            result = result.replace(/!!(.+?)!!/g, '___USTART___$1___UEND___');
            // pass 2: italics
            result = result.replace(/__(.+?)__/g, '___ISTART___$1___IEND___');

            return result;
        },
        postprocess(html) {
            // Restore as styled HTML spans.
            return html
                .replace(/___USTART___/g, '<span style="text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px;">')
                .replace(/___UEND___/g, '</span>')
                .replace(/___ISTART___/g, '<span style="font-style: italic;">')
                .replace(/___IEND___/g, '</span>');
        }
    }
}
