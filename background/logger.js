const buf = [];

/* prepend timestamp */
const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

export function log (...args)    { add('INFO ', ...args); }
export function warn(...args)    { add('WARN ', ...args); }
export function error(...args)   { add('ERROR', ...args); }

export function downloadLog() {
  const txt  = buf.join('\n') + '\n';
  const data = 'data:text/plain;charset=utf-8,' + encodeURIComponent(txt);

  chrome.downloads.download({
    url      : data,
    filename : `ConnectIN-log-${Date.now()}.txt`,
    saveAs   : true
  });
}

/* internal helper */
function add(prefix, ...args) {
  const line = `${ts()}  ${prefix}  ${args.map(a =>
                 typeof a === 'object' ? JSON.stringify(a) : String(a)
               ).join(' ')}`;
  buf.push(line);
  console[prefix.trim().toLowerCase()](...args);
  if (buf.length > 5000) buf.shift();
}