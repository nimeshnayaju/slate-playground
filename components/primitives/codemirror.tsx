"use client";

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  ComponentPropsWithoutRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

type CodeMirrorElement = {
  getEditorView: () => EditorView | undefined;
};

type CodeMirrorProps = Omit<ComponentPropsWithoutRef<"div">, "defaultValue"> & {
  defaultValue?: string;
};

/**
 * An unstyled and thin wrapper around CodeMirror.
 * See: https://codemirror.net/examples/config/#compartments
 */
const CodeMirror = forwardRef<CodeMirrorElement, CodeMirrorProps>(
  function CodeMirror(props, forwardedRef) {
    const { defaultValue, ...divProps } = props;

    const divRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView>();

    useImperativeHandle(
      forwardedRef,
      () => {
        return {
          getEditorView() {
            return viewRef.current;
          },
        };
      },
      []
    );

    useEffect(() => {
      if (!divRef.current) return;

      const view = new EditorView({
        state: EditorState.create({
          doc: defaultValue,
        }),
        parent: divRef.current,
      });

      viewRef.current = view;

      view.dispatch({
        effects: EditorView.scrollIntoView(view.state.selection.main),
      });

      return () => {
        view.destroy();
        viewRef.current = undefined;
      };
    }, []);

    return <div ref={divRef} {...divProps} />;
  }
);

export default CodeMirror;
