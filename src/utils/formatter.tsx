import { format as _formatSQL } from 'sql-formatter';
const _formatJS = require('js-beautify').js;

export const formatSQL = _formatSQL;

export const formatJS = (val: string) =>
  _formatJS(val, {
    indent_size: 2,
    space_in_empty_paren: true,
    break_chained_methods: 2,
  });

export const formatDuration = (durationMs: number) => {
  const durationS = Math.floor(durationMs / 1000);
  if (durationS > 1) return durationMs;

  return '<= 1';
};
