import type { Resource } from '@argus/shared';
import { DrawerView } from '../../drawer/DrawerShell';
import { RESOURCE_NOUN } from '../../lib/labels';
import { DelegateSection } from './DelegateSection';

/** Instructions offered for records that have no drawer of their own. */
const PRESETS: Partial<Record<Resource, string[]>> = {
  reminders: ['Do it for me', 'Find what I need for it'],
  projects: ['Write a status update', 'List the risks to the deadline'],
};

/** Delegation for records shown without a drawer (reminders, projects). */
export function DelegateDrawer({
  resource,
  recordId,
  title,
}: {
  resource: Resource;
  recordId: string;
  title: string;
}) {
  return (
    <DrawerView kickerIcon="bot" kicker={`Delegate this ${RESOURCE_NOUN[resource]}`} title={title}>
      <DelegateSection
        resource={resource}
        recordId={recordId}
        presets={PRESETS[resource]}
        title="What should the agent do?"
      />
    </DrawerView>
  );
}
