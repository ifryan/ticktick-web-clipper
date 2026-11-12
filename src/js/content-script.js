/**
 * Content Script — extracts page content as Markdown
 * Injected into the active tab via chrome.scripting.executeScript
 * Uses Readability.js for article extraction and Turndown.js for HTML→Markdown
 */
(function () {
    try {
        // Clone the document so Readability doesn't modify the original
        const docClone = document.cloneNode(true);
        const article = new Readability(docClone).parse();

        if (!article || !article.content) {
            return '';
        }

        // Convert HTML to Markdown
        const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-'
        });

        let markdown = turndownService.turndown(article.content);

        // Remove accidental tag markers: # followed by non-space chars
        // that TickTick would interpret as tags
        const removeTagsRegex = /#(?![\s\\/#":*?<>|])/g;
        markdown = markdown.replace(removeTagsRegex, '#/');

        return markdown;
    } catch (error) {
        console.error('Web Clipper: content extraction failed', error);
        return '';
    }
})();
