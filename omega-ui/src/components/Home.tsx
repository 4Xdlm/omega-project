import { open } from '@tauri-apps/plugin-dialog';

interface HomeProps {
  workspace?: string | null;
  onWorkspaceSelect?: (path: string) => void;
  onStartRun: () => void;
}

function Home({ workspace, onWorkspaceSelect, onStartRun }: HomeProps) {
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select OMEGA Workspace Folder',
      });

      if (selected && typeof selected === 'string') {
        onWorkspaceSelect?.(selected);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  return (
    <div className="home-screen">
      <h2>ðŸš€ First Cycle Runner</h2>

      <div className="workspace-section">
        <button className="btn btn-primary" onClick={handleSelectFolder}>
          ðŸ“ Select Workspace Folder
        </button>

        <div className={`workspace-path ${!workspace ? 'empty' : ''}`}>
          {workspace || '(No workspace selected)'}
        </div>
      </div>

      <div className="action-section">
        <button
          className="btn btn-primary"
          onClick={onStartRun}
          disabled={!workspace}
        >
          â–¶ï¸ Run First Cycle
        </button>

        {!workspace && (
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Select a workspace folder to enable the run button.
          </p>
        )}
      </div>

      <div style={{ marginTop: '40px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--accent)' }}>
          What is "First Cycle"?
        </h3>
        <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
          <li>Loads the selected workspace</li>
          <li>Validates project structure</li>
          <li>Checks invariants</li>
          <li>Generates a report in <code>omega-ui-output/</code></li>
        </ul>
      </div>
    </div>
  );
}

export default Home;
