import { AtomEditorTab } from '@/features/authoring/AtomEditorTab';
import { LookupEditorTab } from '@/features/authoring/LookupEditorTab';
import { ManifestEditorTab } from '@/features/composer/ManifestEditorTab';
import type { PackageItem } from '@/features/explorer/PackageExplorer';
import { EmptyTab } from '@/features/home/EmptyTab';
import { SettingsTab } from '@/features/settings/SettingsTab';
import type { IdeTab } from '@/stores/ide-store';
import { memo } from 'react';

export interface TabPaneProps {
  tab: IdeTab;
  isActive: boolean;
  packages: PackageItem[];
  manifestsCount: number;
  onSaved: () => void;
  onDeleted: (tabId: string) => void;
  onOpenCommandPalette: () => void;
  onCreateManifest: () => void;
  onCreateAtom: () => void;
}

export const TabPane = memo(
  function TabPane({
    tab,
    isActive,
    packages,
    manifestsCount,
    onSaved,
    onDeleted,
    onOpenCommandPalette,
    onCreateManifest,
    onCreateAtom,
  }: TabPaneProps) {
    return (
      <div className={`h-full w-full ${isActive ? 'block' : 'hidden'}`}>
        {tab.type === 'empty' && (
          <EmptyTab
            manifestsCount={manifestsCount}
            packagesCount={packages.length}
            onOpenCommandPalette={onOpenCommandPalette}
            onCreateManifest={onCreateManifest}
            onCreateAtom={onCreateAtom}
          />
        )}
        {tab.type === 'atom' && tab.atomId && (
          <AtomEditorTab
            key={`${tab.id}_${tab.atomId}`}
            tabId={tab.id}
            atomId={tab.atomId}
            packages={packages}
            onSaved={onSaved}
            onDeleted={() => onDeleted(tab.id)}
          />
        )}
        {tab.type === 'manifest' && (
          <ManifestEditorTab
            key={`${tab.id}_${tab.manifestName || 'draft'}`}
            tabId={tab.id}
            manifestName={tab.manifestName || ''}
            workspacePath={tab.workspacePath}
            packages={packages}
            onSaved={onSaved}
          />
        )}
        {tab.type === 'lookup' && tab.lookupKey && (
          <LookupEditorTab
            key={`${tab.id}_${tab.lookupKey}`}
            tabId={tab.id}
            lookupKey={tab.lookupKey}
            packages={packages}
            onSaved={onSaved}
            onDeleted={() => onDeleted(tab.id)}
          />
        )}
        {tab.type === 'settings' && <SettingsTab />}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.isActive === next.isActive &&
      prev.tab.id === next.tab.id &&
      prev.tab.isDirty === next.tab.isDirty &&
      prev.tab.title === next.tab.title &&
      prev.packages === next.packages &&
      prev.manifestsCount === next.manifestsCount &&
      prev.onSaved === next.onSaved
    );
  },
);
