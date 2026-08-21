import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { X, Terminal as TerminalIcon, Maximize2, Minimize2 } from 'lucide-react';

interface ContainerTerminalProps {
  containerId: string;
  containerName: string;
  onClose: () => void;
}

export const ContainerTerminal: React.FC<ContainerTerminalProps> = ({
  containerId,
  containerName,
  onClose
}) => {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#090d16',
        foreground: '#f1f5f9',
        cursor: '#38bdf8',
        selectionBackground: 'rgba(56, 189, 248, 0.3)',
        black: '#1e293b',
        red: '#f43f5e',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f8fafc',
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    term.writeln('\x1b[36m⚡ Connecting to container shell (' + containerName + ')...\x1b[0m\r\n');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/docker/terminal/${containerId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Send initial size
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onclose = () => {
      term.writeln('\r\n\x1b[33m[Session Closed]\x1b[0m Connection to container terminated.');
    };

    ws.onerror = () => {
      term.writeln('\r\n\x1b[31m[Error]\x1b[0m Failed to connect to terminal socket.');
    };

    // User keystrokes to container
    const onDataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      onDataDisposable.dispose();
      ws.close();
      term.dispose();
    };
  }, [containerId, containerName]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`flex flex-col glass-panel rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${isFullscreen ? 'w-full h-full' : 'w-full max-w-4xl h-[600px]'}`}>
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 glass-inner border-b border-black/10 dark:border-white/10 select-none">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-500/15 text-blue-400 rounded-lg">
              <TerminalIcon className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm">Terminal: {containerName}</span>
            <span className="text-xs px-2 py-0.5 rounded glass-inner opacity-75 font-mono">ID: {containerId}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 opacity-70 hover:opacity-100 hover:text-rose-400 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Close Terminal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Xterm container */}
        <div className="flex-1 p-3 bg-black/80 overflow-hidden" ref={terminalRef} />
      </div>
    </div>
  );
};
