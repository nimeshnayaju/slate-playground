"use client";

import { AutoLinkElement } from "@/slate";
import { KeyboardEventHandler, useMemo } from "react";
import {
  Descendant,
  createEditor,
  NodeEntry,
  Node,
  Range,
  Text,
  Editor,
  Transforms,
  Path,
  Element,
  Point,
} from "slate";
import { withHistory } from "slate-history";
import {
  Slate,
  Editable,
  withReact,
  RenderElementProps,
  RenderLeafProps,
} from "slate-react";

type Props = {
  defaultValue: Descendant[];
  onValueChange?: (value: Descendant[]) => void;
};

export default function SlateEditor({ defaultValue, onValueChange }: Props) {
  const editor = useMemo(() => {
    return withAutoLinks(withHistory(withReact(createEditor())));
  }, []);

  const handleValueChange = (value: Descendant[]) => {
    onValueChange?.(value);
  };

  const handleRenderElement = ({
    children,
    attributes,
    element,
  }: RenderElementProps) => {
    switch (element.type) {
      case "auto-link":
        return (
          <a
            href={element.url}
            {...attributes}
            style={{ textDecoration: "underline" }}
          >
            {children}
          </a>
        );
      default:
        return <div {...attributes}>{children}</div>;
    }
  };

  const handleRenderLeaf = ({
    children,
    attributes,
    leaf,
  }: RenderLeafProps) => {
    if (leaf.bold) {
      children = <strong>{children}</strong>;
    }

    if (leaf.italic) {
      children = <em>{children}</em>;
    }

    return <span {...attributes}>{children}</span>;
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {};

  const handleDecorate = ([node, path]: NodeEntry) => {
    return [];
  };

  return (
    <Slate
      editor={editor}
      initialValue={defaultValue}
      onChange={handleValueChange}
    >
      <Editable
        autoFocus
        renderElement={handleRenderElement}
        renderLeaf={handleRenderLeaf}
        onKeyDown={handleKeyDown}
        decorate={handleDecorate}
        className="h-full outline-none p-4 border-2 border-gray-300 rounded-md"
      />
    </Slate>
  );
}

function isAutoLinkNode(node: Node): node is AutoLinkElement {
  return Element.isElement(node) && node.type === "auto-link";
}

/**
 * 1. ((https?:\/\/(www\.)?)|(www\.))
 * - Matches 'http://' or 'https://' optionally followed by 'www.', or just 'www.'
 *
 * 2. [-a-zA-Z0-9@:%._+~#=]{1,256}
 * - Matches any character in the set [-a-zA-Z0-9@:%._+~#=] between 1 and 256 times, often found in the domain and subdomain part of the URL
 *
 * 3. \.[a-zA-Z0-9()]{1,6}
 * - Matches a period followed by any character in the set [a-zA-Z0-9()] between 1 and 6 times, usually indicating the domain extension like .com, .org, etc.
 *
 * 4. \b
 * - Represents a word boundary, ensuring that the characters following cannot be part of a different word
 *
 * 5. ([-a-zA-Z0-9().@:%_+~#?&//=]*)
 * - Matches any character in the set [-a-zA-Z0-9().@:%_+~#?&//=] between 0 and unlimited times, often found in the path, query parameters, or anchor part of the URL
 *
 * Matching URLs:
 * - http://www.example.com
 * - https://www.example.com
 * - www.example.com
 * - https://example.com/path?query=param#anchor
 *
 * Non-Matching URLs:
 * - http:/example.com (malformed scheme)
 * - example (missing scheme and domain extension)
 * - ftp://example.com (ftp scheme is not supported)
 * - example.com (missing scheme)
 */
const URL_REGEX =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9().@:%_+~#?&//=]*)/;

const PUNCTUATION_OR_SPACE = /[.,;!?\s]/;

const PERIOD_OR_QUESTION_MARK_FOLLOWED_BY_ALPHANUMERIC = /^[.?][a-zA-Z0-9]+/;

/**
 * Helper function to check if a character is a separator (punctuation or space)
 * @param char The character to check
 * @returns Whether the character is a separator or not
 */
function isSeparator(char: string): boolean {
  return PUNCTUATION_OR_SPACE.test(char);
}

/**
 * Helper function to check if a text content ends with a separator (punctuation or space)
 * @param textContent The text content to check
 * @returns Whether the text content ends with a separator or not
 */
function endsWithSeparator(textContent: string): boolean {
  return isSeparator(textContent[textContent.length - 1]);
}

/**
 * Helper function to check if a text content starts with a separator (punctuation or space)
 * @param textContent The text content to check
 * @returns Whether the text content starts with a separator or not
 */
function startsWithSeparator(textContent: string): boolean {
  return isSeparator(textContent[0]);
}

/**
 * Helper function to check if a text content ends with a period or question mark
 * @param textContent The text content to check
 * @returns Whether the text content ends with a period or not
 */
function endsWithPeriodOrQuestionMark(textContent: string): boolean {
  return (
    textContent[textContent.length - 1] === "." ||
    textContent[textContent.length - 1] === "?"
  );
}

/**
 * Helper function to check if the previous node is valid (text node that ends with a separator or is empty)
 */
function isPreviousNodeValid(editor: Editor, path: Path): boolean {
  const entry = Editor.previous(editor, { at: path });
  if (!entry) return true;

  return (
    Text.isText(entry[0]) &&
    (endsWithSeparator(entry[0].text) || entry[0].text === "")
  );
}

/**
 * Helper function to check if the next node is valid (text node that starts with a separator or is empty)
 */
function isNextNodeValid(editor: Editor, path: Path): boolean {
  const entry = Editor.next(editor, { at: path });
  if (!entry) return true;

  return (
    Text.isText(entry[0]) &&
    (startsWithSeparator(entry[0].text) || entry[0].text === "")
  );
}

function isContentAroundValid(
  editor: Editor,
  entry: NodeEntry<Text>,
  start: number,
  end: number
): boolean {
  const [node, path] = entry;
  const text = node.text;

  const contentBeforeIsValid =
    start > 0
      ? isSeparator(text[start - 1])
      : isPreviousNodeValid(editor, path);

  const contentAfterIsValid =
    end < text.length ? isSeparator(text[end]) : isNextNodeValid(editor, path);

  return contentBeforeIsValid && contentAfterIsValid;
}

const handleLinkEdit = (editor: Editor, entry: NodeEntry<AutoLinkElement>) => {
  const [node, path] = entry;

  // Step 1: Ensure that the Link node only contains text nodes as children
  const children = Node.children(editor, path);
  for (const [child] of children) {
    if (Text.isText(child)) continue;
    Transforms.unwrapNodes(editor, { at: path });
    return;
  }
  // Attempt to match the text content (of the Link node) against the URL regex
  const text = Node.string(node);
  const match = URL_REGEX.exec(text);

  console.log("handleLinkEdit", text, match && match[0]);

  // Step 2: Ensure that the text content of the Link node matches the URL regex and is identical to the match
  if (!match || match[0] !== text) {
    Transforms.unwrapNodes(editor, { at: path });
    return;
  }

  // Step 3: Ensure that if the text content of the Link node ends with a period, we unwrap the Link node and wrap the text before the period in a new Link node
  if (endsWithPeriodOrQuestionMark(text)) {
    Transforms.unwrapNodes(editor, { at: path });

    const textBeforePeriod = text.slice(0, text.length - 1);

    // Remove the last character from the link text and wrap the remaining text in a new link node
    Transforms.wrapNodes<AutoLinkElement>(
      editor,
      {
        type: "auto-link",
        url: textBeforePeriod,
        children: [],
      },
      {
        at: {
          anchor: { path, offset: 0 },
          focus: { path, offset: textBeforePeriod.length },
        },
        split: true,
      }
    );
    return;
  }

  // Step 4: Ensure that the text content of the Link node is surrounded by separators or the start/end of the text content
  if (!isPreviousNodeValid(editor, path) || !isNextNodeValid(editor, path)) {
    Transforms.unwrapNodes(editor, { at: path });
    return;
  }

  // Step 5: Ensure that the url attribute of the Link node is identical to its text content
  if (node.url !== text) {
    Transforms.setNodes(editor, { url: match[0] }, { at: path });
    return;
  }
};

const handleLinkCreate = (editor: Editor, entry: NodeEntry<Text>) => {
  const [node, path] = entry;

  // Step 1: Ensure that the text content of the node matches the URL regex
  const match = URL_REGEX.exec(node.text);
  if (!match) return;

  const start = match.index;
  const end = start + match[0].length;

  console.log("handleLinkCreate", node.text, match[0]);

  // Step 2: Ensure that the content around the node is valid (surrounded by separators on either sides)
  if (!isContentAroundValid(editor, entry, start, end)) return;

  Transforms.wrapNodes<AutoLinkElement>(
    editor,
    {
      type: "auto-link",
      url: match[0],
      children: [],
    },
    {
      at: {
        anchor: { path, offset: start },
        focus: { path, offset: end },
      },
      split: true,
    }
  );
  return;
};

const handleNeighbours = (editor: Editor, entry: NodeEntry<Text>) => {
  const [node, path] = entry;
  const text = node.text;

  const previousSibling = Editor.previous(editor, { at: path });

  if (
    previousSibling &&
    isAutoLinkNode(previousSibling[0]) &&
    PERIOD_OR_QUESTION_MARK_FOLLOWED_BY_ALPHANUMERIC.test(text)
  ) {
    console.log(
      "handleNeighbours",
      "previousSibling",
      "periodOrQuestionMark",
      previousSibling[0]
    );
    Transforms.unwrapNodes(editor, { at: previousSibling[1] });
    Transforms.mergeNodes(editor, { at: path });
    return;
  }

  if (
    previousSibling &&
    isAutoLinkNode(previousSibling[0]) &&
    !startsWithSeparator(text)
  ) {
    console.log(
      "handleNeighbours",
      "previousSibling",
      "!startsWithSeparator",
      previousSibling[0]
    );
    Transforms.unwrapNodes(editor, { at: previousSibling[1] });
    return;
  }

  const nextSibling = Editor.next(editor, { at: path });
  if (
    nextSibling &&
    isAutoLinkNode(nextSibling[0]) &&
    !endsWithSeparator(text)
  ) {
    console.log(
      "handleNeighbours",
      "nextSibling",
      "!startsWithSeparator",
      nextSibling[0]
    );
    Transforms.unwrapNodes(editor, { at: nextSibling[1] });
    return;
  }
};

/**
 * This implementation is inspired by Lexical's AutoLink plugin.
 * Additional modifications and features were added to adapt it to our specific needs.
 *
 * Original Lexical AutoLink plugin can be found at [Lexical's Github Repository](https://github.com/facebook/lexical/blob/main/packages/lexical-react/src/LexicalAutoLinkPlugin.ts)
 */
function withAutoLinks(editor: Editor): Editor {
  const { isInline, normalizeNode, deleteBackward, insertText } = editor;

  editor.isInline = (element) => {
    return element.type === "auto-link" ? true : isInline(element);
  };

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    console.log("normalizeNode", node, editor.children);

    if (Text.isText(node)) {
      const parentNode = Node.parent(editor, path);

      if (isAutoLinkNode(parentNode)) {
        const parentPath = Path.parent(path);
        handleLinkEdit(editor, [parentNode, parentPath]);
      } else {
        handleLinkCreate(editor, [node, path]);
        handleNeighbours(editor, [node, path]);
      }
    }

    normalizeNode(entry);
  };

  // editor.insertText = (text) => {
  //   const { selection } = editor;
  //   if (selection && Point.isPoint(selection.anchor)) {
  //     const entry = Editor.nodes(editor, {
  //       at: selection,
  //       match: isAutoLinkNode,
  //       mode: "lowest",
  //     });

  //     if (entry) {
  //       const pointAfter = Editor.after(editor, selection);
  //       const textAfter =
  //         pointAfter &&
  //         Editor.string(editor, Editor.range(editor, selection, pointAfter));

  //       if (
  //         (textAfter === "" || textAfter === undefined) &&
  //         isSeparator(text)
  //       ) {
  //         console.log("insertText", "separator");
  //         // Transforms.move(editor, { distance: 1, unit: "offset" });
  //         Transforms.unwrapNodes(editor, {
  //           at: selection,
  //           match: isAutoLinkNode,
  //         });
  //         console.log("insertText", editor.children);
  //       }
  //     }
  //   }
  //   insertText(text);
  //   console.log("insertText", editor.children);
  // };

  editor.deleteBackward = (unit) => {
    deleteBackward(unit);
    const { selection } = editor;
    if (!selection) return;

    if (!Range.isCollapsed(selection)) return;

    const [match] = Editor.nodes(editor, {
      at: selection,
      match: isAutoLinkNode,
      mode: "lowest",
    });

    if (!match) return;

    console.log("deleteBackward", match[0]);

    Transforms.unwrapNodes(editor, {
      match: isAutoLinkNode,
    });
  };

  return editor;
}
