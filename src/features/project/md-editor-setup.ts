import hljs from 'highlight.js'
import { config } from 'md-editor-v3'

config({
  editorExtensions: {
    highlight: {
      instance: hljs,
    },
  },
  editorConfig: {
    languageUserDefined: {
      'es-ES': {
        toolbarTips: {
          bold: 'negrita',
          underline: 'subrayado',
          italic: 'cursiva',
          strikeThrough: 'tachado',
          title: 'título',
          sub: 'subíndice',
          sup: 'superíndice',
          quote: 'cita',
          unorderedList: 'lista no ordenada',
          orderedList: 'lista ordenada',
          task: 'lista de tareas',
          codeRow: 'código en línea',
          code: 'bloque de código',
          link: 'enlace',
          image: 'imagen',
          table: 'tabla',
          mermaid: 'mermaid',
          katex: 'fórmula',
          revoke: 'deshacer',
          next: 'rehacer',
          save: 'guardar',
          prettier: 'prettier',
          pageFullscreen: 'pantalla completa en página',
          fullscreen: 'pantalla completa',
          preview: 'vista previa',
          previewOnly: 'solo vista previa',
          htmlPreview: 'vista previa HTML',
          catalog: 'catálogo',
          github: 'código fuente',
        },
        titleItem: {
          h1: 'Título nivel 1',
          h2: 'Título nivel 2',
          h3: 'Título nivel 3',
          h4: 'Título nivel 4',
          h5: 'Título nivel 5',
          h6: 'Título nivel 6',
        },
        imgTitleItem: {
          link: 'Añadir enlace de imagen',
          upload: 'Subir imágenes',
          clip2upload: 'Recortar y subir',
        },
        linkModalTips: {
          linkTitle: 'Añadir enlace',
          imageTitle: 'Añadir imagen',
          descLabel: 'Desc:',
          descLabelPlaceHolder: 'Introduce una descripción...',
          urlLabel: 'Enlace:',
          urlLabelPlaceHolder: 'Introduce un enlace...',
          buttonOK: 'OK',
        },
        clipModalTips: {
          title: 'Recortar imagen',
          buttonUpload: 'Subir',
        },
        copyCode: {
          text: 'Copiar',
          successTips: '¡Copiado!',
          failTips: 'Error al copiar',
        },
        mermaid: {
          flow: 'flujo',
          sequence: 'secuencia',
          gantt: 'gantt',
          class: 'clase',
          state: 'estado',
          pie: 'tarta',
          relationship: 'relación',
          journey: 'viaje',
        },
        katex: {
          inline: 'en línea',
          block: 'bloque',
        },
        footer: {
          markdownTotal: 'Caracteres',
          scrollAuto: 'Scroll automático',
        },
      },
    },
  },
})
