import { useEffect, useState } from 'react';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';
import { getCapabilities, type Capabilities } from '../services/backend';
export function BackendStatus() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ data?: Capabilities; error?: string }>({});
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    getCapabilities(controller.signal).then((data) => {
      if (active && !controller.signal.aborted) setState({ data });
    }).catch((error: unknown) => {
      if (active) setState({ error: error instanceof Error ? error.message : 'Backend unavailable.' });
    });
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  return <Panel><h2>Backend connection</h2><div role="status">{state.error ? <p>{state.error}</p> : state.data ? <><p>Backend connected · Media inspection {state.data.media_probe ? 'available' : 'unavailable'}</p><p>{state.data.reason}</p></> : <p>Checking backend…</p>}</div><Button variant="secondary" onClick={() => { setState({}); setAttempt((value) => value + 1); }}>Check connection</Button></Panel>;
}
