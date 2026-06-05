import { useState, useEffect } from 'react';
import { StageShell } from './StageShell.jsx';
import { streamStage } from '../../api/client.js';

export default function Stage04Content({ project, stageData, onComplete, onContinue }) {
  const [status, setStatus] = useState(stageData?.status || 'pending');
  const [output, setOutput] = useState(stageData?.output || '');

  useEffect(() => {
    setStatus(stageData?.status || 'pending');
    setOutput(stageData?.output || '');
  }, [stageData]);

  const handleRun = () => {
    setStatus('running');
    setOutput('');
    streamStage(project.id, 4, {
      onChunk: (text) => setOutput(prev => prev + text),
      onDone: (full) => { setOutput(full); setStatus('done'); onComplete?.(); },
      onError: (err) => { setStatus('error'); setOutput(`Error: ${err.message}`); },
    });
  };

  return (
    <StageShell
      eyebrow="Stage 04"
      title="Content + Blueprint"
      desc="Full page architecture and copy for every section of the redesigned homepage."
      instructions="Produces two things: a layout blueprint (section-by-section architecture with grid patterns, content blocks, visual suggestions) and full copy for every section (headlines, sub-headlines, body, CTAs, microcopy). Tone: outcome-first, evidence-based, no hype."
      status={status}
      output={output}
      onRun={handleRun}
      runLabel="Generate Blueprint + Copy →"
      onContinue={onContinue}
      nextLabel="Design Direction"
    />
  );
}
