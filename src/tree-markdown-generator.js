"use strict";

const markdownParser = require("./markdown-parser");

module.exports = {
    getMarkdownForTree
};

function getMarkdownForTree(tree, environment) {
    const lines = getMarkdownLinesForTree(tree, [], environment);
    return lines.join(environment.endOfLine);
}

function getMarkdownLinesForTree(tree, parentPathParts, environment) {
    const markdownLines = [];
    const indentationUnit = getIndentationUnit(environment);

    for (const treeNode of tree) {
        const markdownForTreeNode = getMarkdownForTreeNode(treeNode, parentPathParts, environment);

        markdownLines.push(...markdownForTreeNode.split(environment.endOfLine));

        if (treeNode.isDirectory) {
            const fullPathParts = [...parentPathParts, treeNode.filename];

            const linesForChildren = getMarkdownLinesForTree(
                treeNode.children,
                fullPathParts,
                environment
            );

            const indentedLines = linesForChildren.map(line => indentationUnit + line);
            markdownLines.push(...indentedLines);
        }
    }

    return markdownLines;
}

function getIndentationUnit(environment) {
    // Markdown standard: either four spaces or tabs
    if (environment.options.useTabs) {
        return "\t";
    } else {
        return " ".repeat(environment.options.numberSpaces);
    }
}

function getMarkdownForTreeNode(treeNode, parentPath, environment) {
    const linkParagraphText = getLinkParagraphTextForTreeNode(treeNode);
    const linkTarget = getLinkTargetForTreeNode(treeNode, parentPath, environment);

    const markdownForLink = markdownParser.generateLinkFromMarkdownParagraphAndUrl(
        linkParagraphText,
        linkTarget
    );

    const basicLine = `- ${markdownForLink}`;

    if (treeNode.descriptionParagraph) {
        const descriptionSeparator = getDescriptionSeparator(environment);
        return basicLine + descriptionSeparator + treeNode.descriptionParagraph;
    } else {
        return basicLine;
    }
}

function getLinkParagraphTextForTreeNode(treeNode) {
    const titleParagraph = treeNode.titleParagraph;

    if (treeNode.isDirectory) {
        // some tools have trouble with nested strong content (although mdast and VS Code support it), so we avoid it.
        // removeStrongFromMarkdown might alter Markdown formatting syntax, but the result should look the same.
        // this is good enough inside the tree, since it's generated by this tool rather than being maintained by the user.
        const titleParagraphNoStrong = markdownParser.removeStrongFromMarkdown(titleParagraph);
        return markdownParser.generateStrongParagraphFromMarkdownParagraph(titleParagraphNoStrong);
    } else {
        return titleParagraph;
    }
}

function getLinkTargetForTreeNode(treeNode, parentPathParts, environment) {
    const fullPathParts = [...parentPathParts, treeNode.filename];
    let linkTarget = fullPathParts.join("/");

    if (treeNode.isDirectory && environment.options.linkToSubdirectoryReadme) {
        linkTarget = linkTarget + "/README.md";
    }

    return linkTarget;
}

function getDescriptionSeparator(environment) {
    if (environment.options.subdirectoryDescriptionOnNewLine) {
        return "  " + environment.endOfLine + getIndentationUnit(environment);
    } else {
        return " - ";
    }
}
