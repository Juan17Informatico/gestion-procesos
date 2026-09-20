import { useState } from 'react';
import { DataManagementPage } from './features/data-management/DataManagementPage';
import { NotesPage } from './features/notes/NotesPage';
import { ProcessesPage } from './features/processes/ProcessesPage';
import { useAppData } from './hooks/useAppData';
import { useTheme } from './hooks/useTheme';
import { AppLayout } from './layouts/AppLayout';

type Section = 'notes' | 'processes' | 'data';

function App() {
  const [activeSection, setActiveSection] = useState<Section>('processes');
  const { data, setData, replaceData, resetData, storageError } = useAppData();
  const { themePreference, setThemePreference } = useTheme();

  function mergeData(incoming: typeof data): void {
    const existingProcessKeys = new Set(
      data.processes.map((process) => process.identification || process.id),
    );
    const existingNoteIds = new Set(data.notes.map((note) => note.id));
    const newProcesses = incoming.processes.filter(
      (process) => !existingProcessKeys.has(process.identification || process.id),
    );
    const newNotes = incoming.notes.filter((note) => !existingNoteIds.has(note.id));
    setData({
      ...data,
      notes: [...newNotes, ...data.notes],
      processes: [...newProcesses, ...data.processes],
    });
  }

  return (
    <AppLayout
      activeSection={activeSection}
      onSectionChange={(section) => setActiveSection(section as Section)}
      onThemePreferenceChange={setThemePreference}
      storageError={storageError}
      themePreference={themePreference}
    >
      <div className={activeSection === 'notes' ? 'block' : 'hidden'}>
        <NotesPage notes={data.notes} onChange={(notes) => setData({ ...data, notes })} />
      </div>
      <div className={activeSection === 'processes' ? 'block' : 'hidden'}>
        <ProcessesPage
          processes={data.processes}
          onChange={(processes) => setData({ ...data, processes })}
        />
      </div>
      <div className={activeSection === 'data' ? 'block' : 'hidden'}>
        <DataManagementPage data={data} onImport={replaceData} onMerge={mergeData} onReset={resetData} />
      </div>
    </AppLayout>
  );
}

export default App;
