import { syntaxTree } from '@codemirror/language'
import { jsonParseLinter } from '@codemirror/lang-json'
import type { Diagnostic } from '@codemirror/lint'
import type { EditorView } from '@codemirror/view'

const parseJson = jsonParseLinter()

export function jsonBodyLinter(view: EditorView): Diagnostic[] {
  if (!view.state.doc.toString().trim()) return []
  return parseJson(view)
}

export function syntaxErrorLinter(getMessage: () => string) {
  return (view: EditorView): Diagnostic[] => {
    const diagnostics: Diagnostic[] = []
    const docLength = view.state.doc.length
    const message = getMessage()

    syntaxTree(view.state).iterate({
      enter(node) {
        if (!node.type.isError) return
        diagnostics.push({
          from: node.from,
          to: node.to > node.from ? node.to : Math.min(node.from + 1, docLength),
          severity: 'error',
          message,
        })
      },
    })

    return diagnostics
  }
}
