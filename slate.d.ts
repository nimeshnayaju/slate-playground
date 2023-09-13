import type { BaseEditor, Element, Text } from "slate";
import type { HistoryEditor } from "slate-history";
import type { ReactEditor, RenderElementProps } from "slate-react";

/* -------------------------------------------------------------------------------------------------
 * Slate
 * -----------------------------------------------------------------------------------------------*/
export type CustomElement = ParagraphElement | AutoLinkElement;
export type CustomText = FormattedText;

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

export type FormattedText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export type InlineNode = FormattedText | AutoLinkElement;

/* -------------------------------------------------------------------------------------------------
 * Paragraph
 * -----------------------------------------------------------------------------------------------*/
export type ParagraphElement = {
  type: "paragraph";
  children: InlineNode[];
};

/* -------------------------------------------------------------------------------------------------
 * Auto Link
 * -----------------------------------------------------------------------------------------------*/
export type AutoLinkElement = {
  type: "auto-link";
  url: string;
  children: FormattedText[];
};
