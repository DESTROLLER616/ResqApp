import { type Extension,RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'

import { variableSpans } from '@/features/environments/resolve'
import type { VariableStatus } from '@/types/environment'

const markFor: Record<VariableStatus, (title: string) => Decoration> = {
  active: (title) =>
    Decoration.mark({ class: 'cm-env-var cm-env-var--active', attributes: { title } }),
  other: (title) =>
    Decoration.mark({ class: 'cm-env-var cm-env-var--other', attributes: { title } }),
  missing: (title) =>
    Decoration.mark({ class: 'cm-env-var cm-env-var--missing', attributes: { title } }),
}

export function environmentVariableHighlight(
  activeKeys: ReadonlySet<string>,
  projectKeys: ReadonlySet<string>,
  titles: Record<VariableStatus, string>,
): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = build(view, activeKeys, projectKeys, titles)
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = build(update.view, activeKeys, projectKeys, titles)
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  )
}

function build(
  view: EditorView,
  activeKeys: ReadonlySet<string>,
  projectKeys: ReadonlySet<string>,
  titles: Record<VariableStatus, string>,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const text = view.state.doc.toString()
  for (const span of variableSpans(text, activeKeys, projectKeys)) {
    builder.add(span.start, span.end, markFor[span.status](titles[span.status]))
  }
  return builder.finish()
}
