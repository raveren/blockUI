// Opens test/index.html in headless Chrome over the DevTools protocol, waits for window.__tests and prints
// the results. Usage: node test/run.mjs [screenshot.png]
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const pageUrl = new URL('./index.html', import.meta.url).href;
const chrome = spawn('google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0',
    '--allow-file-access-from-files', '--user-data-dir=' + mkdtempSync(tmpdir() + '/blockui-chrome-'), 'about:blank',
], {stdio: ['ignore', 'ignore', 'pipe']});

const browserWsUrl = await new Promise(resolve => chrome.stderr.on('data', chunk => {
    const match = String(chunk).match(/DevTools listening on (ws:\S+)/);
    if (match) {
        resolve(match[1]);
    }
}));
const targets = await (await fetch('http://127.0.0.1:' + new URL(browserWsUrl).port + '/json')).json();
const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => ws.onopen = resolve);

let nextId = 0;
const pending = new Map();
let pageLoaded;
const loaded = new Promise(resolve => pageLoaded = resolve);
ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
        pending.get(message.id)(message.result);
        pending.delete(message.id);
    } else if (message.method === 'Page.loadEventFired') {
        pageLoaded();
    } else if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params.exceptionDetails;
        console.log('PAGE EXCEPTION: ' + (details.exception?.description ?? details.text));
    } else if (message.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE.' + message.params.type + ': '
            + message.params.args.map(argument => argument.value ?? argument.description).join(' '));
    }
};
const send = (method, params = {}) => new Promise(resolve => {
    pending.set(++nextId, resolve);
    ws.send(JSON.stringify({id: nextId, method, params}));
});

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', {url: pageUrl});
await loaded;
const {result} = await send('Runtime.evaluate', {expression: 'window.__tests', awaitPromise: true, returnByValue: true});
const results = result.value ?? ['FAIL window.__tests did not resolve to a list'];
console.log(results.join('\n'));
console.log(results.filter(line => line.startsWith('FAIL')).length + ' failed, ' + results.length + ' total');

// Optional: node test/run.mjs screenshot.png - saves a screenshot of a blocked element and the blocked page.
if (process.argv[2]) {
    await send('Runtime.evaluate', {expression: "$('#plain').block('Loading…'); $('#padded').block(); $.blockUi('Whole page')"});
    await new Promise(resolve => setTimeout(resolve, 500));
    const screenshot = await send('Page.captureScreenshot', {format: 'png'});
    (await import('node:fs')).writeFileSync(process.argv[2], Buffer.from(screenshot.data, 'base64'));
}

ws.close();
chrome.kill();
process.exit(results.some(line => line.startsWith('FAIL')) ? 1 : 0);
