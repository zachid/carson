import { useState, useEffect } from 'react';
import { StageShell } from './StageShell.jsx';
import { streamStage } from '../../api/client.js';

export default function Stage01Input({ project, stageData, onComplete, onContinue }) {
  const [status, setStatus] = useState(stageData?.status || 'pending');
  const [output, setOutput] = useState(stageData?.output || '');

  useEffect(() => {
    setStatus(stageData?.status || 'pending');
    setOutput(stageData?.output || '');
  }, [stageData]);

  const handleRun = () => {
    setStatus('running');
    setOutput('');
    streamStage(project.id, 1, {
      onChunk: (text) => setOutput(prev => prev + text),
      onDone: (full) => { setOutput(full); setStatus('done'); onComplete?.(); },
      onError: (err) => { setStatus('error'); setOutput(`Error: ${err.message}`); },
    });
  };

  return (
    <StageShell
      eyebrow="Stage 01"
      title="Input"
      desc="Scrape and extract structured content from the target website."
      instructions="Carson fetches the URL, strips noise from the HTML, and asks the model to extract and structure all visible content — headlines, copy, CTAs, nav, footer, and social proof. This becomes the raw material for every downstream stage."
      status={status}
      output={output}
      onRun={handleRun}
      runLabel="Scrape & Extract →"
      onContinue={onContinue}
      nextLabel="Brand Audit"
    />
  );
}
