import { useState, useEffect } from 'react';
import { StageShell } from './StageShell.jsx';
import { streamStage } from '../../api/client.js';

export default function Stage02Audit({ project, stageData, onComplete, onContinue }) {
  const [status, setStatus] = useState(stageData?.status || 'pending');
  const [output, setOutput] = useState(stageData?.output || '');

  useEffect(() => {
    setStatus(stageData?.status || 'pending');
    setOutput(stageData?.output || '');
  }, [stageData]);

  const handleRun = () => {
    setStatus('running');
    setOutput('');
    streamStage(project.id, 2, {
      onChunk: (text) => setOutput(prev => prev + text),
      onDone: (full) => { setOutput(full); setStatus('done'); onComplete?.(); },
      onError: (err) => { setStatus('error'); setOutput(`Error: ${err.message}`); },
    });
  };

  return (
    <StageShell
      eyebrow="Stage 02"
      title="Brand Audit"
      desc="Structured analysis of the brand's identity, positioning, and voice."
      instructions="The model analyzes scraped content to produce a full brand audit: company overview, mission, positioning, audience, voice and tone, CTAs, visual style, strengths and weaknesses."
      status={status}
      output={output}
      onRun={handleRun}
      runLabel="Run Brand Audit →"
      onContinue={onContinue}
      nextLabel="Homepage Analysis"
    />
  );
}
