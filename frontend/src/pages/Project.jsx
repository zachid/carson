import { useEffect, useState } from 'react';
import useProjectStore from '../store/projectStore.js';
import Stage01Input from './stages/Stage01Input.jsx';
import Stage02Audit from './stages/Stage02Audit.jsx';
import Stage03Analysis from './stages/Stage03Analysis.jsx';
import Stage04Content from './stages/Stage04Content.jsx';
import Stage045Gate from './stages/Stage045Gate.jsx';
import Stage05Design from './stages/Stage05Design.jsx';
import Stage06Export from './stages/Stage06Export.jsx';

const STAGES = [
  { num: 1,   id: 'stage1',     label: 'Input',        eyebrow: '01' },
  { num: 2,   id: 'stage2',     label: 'Brand Audit',  eyebrow: '02' },
  { num: 3,   id: 'stage3',     label: 'Analysis',     eyebrow: '03' },
  { num: 4,   id: 'stage4',     label: 'Blueprint',    eyebrow: '04' },
  { num: 4.5, id: 'direction',  label: 'Direction',    eyebrow: '04.5' },
  { num: 5,   id: 'stage5',     label: 'Design',       eyebrow: '05' },
  { num: 6,   id: 'stage6',     label: 'Export',       eyebrow: '06' },
];

function getStageData(project, stageNum) {
  return project?.stages?.find(s => s.stage_num === stageNum);
}

function isStageUnlocked(stageNum, project) {
  const current = project?.stage || 1;
  if (stageNum === 4.5) return current >= 5;
  if (stageNum === 5) return !!project?.direction;
  if (stageNum === 6) return getStageData(project, 5)?.status === 'done';
  return stageNum <= current;
}

export default function Project({ projectId, onBack }) {
  const { currentProject, loadProject, refreshCurrentProject } = useProjectStore();
  const [activeStage, setActiveStage] = useState(1);
  const [pendingRegen, setPendingRegen] = useState(false);

  useEffect(() => {
    loadProject(projectId);
  }, [projectId]);

  useEffect(() => {
    if (currentProject?.id === projectId) {
      const stage = currentProject.stage || 1;
      if (stage >= 5 && currentProject.direction) setActiveStage(5);
      else if (stage >= 4.5) setActiveStage(4.5);
      else setActiveStage(Math.min(stage, 4));
    }
  }, [currentProject?.id]);

  const project = currentProject?.id === projectId ? currentProject : null;

  const handleStageComplete = () => refreshCurrentProject();

  if (!project) {
    return (
      <div style={{ padding: 48 }}>
        <div className="secondary-text">Loading project…</div>
      </div>
    );
  }

  const renderActiveStage = () => {
    const s4data = getStageData(project, 4);
    switch (activeStage) {
      case 1: return <Stage01Input project={project} stageData={getStageData(project, 1)} onComplete={handleStageComplete} onContinue={() => setActiveStage(2)} />;
      case 2: return <Stage02Audit project={project} stageData={getStageData(project, 2)} onComplete={handleStageComplete} onContinue={() => setActiveStage(3)} />;
      case 3: return <Stage03Analysis project={project} stageData={getStageData(project, 3)} onComplete={handleStageComplete} onContinue={() => setActiveStage(4)} />;
      case 4: return <Stage04Content project={project} stageData={s4data} onComplete={handleStageComplete} onContinue={() => setActiveStage(4.5)} />;
      case 4.5: return <Stage045Gate project={project} onComplete={() => { handleStageComplete(); setPendingRegen(true); setActiveStage(5); }} />;
      case 5: return <Stage05Design startFresh={pendingRegen} onMounted={() => setPendingRegen(false)} project={project} stageData={getStageData(project, 5)} onComplete={handleStageComplete} onContinue={() => setActiveStage(6)} onBack={() => setActiveStage(4.5)} />;
      case 6: return <Stage06Export project={project} />;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
      {/* Sidebar */}
      <div style={{ width: 220, borderRight: '1px solid var(--border)', flexShrink: 0, overflowY: 'auto' }}>
        {/* Project info */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.02em', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </div>
          <div className="secondary-text" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.url}
          </div>
        </div>

        {/* Stage list */}
        <nav style={{ padding: '8px 0' }}>
          {STAGES.map(s => {
            const unlocked = isStageUnlocked(s.num, project);
            const stageData = s.num !== 4.5 ? getStageData(project, s.num) : null;
            const status = s.num === 4.5
              ? (project.direction ? 'done' : 'pending')
              : (stageData?.status || 'pending');
            const isActive = activeStage === s.num;

            return (
              <button
                key={s.id}
                onClick={() => unlocked && setActiveStage(s.num)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 16px',
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  opacity: unlocked ? 1 : 0.35,
                  textAlign: 'left',
                  transition: 'background 0.12s',
                }}
              >
                <span className={`status-dot ${status}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 1 }}>
                    {s.eyebrow}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? 'var(--text)' : 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderActiveStage()}
      </div>
    </div>
  );
}
