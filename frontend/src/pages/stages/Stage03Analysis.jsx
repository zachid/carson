import { useState, useEffect } from 'react';
import { StageShell } from './StageShell.jsx';
import { streamStage } from '../../api/client.js';

export default function Stage03Analysis({ project, stageData, onComplete, onContinue }) {
  const [status, setStatus] = useState(stageData?.status || 'pending');
  const [output, setOutput] = useState(stageData?.output || '');

  useEffect(() => {
    setStatus(stageData?.status || 'pending');
    setOutput(stageData?.output || '');
  }, [stageData]);

  const handleRun = () => {
    setStatus('running');
    setOutput('');
    streamStage(project.id, 3, {
      onChunk: (text) => setOutput(prev => prev + text),
      onDone: (full) => { setOutput(full); setStatus('done'); onComplete?.(); },
      onError: (err) => { setStatus('error'); setOutput(`Error: ${err.message}`); },
    });
  };

  return (
    <StageShell
      eyebrow="Stage 03"
      title="Homepage Formula Analysis"
      desc="Score the current homepage against the 8-section Perfect Homepage Formula."
      instructions="Each of the 8 core homepage sections is scored for existence and execution quality. A gap analysis identifies exactly what's missing or underperforming."
      status={status}
      output={output}
      onRun={handleRun}
      runLabel="Analyze Homepage →"
      onContinue={onContinue}
      nextLabel="Content Blueprint"
    />
  );
}
