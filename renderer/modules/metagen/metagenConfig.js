export const METAGEN_CONFIG = {
  moduleId: 'metagen',
  moduleName: 'MetaGen',

  documentKind: 'metagen.component',
  defaultType: 'template',

  commands: {
    createDocument: 'METAGEN_CREATE_DOCUMENT',
    generateCode: 'METAGEN_GENERATE_CODE',
    validateDocument: 'METAGEN_VALIDATE_DOCUMENT'
  },

  generation: {
    defaultEngine: 'python',
    defaultEntrypoint: 'gen_v2.py',
    defaultMode: 'external',
    defaultOutputLanguage: 'st'
  },

  editor: {
    saveShortcutKey: 's',
    layout: {
      sizes: [25, 50, 25],
      minSize: [260, 280, 260],
      gutterSize: 4,
      cursor: 'col-resize'
    }
  },

  tableRuntime: {
    workbooks: {
      displayNames: {
        params: 'Параметры',
        data: 'Данные'
      }
    },

    tables: {
      params: {
        // Initial runtime grid size for new/bootstrapped sheet instance.
        // Persisted YAML snapshot uses actual table content size.
        rows: 100,
        defaultColumns: 10,
        autoStyle: {
          debounceDelayMs: 120,
          maxRecursiveRangeDepth: 6,
          fullRefreshCommandIdIncludes: [
            'insert-row',
            'remove-row',
            'delete-row',
            'move-row',
            'move-rows',
            'insert-column',
            'remove-column',
            'delete-column',
            'move-column',
            'move-columns',
            'insert-range-move-down',
            'delete-range-move-up',
            'undo',
            'redo'
          ],
          rowCategory: {
            empty: 'empty',
            key: 'key',
            value: 'value'
          },
          border: {
            type: 'ALL',
            style: 'THIN',
            color: '#d9d9d9'
          },
          rowStyles: {
            key: {
              backgroundColor: '#f3f4f6',
              fontWeight: 'bold',
              horizontalAlignment: 'center',
              verticalAlignment: 'middle'
            },
            normal: {
              backgroundColor: '#ffffff',
              fontWeight: 'normal',
              horizontalAlignment: 'left',
              verticalAlignment: 'middle'
            }
          }
        }
      },

      data: {
        // Initial runtime grid size for new/bootstrapped sheet instance.
        // Persisted YAML snapshot uses actual table content size.
        rows: 100,
        headers: [
          'Тип',
          'Блок данных',
          'Имя переменной',
          'Значение',
          'Комментарий',
          'HMI',
          'Flt',
          'Wrn',
          'Alm',
          'Trend',
          'Conf'
        ],
        headerConfig: {
          mode: 'custom',
          headerStyle: {}
        },
        checkboxColumns: ['HMI', 'Trend', 'Conf'],
        permissions: {
          allowSetCellValue: true,
          allowInsertColumn: false,
          allowDeleteColumn: false
        },
        headerApply: {
          retryCount: 10,
          retryDelayMs: 100
        }
      }
    },

    hiddenDataTableMenuCommands: [
      'sheet.command.cancel-frozen',
      'sheet.command.set-selection-frozen',
      'sheet.command.set-row-frozen',
      'sheet.command.set-col-frozen',
      'sheet.command.add-range-protection-from-context-menu',
      'sheet.command.set-range-protection-from-context-menu',
      'sheet.command.delete-range-protection-from-context-menu',
      'sheet.command.view-sheet-permission-from-context-menu'
    ],

    contextMenuLabels: {
      copy: '📋 Копировать',
      cut: '✂️ Вырезать',
      paste: '📌 Вставить',
      insertRowBefore: '⤴️ Вставить строку выше',
      insertColumnBefore: '⤵️ Вставить колонку слева'
    },

    logMessages: {
      tableCreated: 'Таблица создана',
      tableCreateFailed: 'Ошибка создания таблицы',
      dataColumnsProtectionApplied: 'Вставка и удаление столбцов запрещены',
      checkboxColumnsConfigured: 'Колонки checkbox настроены',
      checkboxColumnsFailed: 'Не удалось настроить checkbox-колонки',
      customHeadersApplied: 'Кастомные заголовки колонок применены',
      defaultHeadersApplied: 'Используются стандартные заголовки колонок A, B, C...',
      headerMethodUnavailable: 'Метод customizeColumnHeader недоступен',
      headerApplyRetryPrefix: 'Render unit ещё не готов, повтор применения заголовков',
      headerApplyFailed: 'Не удалось применить кастомные заголовки колонок',
      paramsAutoStyleInit: 'Автостили параметров инициализированы',
      paramsAutoStyleRefreshScheduled: 'Запланировано обновление автостилей параметров',
      paramsAutoStyleApplied: 'Автостили параметров обновлены',
      paramsAutoStyleFailed: 'Ошибка автостилей параметров'
    }
  },

  defaults: {
    newDocumentName: 'Новый компонент'
  },

  ui: {
    createPromptTitle: 'Имя документа MetaGen'
  }
};
