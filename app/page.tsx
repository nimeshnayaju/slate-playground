"use client";

import { Descendant } from "slate";
import { ElementRef, useRef } from "react";
import RichTextEditor from "@/components/rich-text-editor";
import CodeEditor from "@/components/code-editor";

const initialValue: Descendant[] = [
  {
    type: "paragraph",
    children: [
      {
        text: "Visit ",
      },
      {
        type: "auto-link",
        url: "https://www.google.com",
        children: [
          {
            text: "https://www.google.com",
          },
        ],
      },
      // { text: " and this is a plain" },
      // { text: " text", bold: true },
      // { text: ", just like a <textarea>!" },
    ],
  },
];

type CodeEditorElement = ElementRef<typeof CodeEditor>;

export default function Home() {
  const editorRef = useRef<CodeEditorElement>(null);

  const handleValueChange = (value: Descendant[]) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setEditorValue(JSON.stringify(value, null, 2));
  };

  return (
    <div className="m-8 h-[400px] bg-white">
      <div className="flex flex-col gap-10">
        <RichTextEditor
          defaultValue={initialValue}
          onValueChange={handleValueChange}
        />

        <CodeEditor
          ref={editorRef}
          defaultValue={JSON.stringify(initialValue, null, 2)}
          disabled
        />
      </div>
    </div>
  );
}
