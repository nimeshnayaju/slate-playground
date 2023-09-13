"use client";

import {
  ComponentPropsWithoutRef,
  ElementRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import CodeMirror from "./primitives/codemirror";
import { Compartment, Extension, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

type CodeEditorElement = {
  getEditorView: () => EditorView | undefined;
  setEditorValue: (value: string) => void;
};

interface Props extends ComponentPropsWithoutRef<typeof CodeMirror> {
  onValueChange?: (value: string) => void;
  extensions?: Extension | Extension[];
  disabled?: boolean;
}

const CodeEditor = forwardRef<CodeEditorElement, Props>(function CodeEditor(
  { onValueChange, extensions = [], disabled = false, ...props },
  forwardedRef
) {
  const codeMirrorRef = useRef<ElementRef<typeof CodeMirror>>(null);

  useImperativeHandle(
    forwardedRef,
    () => {
      return {
        getEditorView() {
          return codeMirrorRef.current?.getEditorView();
        },
        setEditorValue(value: string) {
          const view = codeMirrorRef.current?.getEditorView();
          if (!view) return;
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: value,
            },
          });
        },
      };
    },
    []
  );

  useEffect(() => {
    const view = codeMirrorRef.current?.getEditorView();
    if (!view || !onValueChange) return;

    // We're using a Compartment here to encapsulate the state related to the value change listener
    // This allows us to dynamically reconfigure this aspect of the state, which is more efficient than creating a new EditorState
    const onValueChangeCompartment = new Compartment();

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;

      // Listen to document changes and call `onValueChange` when the value changes
      onValueChange(update.state.doc.toString());
    });

    view.dispatch({
      effects: StateEffect.appendConfig.of(
        onValueChangeCompartment.of(updateListener)
      ),
    });

    // When the component is unmounted, or the `onValueChange` function changes, we should clean up and reconfigure the compartment
    return () => {
      view.dispatch({
        effects: onValueChangeCompartment.reconfigure([]),
      });
    };
  }, [onValueChange]);

  useEffect(() => {
    const view = codeMirrorRef.current?.getEditorView();
    if (!view) return;

    const extensionsCompartment = new Compartment();

    view.dispatch({
      effects: StateEffect.appendConfig.of(
        extensionsCompartment.of(extensions)
      ),
    });

    return () => {
      view.dispatch({
        effects: extensionsCompartment.reconfigure([]),
      });
    };
  }, [extensions]);

  useEffect(() => {
    const view = codeMirrorRef.current?.getEditorView();
    if (!view) return;

    const isReadOnlyComparment = new Compartment();

    view.dispatch({
      effects: StateEffect.appendConfig.of(
        isReadOnlyComparment.of(EditorView.editable.of(disabled ? false : true))
      ),
    });

    return () => {
      view.dispatch({
        effects: isReadOnlyComparment.reconfigure([]),
      });
    };
  }, [disabled]);

  return <CodeMirror ref={codeMirrorRef} {...props} />;
});

export default CodeEditor;
