/**
 * Extract the current selection as Markdown without processing the whole page.
 * Injected after Turndown.js into the frame containing the selection.
 */
(function () {
    try {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) return null;

        const container = document.createElement('div');
        for (let i = 0; i < selection.rangeCount; i++) {
            const range = selection.getRangeAt(i);
            let fragment = range.cloneContents();
            let ancestor = range.commonAncestorContainer;
            if (ancestor.nodeType !== Node.ELEMENT_NODE) ancestor = ancestor.parentElement;

            // cloneContents omits enclosing links and formatting for partial selections.
            while (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
                const wrapper = ancestor.cloneNode(false);
                wrapper.appendChild(fragment);
                fragment = wrapper;
                ancestor = ancestor.parentElement;
            }

            const block = document.createElement('div');
            block.appendChild(fragment);
            container.appendChild(block);
        }

        // Resolve against the source frame's base URI before serializing to Markdown.
        for (const link of container.querySelectorAll('a[href]')) {
            link.setAttribute('href', link.href);
        }
        for (const image of container.querySelectorAll('img[src]')) {
            image.setAttribute('src', image.src);
        }

        const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-'
        });
        turndownService.addRule('strikethrough', {
            filter: ['del', 's', 'strike'],
            replacement: (content) => content.trim() ? `~~${content}~~` : ''
        });

        return {
            text: selection.toString(),
            markdown: turndownService.turndown(container)
        };
    } catch (error) {
        console.error('Web Clipper: selection extraction failed', error);
        return null;
    }
})();
